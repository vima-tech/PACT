/**
 * @vima-tech/ui-admin · 模板编辑器状态机
 *
 * 创建日期: 2026-08-11
 *
 * types.ts 里的 EditorState 从一开始就声明了 history / 多选 / 拖拽状态，
 * 但一直没有任何实现——编辑器只能一步一步改，点错了没法回退。这里把它补上。
 *
 * 三个设计选择，都是为了「连续作业」这个目标：
 *
 * 1. 历史用**整树快照**而不是操作日志。模板通常几十个节点，一份快照几 KB，
 *    换来的是撤销永远不会「回放错」——操作日志的反向操作一旦有一处写反，
 *    就会在某个特定顺序下把树改坏，而且极难复现。
 *
 * 2. 拖拽必须能**合并成一次历史**。一次拖动会触发几十次几何更新，
 *    每次都记一笔的话，用户按一次撤销只退回一帧，等于撤销失效。
 *    办法是 transaction()：进事务后所有改动共用一个快照点。
 *
 * 3. 在非 lg 断点下编辑时，几何写进 layout.breakpoints[bp] 而不是基准值。
 *    否则「调窄屏布局」会把宽屏布局一起改掉，这是响应式编辑最容易踩的坑。
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'

import { cloneNode, findNode, findParentNode } from './editor'
import {
  clampGeometry,
  compactGrid,
  gridToPixel,
  pixelToGrid,
  resolveCanvas,
  resolveGridCollisions,
  resolveGridGeometry,
  type PlacedRect
} from './geometry'
import { createTemplateId } from './id'
import type { BreakpointKey, ComponentProps, Geometry, LayoutMode, Template, TemplateNode } from './types'

/** 编辑器构造选项 */
export interface TemplateEditorOptions {
  /** 历史栈上限，默认 100 步。超出后丢最旧的 */
  historyLimit?: number
}

/** 一次几何更新的选项 */
export interface GeometryUpdateOptions {
  /** 是否消解碰撞（grid 模式默认 true；拖拽预览时可关掉省算力） */
  resolveCollision?: boolean
}

/**
 * 编辑器实例。所有会改模板的方法都自动记历史，
 * 除非包在 transaction() 里（那时整段合并成一步）。
 */
export interface TemplateEditor {
  template: Ref<Template>
  /** 选中的节点 id，支持多选 */
  selection: Ref<string[]>
  /** 当前正在编辑的断点。非 lg 时几何写进断点覆盖 */
  breakpoint: Ref<BreakpointKey>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  /** 当前根容器的摆放模式 */
  layoutMode: ComputedRef<LayoutMode>
  /** 剪贴板里有没有东西 */
  hasClipboard: ComputedRef<boolean>

  select(id: string | null, options?: { additive?: boolean }): void
  selectAll(): void
  clearSelection(): void
  isSelected(id: string): boolean

  addNode(node: TemplateNode, parentId?: string): void
  removeNode(id: string): void
  removeSelected(): void
  updateNode(id: string, patch: Partial<TemplateNode>): void
  updateProps(id: string, props: ComponentProps): void
  updateGeometry(id: string, patch: Partial<Geometry>, options?: GeometryUpdateOptions): void
  nudgeSelected(dx: number, dy: number): void

  copy(): void
  cut(): void
  paste(): void
  duplicate(): void

  undo(): void
  redo(): void
  transaction(run: () => void): void
  /**
   * 开始一个跨事件的批次（一次拖拽 / 一次 resize）。
   * transaction() 是同步的，包不住「按下—移动—抬起」这种跨越多个事件回调的过程，
   * 所以另给一对显式边界。必须与 endBatch 成对调用。
   */
  beginBatch(): void
  endBatch(): void

  compact(): void
  setLayoutMode(mode: LayoutMode): void
  /** 兄弟节点的矩形列表，编辑器画选中框、算碰撞都要用 */
  siblingRects(id: string): PlacedRect[]
}

/** 默认几何：新加的节点占半行宽、一行高，落在第一行 */
const DEFAULT_GRID: Geometry = { x: 0, y: 0, w: 12, h: 1 }
const DEFAULT_ABSOLUTE: Geometry = { x: 24, y: 24, w: 320, h: 38 }

/** 深拷贝一份模板，用作历史快照 */
const snapshot = (template: Template): Template => JSON.parse(JSON.stringify(template))

export function createTemplateEditor(
  initial: Template,
  options: TemplateEditorOptions = {}
): TemplateEditor {
  const historyLimit = options.historyLimit ?? 100

  const template = ref<Template>(snapshot(initial)) as Ref<Template>
  const selection = ref<string[]>([])
  const breakpoint = ref<BreakpointKey>('lg')
  const past = ref<Template[]>([])
  const future = ref<Template[]>([])
  const clipboard = ref<TemplateNode[]>([])

  /** 事务深度。大于 0 时单次改动不再各记一笔历史 */
  let txDepth = 0

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const hasClipboard = computed(() => clipboard.value.length > 0)
  const layoutMode = computed<LayoutMode>(
    () => template.value.root?.layoutMode || template.value.layoutMode || 'flow'
  )

  /** 压一个历史点。任何一次新改动都会让「重做」失效——分支历史不做，代价大于收益 */
  function pushHistory() {
    past.value.push(snapshot(template.value))
    if (past.value.length > historyLimit) past.value.shift()
    future.value = []
  }

  /** 所有会改模板的操作都要过这里，保证历史不漏记 */
  function mutate(run: () => void) {
    if (txDepth === 0) pushHistory()
    run()
  }

  function beginBatch() {
    if (txDepth === 0) pushHistory()
    txDepth++
  }

  function endBatch() {
    // 夹到 0：多余的 endBatch 不该把深度打成负数，那会让后续操作全部漏记历史
    txDepth = Math.max(0, txDepth - 1)
  }

  function transaction(run: () => void) {
    beginBatch()
    try {
      run()
    } finally {
      endBatch()
    }
  }

  function undo() {
    const previous = past.value.pop()
    if (!previous) return
    future.value.push(snapshot(template.value))
    template.value = previous
    pruneSelection()
  }

  function redo() {
    const next = future.value.pop()
    if (!next) return
    past.value.push(snapshot(template.value))
    template.value = next
    pruneSelection()
  }

  /** 撤销/删除之后，选中集里可能残留已经不存在的 id */
  function pruneSelection() {
    selection.value = selection.value.filter((id) => findNode(template.value.root, id))
  }

  // ==================== 选择 ====================

  function select(id: string | null, opts: { additive?: boolean } = {}) {
    if (!id) {
      selection.value = []
      return
    }
    if (!opts.additive) {
      selection.value = [id]
      return
    }
    // 加选：已选中的再点一次就取消，符合大多数编辑器的手感
    selection.value = selection.value.includes(id)
      ? selection.value.filter((one) => one !== id)
      : [...selection.value, id]
  }

  const selectAll = () => {
    selection.value = (template.value.root?.children || []).map((child) => child.id)
  }
  const clearSelection = () => {
    selection.value = []
  }
  const isSelected = (id: string) => selection.value.includes(id)

  // ==================== 节点增删改 ====================

  function parentOf(id: string): TemplateNode | null {
    return findParentNode(template.value.root, id)
  }

  /** 节点落进画布时得有个初始几何，否则它在 grid/absolute 下无处安放 */
  function ensureLayout(node: TemplateNode, mode: LayoutMode) {
    if (mode === 'flow') return
    node.layout = node.layout || {}
    if (mode === 'grid' && !node.layout.grid) node.layout.grid = { ...DEFAULT_GRID }
    if (mode === 'absolute' && !node.layout.absolute) node.layout.absolute = { ...DEFAULT_ABSOLUTE }
  }

  function addNode(node: TemplateNode, parentId?: string) {
    mutate(() => {
      const parent = parentId ? findNode(template.value.root, parentId) : template.value.root
      if (!parent) return
      parent.children = parent.children || []
      const mode = parent.layoutMode || (parent === template.value.root ? template.value.layoutMode : undefined) || 'flow'
      ensureLayout(node, mode)
      parent.children.push(node)
      selection.value = [node.id]
      if (mode === 'grid') settleGrid(parent, node.id)
    })
  }

  function removeNode(id: string) {
    mutate(() => {
      const parent = parentOf(id)
      if (!parent?.children) return
      parent.children = parent.children.filter((child) => child.id !== id)
      selection.value = selection.value.filter((one) => one !== id)
    })
  }

  function removeSelected() {
    if (!selection.value.length) return
    transaction(() => {
      // 先取一份快照再删：边遍历边改 selection 会漏删
      for (const id of [...selection.value]) removeNode(id)
      selection.value = []
    })
  }

  function updateNode(id: string, patch: Partial<TemplateNode>) {
    mutate(() => {
      const node = findNode(template.value.root, id)
      if (node) Object.assign(node, patch)
    })
  }

  function updateProps(id: string, props: ComponentProps) {
    mutate(() => {
      const node = findNode(template.value.root, id)
      if (node) node.props = { ...node.props, ...props }
    })
  }

  // ==================== 几何 ====================

  /** 取某个节点在当前断点下的实际几何 */
  function geometryOf(node: TemplateNode, mode: LayoutMode): Geometry | undefined {
    if (mode === 'grid') return resolveGridGeometry(node.layout, breakpoint.value)
    if (mode === 'absolute') return node.layout?.absolute
    return undefined
  }

  function siblingRects(id: string): PlacedRect[] {
    const parent = parentOf(id) || template.value.root
    const mode = parent.layoutMode || (parent === template.value.root ? template.value.layoutMode : undefined) || 'flow'
    return (parent.children || [])
      .map((child) => {
        const geo = geometryOf(child, mode)
        return geo ? { id: child.id, ...geo } : null
      })
      .filter(Boolean) as PlacedRect[]
  }

  /** 消解一个容器内的碰撞，把结果写回各节点 */
  function settleGrid(parent: TemplateNode, movedId: string) {
    const rects = (parent.children || [])
      .map((child) => {
        const geo = resolveGridGeometry(child.layout, breakpoint.value)
        return geo ? { id: child.id, ...geo } : null
      })
      .filter(Boolean) as PlacedRect[]
    if (rects.length < 2) return

    const settled = resolveGridCollisions(rects, movedId)
    for (const rect of settled) {
      const child = (parent.children || []).find((one) => one.id === rect.id)
      if (child) writeGeometry(child, { y: rect.y }, 'grid')
    }
  }

  /**
   * 把几何写进节点。
   *
   * 断点是关键：在 md/sm 下编辑时只写 breakpoints[bp]，绝不动基准值——
   * 否则用户为了修窄屏，把宽屏也一起改坏了，而且当场看不出来。
   */
  function writeGeometry(node: TemplateNode, patch: Partial<Geometry>, mode: LayoutMode) {
    node.layout = node.layout || {}
    if (mode === 'absolute') {
      node.layout.absolute = { ...DEFAULT_ABSOLUTE, ...node.layout.absolute, ...patch }
      return
    }
    if (mode !== 'grid') return

    if (breakpoint.value === 'lg') {
      node.layout.grid = { ...DEFAULT_GRID, ...node.layout.grid, ...patch }
      return
    }
    node.layout.breakpoints = node.layout.breakpoints || {}
    node.layout.breakpoints[breakpoint.value] = {
      ...node.layout.breakpoints[breakpoint.value],
      ...patch
    }
  }

  function updateGeometry(id: string, patch: Partial<Geometry>, opts: GeometryUpdateOptions = {}) {
    mutate(() => {
      const node = findNode(template.value.root, id)
      if (!node) return
      const parent = parentOf(id) || template.value.root
      const mode = parent.layoutMode || (parent === template.value.root ? template.value.layoutMode : undefined) || 'flow'
      if (mode === 'flow') return

      const canvas = resolveCanvas(template.value.canvas)
      const current = geometryOf(node, mode) || (mode === 'grid' ? DEFAULT_GRID : DEFAULT_ABSOLUTE)
      const bounds = mode === 'grid'
        ? { maxX: canvas.cols }
        : { maxX: canvas.width, maxY: canvas.height }
      const next = clampGeometry({ ...current, ...patch }, bounds)

      writeGeometry(node, next, mode)
      if (mode === 'grid' && (opts.resolveCollision ?? true)) settleGrid(parent, id)
    })
  }

  /** 方向键微调：grid 走格、absolute 走 px，选中的一起动 */
  function nudgeSelected(dx: number, dy: number) {
    if (!selection.value.length) return
    transaction(() => {
      for (const id of selection.value) {
        const node = findNode(template.value.root, id)
        if (!node) continue
        const parent = parentOf(id) || template.value.root
        const mode = parent.layoutMode || (parent === template.value.root ? template.value.layoutMode : undefined) || 'flow'
        const current = geometryOf(node, mode)
        if (!current) continue
        updateGeometry(id, { x: current.x + dx, y: current.y + dy })
      }
    })
  }

  // ==================== 剪贴板 ====================

  function copy() {
    clipboard.value = selection.value
      .map((id) => findNode(template.value.root, id))
      .filter(Boolean)
      .map((node) => cloneNode(node as TemplateNode))
  }

  function cut() {
    copy()
    removeSelected()
  }

  /** 粘贴出来的节点要错开一点，否则严丝合缝盖在原件上，看着像什么都没发生 */
  function paste() {
    if (!clipboard.value.length) return
    transaction(() => {
      const created: string[] = []
      for (const source of clipboard.value) {
        const copyNode = cloneNode(source, true)
        copyNode.id = copyNode.id || createTemplateId()
        const mode = layoutMode.value
        if (mode === 'grid' && copyNode.layout?.grid) {
          copyNode.layout.grid = { ...copyNode.layout.grid, y: copyNode.layout.grid.y + 1 }
        } else if (mode === 'absolute' && copyNode.layout?.absolute) {
          copyNode.layout.absolute = {
            ...copyNode.layout.absolute,
            x: copyNode.layout.absolute.x + 16,
            y: copyNode.layout.absolute.y + 16
          }
        }
        addNode(copyNode)
        created.push(copyNode.id)
      }
      selection.value = created
    })
  }

  function duplicate() {
    copy()
    paste()
  }

  // ==================== 布局 ====================

  function compact() {
    if (layoutMode.value !== 'grid') return
    mutate(() => {
      const root = template.value.root
      const rects = (root.children || [])
        .map((child) => {
          const geo = resolveGridGeometry(child.layout, breakpoint.value)
          return geo ? { id: child.id, ...geo } : null
        })
        .filter(Boolean) as PlacedRect[]
      for (const rect of compactGrid(rects)) {
        const child = (root.children || []).find((one) => one.id === rect.id)
        if (child) writeGeometry(child, { y: rect.y }, 'grid')
      }
    })
  }

  /**
   * 切换摆放模式。
   *
   * 关键是**把已有排版换算过去**，而不是给个默认值了事：
   * 用户在栅格里摆好的东西，切到自由画布应该还在原位，只是单位从格变成了 px。
   * 早先的写法给每个节点发同一份默认几何，切过去以后三个组件全叠在 (24,24)，
   * 看上去像是把布局弄丢了——这在浏览器探针里才暴露出来。
   */
  function setLayoutMode(mode: LayoutMode) {
    mutate(() => {
      template.value.layoutMode = mode
      if (template.value.root) template.value.root.layoutMode = mode
      if (mode === 'flow') return

      const cv = resolveCanvas(template.value.canvas)
      let index = 0
      for (const child of template.value.root?.children || []) {
        child.layout = child.layout || {}

        if (mode === 'absolute' && !child.layout.absolute) {
          const grid = child.layout.grid
          if (grid) {
            const box = gridToPixel(grid, cv.width, cv)
            child.layout.absolute = {
              x: Math.round(box.left),
              y: Math.round(box.top),
              w: Math.round(box.width),
              h: Math.round(box.height)
            }
          } else {
            // 本来就没几何的，依次往下排，别全叠在一起
            child.layout.absolute = { ...DEFAULT_ABSOLUTE, y: DEFAULT_ABSOLUTE.y + index * 56 }
          }
        }

        if (mode === 'grid' && !child.layout.grid) {
          const abs = child.layout.absolute
          child.layout.grid = abs
            ? pixelToGrid(abs, cv.width, cv)
            : { ...DEFAULT_GRID, y: index }
        }

        index++
      }
    })
  }

  return {
    template,
    selection,
    breakpoint,
    canUndo,
    canRedo,
    layoutMode,
    hasClipboard,
    select,
    selectAll,
    clearSelection,
    isSelected,
    addNode,
    removeNode,
    removeSelected,
    updateNode,
    updateProps,
    updateGeometry,
    nudgeSelected,
    copy,
    cut,
    paste,
    duplicate,
    undo,
    redo,
    transaction,
    beginBatch,
    endBatch,
    compact,
    setLayoutMode,
    siblingRects
  }
}
