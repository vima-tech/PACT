/**
 * @vima-tech/ui-admin · 可视化模板编辑器
 *
 * 创建日期: 2026-08-11
 *
 * 用 h() 手写而不是 .vue 单文件：scripts/build-lib.mjs 走的是 Vite lib 模式且没挂
 * @vitejs/plugin-vue，SFC 根本不会被编译。全库其余组件也是这个写法。
 *
 * 两条决定了整体结构的设计：
 *
 * 1. **画布用真渲染器，交互层浮在上面。**
 *    画布里那一份是 TemplateRenderer 的真实产物，所见即所得，不存在
 *    「编辑器里长这样、跑起来长那样」的偏差。交互（选中框、手柄、命中区）
 *    是一层 pointer-events:none 的浮层，只有每个节点的命中框是可点的。
 *    副作用正好是设计态想要的：点输入框是选中它，而不是真的去输入。
 *
 * 2. **浮层的坐标由几何算，不靠量 DOM。**
 *    只测一次容器宽度，其余全走 geometry.ts 的纯函数换算。
 *    逐节点 getBoundingClientRect 要处理布局时序、滚动、缩放，
 *    而且每帧都测会掉帧；算出来的坐标则是确定的，也已经被单测钉住。
 */
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
  type VNode
} from 'vue'

import { COMPONENT_CATEGORIES, COMPONENT_PROPS_CONFIG, createNode } from './editor'
import { createTemplateEditor } from './editor-state'
import {
  RESIZE_HANDLES,
  applyResizeDelta,
  clampGeometry,
  colWidth,
  gridToPixel,
  resolveCanvas,
  resolveGridGeometry,
  snapPosition,
  type ResizeHandle,
  type SnapGuide
} from './geometry'
import { TemplateRenderer } from './renderer'
import type { BreakpointKey, ComponentType, Geometry, LayoutMode, TemplateNode, Template } from './types'

/** 开始拖拽的位移阈值：小于它当作点击，否则轻轻一点就把组件挪走了 */
const DRAG_THRESHOLD = 3

/** 右侧面板的两个页签 */
type SidePane = 'layers' | 'props'

/** 可视化编辑并预览 Template DSL。 @category template @event save :: Template :: 保存当前模板 @event select :: string[] :: 选中节点 ID 集合 */
export const VTemplateEditor = defineComponent({
  name: 'VTemplateEditor',
  props: {
    /** 被编辑的模板。编辑器内部持有副本，通过 update:modelValue 回吐 */
    modelValue: { type: Object as PropType<Template>, required: true },
    /** 只读模式：仍可浏览与选中，但不能改动 */
    readonly: { type: Boolean, default: false },
    /** 组件面板只显示这些分类名，不传则全部显示 */
    categories: { type: Array as PropType<string[]>, default: undefined }
  },
  emits: ['update:modelValue', 'save', 'select'],
  setup(props, { emit }) {
    const editor = createTemplateEditor(props.modelValue)
    const sidePane = ref<SidePane>('props')
    const guides = ref<SnapGuide[]>([])
    const canvasEl = ref<HTMLElement | null>(null)
    /** 画布内容宽度。栅格的像素换算全靠它，测量一次、随尺寸变化更新 */
    const canvasWidth = ref(0)

    const canvas = computed(() => resolveCanvas(editor.template.value.canvas))
    const mode = computed<LayoutMode>(() => editor.layoutMode.value)
    const children = computed<TemplateNode[]>(() => editor.template.value.root?.children || [])

    // ---------------------------------------------------------------- 双向绑定
    /*
     * 自己刚吐出去的那份对象再回流进来时要认得出来，否则 emit → prop 变化 → 重置
     * → 又 emit，成一个环，表现是编辑器每次改动都闪一下并丢掉选中状态。
     */
    let lastEmitted: Template | null = null
    watch(
      editor.template,
      (value) => {
        lastEmitted = value
        emit('update:modelValue', value)
      },
      { deep: true }
    )
    watch(
      () => props.modelValue,
      (value) => {
        if (value && value !== lastEmitted) {
          editor.template.value = JSON.parse(JSON.stringify(value))
          editor.clearSelection()
        }
      }
    )
    watch(editor.selection, (value) => emit('select', value))

    // ---------------------------------------------------------------- 测量
    let observer: ResizeObserver | null = null
    const measure = () => {
      if (canvasEl.value) canvasWidth.value = canvasEl.value.clientWidth
    }
    onMounted(() => {
      measure()
      if (typeof ResizeObserver !== 'undefined' && canvasEl.value) {
        observer = new ResizeObserver(measure)
        observer.observe(canvasEl.value)
      }
      window.addEventListener('keydown', onKeydown)
    })
    onBeforeUnmount(() => {
      observer?.disconnect()
      window.removeEventListener('keydown', onKeydown)
    })

    // ---------------------------------------------------------------- 几何读写
    const geometryOf = (node: TemplateNode): Geometry | undefined =>
      mode.value === 'grid'
        ? resolveGridGeometry(node.layout, editor.breakpoint.value)
        : node.layout?.absolute

    /** 节点在画布上的像素框，浮层的选中框与手柄都按它摆 */
    const pixelBoxOf = (node: TemplateNode) => {
      const geo = geometryOf(node)
      if (!geo) return null
      if (mode.value === 'absolute') {
        return { left: geo.x, top: geo.y, width: geo.w, height: geo.h }
      }
      if (!canvasWidth.value) return null
      return gridToPixel(geo, canvasWidth.value, canvas.value)
    }

    /** 其他节点的矩形，吸附时要拿它们当参照 */
    const othersOf = (id: string) =>
      children.value
        .filter((child) => child.id !== id)
        .map((child) => {
          const geo = geometryOf(child)
          return geo ? { id: child.id, ...geo } : null
        })
        .filter(Boolean) as Array<Geometry & { id: string }>

    // ---------------------------------------------------------------- 拖拽 / 缩放
    const editable = () => !props.readonly && mode.value !== 'flow'

    /**
     * 统一的指针拖拽循环。move 收到的是「相对按下点的像素位移」，
     * 由调用方决定换算成格还是 px。抬起时结束批次，整段合并成一步历史。
     */
    function runPointerDrag(
      event: PointerEvent,
      onMove: (dx: number, dy: number) => void,
      onDone?: () => void
    ) {
      const startX = event.clientX
      const startY = event.clientY
      let batching = false

      const move = (e: PointerEvent) => {
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        // 没超过阈值就还当是点击，不开批次也不改数据
        if (!batching && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
        if (!batching) {
          batching = true
          editor.beginBatch()
        }
        onMove(dx, dy)
      }
      const up = () => {
        if (batching) editor.endBatch()
        guides.value = []
        onDone?.()
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

    function startMove(event: PointerEvent, node: TemplateNode) {
      if (!editable()) return
      const origin = geometryOf(node)
      if (!origin || origin.static) return
      event.preventDefault()

      runPointerDrag(event, (dx, dy) => {
        if (mode.value === 'grid') {
          const step = colWidth(canvasWidth.value, canvas.value.cols, canvas.value.gap) + canvas.value.gap
          const rowStep = canvas.value.rowHeight + canvas.value.gap
          editor.updateGeometry(node.id, {
            x: origin.x + Math.round(dx / step),
            y: Math.max(0, origin.y + Math.round(dy / rowStep))
          })
          return
        }
        const moved = { id: node.id, ...origin, x: origin.x + dx, y: origin.y + dy }
        const snapped = snapPosition(moved, othersOf(node.id), canvas.value)
        guides.value = snapped.guides
        editor.updateGeometry(node.id, { x: snapped.x, y: snapped.y })
      })
    }

    function startResize(event: PointerEvent, node: TemplateNode, handle: ResizeHandle) {
      if (!editable()) return
      const origin = geometryOf(node)
      if (!origin || origin.static) return
      event.preventDefault()
      event.stopPropagation()

      runPointerDrag(event, (dx, dy) => {
        if (mode.value === 'grid') {
          const step = colWidth(canvasWidth.value, canvas.value.cols, canvas.value.gap) + canvas.value.gap
          const rowStep = canvas.value.rowHeight + canvas.value.gap
          const next = applyResizeDelta(origin, handle, Math.round(dx / step), Math.round(dy / rowStep))
          editor.updateGeometry(node.id, clampGeometry(next, { maxX: canvas.value.cols }))
          return
        }
        const next = applyResizeDelta(origin, handle, dx, dy)
        editor.updateGeometry(
          node.id,
          clampGeometry(next, { maxX: canvas.value.width, maxY: canvas.value.height })
        )
      })
    }

    // ---------------------------------------------------------------- 面板拖入
    let dragType: ComponentType | null = null

    function onStageDrop(event: DragEvent) {
      event.preventDefault()
      if (!dragType || props.readonly) return
      const node = createNode(dragType)
      const rect = canvasEl.value?.getBoundingClientRect()

      if (rect && mode.value !== 'flow') {
        const offsetX = event.clientX - rect.left
        const offsetY = event.clientY - rect.top
        node.layout = node.layout || {}
        if (mode.value === 'grid') {
          const step = colWidth(canvasWidth.value, canvas.value.cols, canvas.value.gap) + canvas.value.gap
          node.layout.grid = {
            x: Math.max(0, Math.floor(offsetX / step)),
            y: Math.max(0, Math.floor(offsetY / (canvas.value.rowHeight + canvas.value.gap))),
            w: 6,
            h: 1
          }
        } else {
          node.layout.absolute = { x: Math.round(offsetX), y: Math.round(offsetY), w: 320, h: 38 }
        }
      }
      editor.addNode(node)
      dragType = null
    }

    // ---------------------------------------------------------------- 键盘
    function onKeydown(event: KeyboardEvent) {
      // 焦点在输入框里时不抢快捷键，否则属性面板里连删字都做不到
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (props.readonly) return

      const meta = event.ctrlKey || event.metaKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        event.shiftKey ? editor.redo() : editor.undo()
        return
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        editor.redo()
        return
      }
      if (meta && event.key.toLowerCase() === 'c') return editor.copy()
      if (meta && event.key.toLowerCase() === 'x') return editor.cut()
      if (meta && event.key.toLowerCase() === 'v') return editor.paste()
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        return editor.duplicate()
      }
      if (meta && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        return editor.selectAll()
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!editor.selection.value.length) return
        event.preventDefault()
        return editor.removeSelected()
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      }
      const delta = arrows[event.key]
      if (delta && editor.selection.value.length) {
        event.preventDefault()
        // absolute 模式下按住 Shift 走 10px，方便快速挪
        const scale = mode.value === 'absolute' ? (event.shiftKey ? 10 : 1) : 1
        editor.nudgeSelected(delta[0] * scale, delta[1] * scale)
      }
    }

    // ---------------------------------------------------------------- 渲染：组件面板
    function renderPalette(): VNode {
      const groups = COMPONENT_CATEGORIES.filter(
        (group) => !props.categories || props.categories.includes(group.name)
      )
      return h('aside', { class: 'vui-tpl-editor-palette' }, [
        h('div', { class: 'vui-tpl-editor-panel-title' }, '组件'),
        ...groups.map((group) =>
          h('div', { class: 'vui-tpl-editor-group', key: group.name }, [
            h('div', { class: 'vui-tpl-editor-group-title' }, group.name),
            h(
              'div',
              { class: 'vui-tpl-editor-chips' },
              group.components.map((item) =>
                h(
                  'div',
                  {
                    class: 'vui-tpl-editor-chip',
                    key: item.type,
                    draggable: !props.readonly,
                    title: item.description,
                    onDragstart: () => {
                      dragType = item.type as ComponentType
                    },
                    // 面板项也支持双击直接加进画布，比拖拽快
                    onDblclick: () => {
                      if (!props.readonly) editor.addNode(createNode(item.type as ComponentType))
                    }
                  },
                  item.label
                )
              )
            )
          ])
        )
      ])
    }

    // ---------------------------------------------------------------- 渲染：工具栏
    function tool(label: string, onClick: () => void, options: { disabled?: boolean; active?: boolean; title?: string } = {}) {
      return h(
        'button',
        {
          type: 'button',
          class: ['vui-tpl-editor-tool', options.active ? 'is-active' : ''],
          disabled: options.disabled || false,
          title: options.title || label,
          onClick
        },
        label
      )
    }

    function renderToolbar(): VNode {
      const modes: Array<[LayoutMode, string]> = [
        ['flow', '流式'],
        ['grid', '栅格'],
        ['absolute', '自由']
      ]
      const breakpoints: BreakpointKey[] = ['lg', 'md', 'sm']
      return h('div', { class: 'vui-tpl-editor-toolbar' }, [
        tool('撤销', editor.undo, { disabled: !editor.canUndo.value, title: '撤销 (Ctrl+Z)' }),
        tool('重做', editor.redo, { disabled: !editor.canRedo.value, title: '重做 (Ctrl+Shift+Z)' }),
        h('span', { class: 'vui-tpl-editor-sep' }),
        tool('复制', editor.copy, { disabled: !editor.selection.value.length, title: '复制 (Ctrl+C)' }),
        tool('粘贴', editor.paste, { disabled: !editor.hasClipboard.value, title: '粘贴 (Ctrl+V)' }),
        tool('删除', editor.removeSelected, { disabled: !editor.selection.value.length, title: '删除 (Delete)' }),
        h('span', { class: 'vui-tpl-editor-sep' }),
        ...modes.map(([value, label]) =>
          tool(label, () => editor.setLayoutMode(value), {
            active: mode.value === value,
            title: `切换到${label}布局`
          })
        ),
        h('span', { class: 'vui-tpl-editor-sep' }),
        // 断点只对栅格有意义：自由画布是固定像素，没有响应式可言
        ...breakpoints.map((bp) =>
          tool(bp.toUpperCase(), () => (editor.breakpoint.value = bp), {
            active: editor.breakpoint.value === bp,
            disabled: mode.value !== 'grid',
            title: mode.value === 'grid' ? `编辑 ${bp} 断点的布局` : '仅栅格模式支持断点'
          })
        ),
        h('span', { class: 'vui-tpl-editor-spacer' }),
        tool('紧凑排列', editor.compact, { disabled: mode.value !== 'grid', title: '把所有节点上浮填掉空行' }),
        tool('保存', () => emit('save', editor.template.value))
      ])
    }

    // ---------------------------------------------------------------- 渲染：画布浮层
    function renderHandles(node: TemplateNode): VNode[] {
      if (props.readonly || geometryOf(node)?.static) return []
      return RESIZE_HANDLES.map((handle) =>
        h('span', {
          class: ['vui-tpl-editor-handle', `is-${handle}`],
          key: handle,
          onPointerdown: (event: PointerEvent) => startResize(event, node, handle)
        })
      )
    }

    function renderOverlay(): VNode {
      const items = children.value
        .map((node) => {
          const box = pixelBoxOf(node)
          if (!box) return null
          const selected = editor.isSelected(node.id)
          return h(
            'div',
            {
              key: node.id,
              class: ['vui-tpl-editor-item', selected ? 'is-selected' : ''],
              style: {
                left: `${box.left}px`,
                top: `${box.top}px`,
                width: `${box.width}px`,
                height: `${box.height}px`
              },
              onPointerdown: (event: PointerEvent) => {
                editor.select(node.id, { additive: event.shiftKey || event.ctrlKey || event.metaKey })
                startMove(event, node)
              }
            },
            selected ? renderHandles(node) : []
          )
        })
        .filter(Boolean) as VNode[]

      const guideNodes = guides.value.map((guide, index) =>
        h('span', {
          key: `guide-${index}`,
          class: ['vui-tpl-editor-guide', `is-${guide.axis}`],
          style: guide.axis === 'x' ? { left: `${guide.position}px` } : { top: `${guide.position}px` }
        })
      )

      return h('div', { class: 'vui-tpl-editor-overlay' }, [...items, ...guideNodes])
    }

    function renderStage(): VNode {
      return h(
        'div',
        {
          class: 'vui-tpl-editor-stage',
          onDragover: (event: DragEvent) => event.preventDefault(),
          onDrop: onStageDrop,
          // 点空白处取消选中
          onPointerdown: (event: PointerEvent) => {
            if (event.target === event.currentTarget) editor.clearSelection()
          }
        },
        [
          h(
            'div',
            {
              class: ['vui-tpl-editor-canvas', mode.value === 'absolute' ? 'is-fixed' : ''],
              ref: canvasEl
            },
            [
              h(TemplateRenderer, { template: editor.template.value, preview: true }),
              mode.value === 'flow' ? null : renderOverlay()
            ]
          )
        ]
      )
    }

    // ---------------------------------------------------------------- 渲染：图层树
    function renderLayers(): VNode {
      if (!children.value.length) {
        return h('div', { class: 'vui-tpl-editor-empty' }, '画布还是空的，从左侧拖一个组件进来')
      }
      return h(
        'div',
        { class: 'vui-tpl-editor-pane' },
        children.value.map((node) =>
          h(
            'div',
            {
              key: node.id,
              class: ['vui-tpl-editor-layer', editor.isSelected(node.id) ? 'is-active' : ''],
              onClick: (event: MouseEvent) =>
                editor.select(node.id, { additive: event.shiftKey || event.ctrlKey || event.metaKey })
            },
            `${node.meta?.label || node.type}`
          )
        )
      )
    }

    // ---------------------------------------------------------------- 渲染：属性面板
    function field(label: string, control: VNode): VNode {
      return h('label', { class: 'vui-tpl-editor-field' }, [
        h('span', { class: 'vui-tpl-editor-field-label' }, label),
        control
      ])
    }

    function numberField(label: string, value: number | undefined, onChange: (value: number | undefined) => void) {
      return field(
        label,
        h('input', {
          type: 'number',
          value: value ?? '',
          onInput: (event: Event) => {
            const raw = (event.target as HTMLInputElement).value
            // 清空 = 取消这条约束，不能当成 0，否则宽度会被夹成 0
            onChange(raw === '' ? undefined : Number(raw))
          }
        })
      )
    }

    /** 几何与尺寸约束。单位随模式变，标题里写清楚免得用户按 px 填格数 */
    function renderGeometrySection(node: TemplateNode): VNode | null {
      const geo = geometryOf(node)
      if (!geo) return null
      const unit = mode.value === 'grid' ? '格 / 行' : 'px'
      const set = (patch: Partial<Geometry>) => editor.updateGeometry(node.id, patch)

      return h('div', { class: 'vui-tpl-editor-section' }, [
        h('div', { class: 'vui-tpl-editor-section-title' }, `位置与尺寸（${unit}）`),
        numberField('X', geo.x, (value) => set({ x: value ?? 0 })),
        numberField('Y', geo.y, (value) => set({ y: value ?? 0 })),
        numberField('宽', geo.w, (value) => set({ w: value ?? 1 })),
        numberField('高', geo.h, (value) => set({ h: value ?? 1 })),
        h('div', { class: 'vui-tpl-editor-section-title' }, '尺寸限制'),
        numberField('最小宽', geo.minW, (value) => set({ minW: value })),
        numberField('最大宽', geo.maxW, (value) => set({ maxW: value })),
        numberField('最小高', geo.minH, (value) => set({ minH: value })),
        numberField('最大高', geo.maxH, (value) => set({ maxH: value })),
        field(
          '锁定',
          h('input', {
            type: 'checkbox',
            checked: geo.static === true,
            onChange: (event: Event) => set({ static: (event.target as HTMLInputElement).checked })
          })
        )
      ])
    }

    /** 组件自身属性，配置来自 COMPONENT_PROPS_CONFIG */
    function renderPropsSection(node: TemplateNode): VNode {
      const config = COMPONENT_PROPS_CONFIG[node.type] || []
      if (!config.length) {
        return h('div', { class: 'vui-tpl-editor-section' }, [
          h('div', { class: 'vui-tpl-editor-section-title' }, '组件属性'),
          h('div', { class: 'vui-tpl-editor-empty' }, '这个组件没有可配置属性')
        ])
      }
      return h('div', { class: 'vui-tpl-editor-section' }, [
        h('div', { class: 'vui-tpl-editor-section-title' }, '组件属性'),
        ...config.map((item) => {
          const current = node.props?.[item.name]
          if (item.type === 'boolean') {
            return field(
              item.label,
              h('input', {
                type: 'checkbox',
                checked: Boolean(current),
                onChange: (event: Event) =>
                  editor.updateProps(node.id, { [item.name]: (event.target as HTMLInputElement).checked })
              })
            )
          }
          if (item.type === 'select' && item.options?.length) {
            return field(
              item.label,
              h(
                'select',
                {
                  value: current ?? '',
                  onChange: (event: Event) =>
                    editor.updateProps(node.id, { [item.name]: (event.target as HTMLSelectElement).value })
                },
                item.options.map((option) =>
                  h('option', { key: String(option.value), value: option.value }, option.label)
                )
              )
            )
          }
          return field(
            item.label,
            h('input', {
              type: item.type === 'number' ? 'number' : 'text',
              value: current ?? '',
              onInput: (event: Event) => {
                const raw = (event.target as HTMLInputElement).value
                editor.updateProps(node.id, { [item.name]: item.type === 'number' ? Number(raw) : raw })
              }
            })
          )
        })
      ])
    }

    /** 事件编排：把「什么时候」映射到「做什么」，参数留给 JSON */
    function renderEventsSection(node: TemplateNode): VNode {
      const triggers = ['click', 'change', 'submit'] as const
      const actions = ['', 'submit', 'validate', 'reset', 'setValue', 'showModal', 'closeModal'] as const
      return h('div', { class: 'vui-tpl-editor-section' }, [
        h('div', { class: 'vui-tpl-editor-section-title' }, '事件'),
        ...triggers.map((trigger) =>
          field(
            trigger,
            h(
              'select',
              {
                value: node.events?.[trigger]?.action || '',
                onChange: (event: Event) => {
                  const action = (event.target as HTMLSelectElement).value
                  const events = { ...(node.events || {}) }
                  if (!action) delete events[trigger]
                  else events[trigger] = { type: trigger, action } as never
                  editor.updateNode(node.id, { events })
                }
              },
              actions.map((action) =>
                h('option', { key: action || 'none', value: action }, action || '（无）')
              )
            )
          )
        )
      ])
    }

    function renderInspector(): VNode {
      const id = editor.selection.value[0]
      const node = id ? children.value.find((child) => child.id === id) : undefined
      if (!node) {
        return h('div', { class: 'vui-tpl-editor-empty' }, '选中一个组件后在这里改它的属性')
      }
      return h('div', { class: 'vui-tpl-editor-pane' }, [
        h('div', { class: 'vui-tpl-editor-section' }, [
          h('div', { class: 'vui-tpl-editor-section-title' }, node.meta?.label || node.type),
          field(
            '标注名',
            h('input', {
              type: 'text',
              value: node.meta?.label || '',
              onInput: (event: Event) =>
                editor.updateNode(node.id, {
                  meta: { ...node.meta, label: (event.target as HTMLInputElement).value }
                })
            })
          )
        ]),
        renderGeometrySection(node),
        renderPropsSection(node),
        renderEventsSection(node)
      ].filter(Boolean) as VNode[])
    }

    function renderSide(): VNode {
      const panes: Array<[SidePane, string]> = [
        ['props', '属性'],
        ['layers', '图层']
      ]
      return h('aside', { class: 'vui-tpl-editor-side' }, [
        h(
          'div',
          { class: 'vui-tpl-editor-tabs' },
          panes.map(([value, label]) =>
            h(
              'button',
              {
                type: 'button',
                key: value,
                class: ['vui-tpl-editor-tab', sidePane.value === value ? 'is-active' : ''],
                onClick: () => (sidePane.value = value)
              },
              label
            )
          )
        ),
        sidePane.value === 'layers' ? renderLayers() : renderInspector()
      ])
    }

    return () =>
      h('div', { class: 'vui-tpl-editor' }, [
        renderPalette(),
        h('div', { class: 'vui-tpl-editor-main' }, [renderToolbar(), renderStage()]),
        renderSide()
      ])
  }
})

export default VTemplateEditor
