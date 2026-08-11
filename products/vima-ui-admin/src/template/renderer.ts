/**
 * @vima-tech/ui-admin · 模板渲染器
 *
 * 将模板JSON渲染为Vue组件
 */

import { defineComponent, h, ref, reactive, computed, watch, onMounted, onUnmounted, provide, inject, type PropType, type VNode, type Component } from 'vue'
import type { TemplateNode, Template, RenderContext, RendererConfig, Expression, EventHandler, LayoutMode } from './types'
import { BREAKPOINTS_DESC, resolveCanvas, resolveGridGeometry } from './geometry'
import { validateTemplate, type TemplateTrustLevel } from './validate'
import { assignSafeRecord, isSafeDataKey, isSafeDataPath, readSafeDataPath } from './safe-path'

// ==================== 布局几何 ====================

/*
 * 几何层是插在「组件已经算好属性」与「真正 h() 出来」之间的一层包裹。
 *
 * 三种模式的产物：
 *   flow     —— 什么都不做，逐像素维持旧行为（旧模板没有 layoutMode，走的就是这条）
 *   grid     —— 容器变 CSS Grid，每个子节点包一层 .vui-tpl-cell，用 grid-area 定位
 *   absolute —— 容器变定位上下文，每个子节点包一层 .vui-tpl-abs，用 left/top/width/height
 *
 * 为什么 grid 用 CSS Grid 而不是 VRow/VCol：VCol 只能表达「占几格宽」，
 * 表达不了「从第 7 列开始」。要做到精准定位，列起点是必须的，只有 Grid 给得了。
 *
 * 响应式为什么走 CSS 变量 + 媒体查询，而不是 ResizeObserver：
 * 三档几何在渲染时一次性写成 --vui-tpl-col-lg/md/sm，媒体查询里切换引用哪一个。
 * 纯 CSS、无运行时开销、不受 SSR 影响，断点阈值也与 ui.css 那条 1100px 同源。
 */

/** 容器在各模式下挂的类名 */
const LAYOUT_CONTAINER_CLASS: Record<Exclude<LayoutMode, 'flow'>, string> = {
  grid: 'vui-tpl-grid',
  absolute: 'vui-tpl-canvas'
}

const px = (value: number | undefined): string | undefined =>
  typeof value === 'number' ? `${value}px` : undefined

/** 容器需要的 CSS 变量（列数 / 行高 / 间距 / 画布尺寸） */
function containerVars(mode: Exclude<LayoutMode, 'flow'>, canvas: ReturnType<typeof resolveCanvas>) {
  if (mode === 'grid') {
    return {
      '--vui-tpl-cols': String(canvas.cols),
      '--vui-tpl-row-height': px(canvas.rowHeight),
      '--vui-tpl-gap': px(canvas.gap)
    }
  }
  return {
    '--vui-tpl-canvas-width': px(canvas.width),
    '--vui-tpl-canvas-height': px(canvas.height)
  }
}

/**
 * 给一个子节点算出它那层定位包裹的 style。
 *
 * grid 模式不输出 min/max 的 CSS：`grid-row: span h` 已经把高度定死了，
 * 再写一个 min-height 只会和栅格打架；而宽度的单位是「格」，
 * 依赖容器宽度，本来就没法写成静态 px。grid 下的 min/max 是**编辑期约束**——
 * resize 时用来夹取，不是运行期兜底。absolute 模式单位就是 px，则照实输出。
 */
function cellStyle(node: TemplateNode, mode: Exclude<LayoutMode, 'flow'>): Record<string, string | undefined> | undefined {
  if (mode === 'grid') {
    if (!node.layout?.grid) return undefined
    const style: Record<string, string | undefined> = {}
    for (const bp of BREAKPOINTS_DESC) {
      const geo = resolveGridGeometry(node.layout, bp)
      if (!geo) continue
      style[`--vui-tpl-col-${bp}`] = `${geo.x + 1} / span ${geo.w}`
      style[`--vui-tpl-row-${bp}`] = `${geo.y + 1} / span ${geo.h}`
    }
    return style
  }

  const geo = node.layout?.absolute
  if (!geo) return undefined
  return {
    left: px(geo.x),
    top: px(geo.y),
    width: px(geo.w),
    height: px(geo.h),
    minWidth: px(geo.minW),
    maxWidth: px(geo.maxW),
    minHeight: px(geo.minH),
    maxHeight: px(geo.maxH)
  }
}

// ==================== 表达式解析 ====================

/**
 * 判断是否为表达式
 */
function isExpression(value: any): value is Expression {
  return value && typeof value === 'object' && value.__expression === true
}

/**
 * 解析表达式
 */
function parseExpression(expr: string, context: Record<string, any>, trustLevel: TemplateTrustLevel): any {
  try {
    // 简单路径无需动态求值，也是 untrusted 唯一允许的表达式形式。
    if (isSafeDataPath(expr)) return readSafeDataPath(context, expr)
    if (trustLevel !== 'trusted') throw new Error('不可信模板不能执行动态表达式')
    const keys = Object.keys(context)
    const values = keys.map(key => context[key])
    const fn = new Function(...keys, `return ${expr}`)
    return fn(...values)
  } catch (error) {
    console.warn(`表达式解析失败: ${expr}`, error)
    return undefined
  }
}

/**
 * 解析属性值
 */
function resolvePropValue(value: any, context: Record<string, any>, trustLevel: TemplateTrustLevel): any {
  if (isExpression(value)) {
    return parseExpression(value.expr, context, trustLevel)
  }
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const expr = value.slice(2, -2).trim()
    return parseExpression(expr, context, trustLevel)
  }
  if (Array.isArray(value)) {
    return value.map(item => resolvePropValue(item, context, trustLevel))
  }
  if (typeof value === 'object' && value !== null) {
    const resolved: Record<string, any> = {}
    for (const key of Object.keys(value)) {
      resolved[key] = resolvePropValue(value[key], context, trustLevel)
    }
    return resolved
  }
  return value
}

// ==================== 事件处理 ====================

/**
 * 创建事件处理器
 */
function createEventHandler(
  handler: EventHandler,
  context: RenderContext,
  trustLevel: TemplateTrustLevel
): Function {
  return async (event?: any) => {
    const { action, params, handler: customHandler } = handler

    switch (action) {
      case 'setValue':
        if (typeof params?.field === 'string' && isSafeDataKey(params.field)) {
          context.formData[params.field] = params.value ?? event
        }
        break

      case 'getData':
        if (params?.dataSourceId) {
          // 触发数据源加载
          context.methods.loadData?.(params.dataSourceId)
        }
        break

      case 'submit':
        await context.methods.submit?.()
        break

      case 'validate':
        await context.methods.validate?.()
        break

      case 'reset':
        context.methods.reset?.()
        break

      case 'navigate':
        if (params?.url) {
          window.location.href = params.url
        }
        break

      case 'showModal':
        context.methods.showModal?.(params)
        break

      case 'closeModal':
        context.methods.closeModal?.(params)
        break

      case 'custom':
        if (customHandler && trustLevel === 'trusted') {
          try {
            const fn = new Function('context', 'event', customHandler)
            await fn(context, event)
          } catch (error) {
            console.error('自定义事件处理失败:', error)
          }
        }
        break
    }
  }
}

// ==================== 组件注册 ====================

/** 内置组件映射 */
const builtinComponents: Record<string, Component> = {}

/**
 * 注册组件
 */
export function registerComponent(name: string, component: Component): void {
  builtinComponents[name] = component
}

/**
 * 批量注册组件
 */
export function registerComponents(components: Record<string, Component>): void {
  Object.assign(builtinComponents, components)
}

// ==================== 渲染器 ====================

/** 模板渲染器组件 */
export const TemplateRenderer = defineComponent({
  name: 'TemplateRenderer',
  props: {
    /** 模板定义 */
    template: {
      type: Object as PropType<Template>,
      required: true
    },
    /** 表单数据 */
    modelValue: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    /** 全局数据 */
    globalData: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    /** 渲染器配置 */
    config: {
      type: Object as PropType<RendererConfig>,
      default: () => ({})
    },
    /** 是否预览模式 */
    preview: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'submit', 'validate', 'reset', 'change'],
  setup(props, { emit, expose }) {
    const trustLevel = computed<TemplateTrustLevel>(() => props.config.trustLevel || 'untrusted')
    const templateValidation = computed(() => validateTemplate(props.template, {
      trustLevel: trustLevel.value,
      allowedApiOrigins: props.config.allowedApiOrigins
    }))
    // 表单数据
    const formData = reactive<Record<string, any>>({ ...props.modelValue })
    
    // 组件引用
    const refs = ref<Record<string, any>>({})

    // 数据源结果独立存放，表达式可通过 dataSources.<id> 读取。
    const dataSources = reactive<Record<string, any>>({})
    
    // 渲染上下文
    const context: RenderContext = {
      formData,
      globalData: props.globalData,
      refs: refs.value,
      methods: {},
      computed: { dataSources },
      hooks: {}
    }

    // 监听数据变化
    watch(formData, (newVal) => {
      emit('update:modelValue', { ...newVal })
      emit('change', { ...newVal })
    }, { deep: true })

    // 监听外部数据变化
    watch(() => props.modelValue, (newVal) => {
      Object.keys(formData).forEach((key) => {
        if (!(key in newVal)) delete formData[key]
      })
      assignSafeRecord(formData, newVal)
    }, { deep: true })

    // 初始化表单数据
    const initFormData = () => {
      const initialValues = props.template.formConfig?.initialValues || {}
      // 遍历模板收集字段默认值
      const collectDefaults = (node: TemplateNode) => {
        if (node.type === 'form-item' && node.props?.field) {
          const field = node.props.field as string
          if (formData[field] === undefined) {
            formData[field] = node.props.defaultValue ?? initialValues[field] ?? ''
          }
        }
        if (node.children) {
          node.children.forEach(collectDefaults)
        }
        if (node.slots) {
          Object.values(node.slots).flat().forEach(collectDefaults)
        }
      }
      collectDefaults(props.template.root)
    }

    const updateModal = (params: any, method: 'open' | 'close', visible: boolean) => {
      const target = params?.targetId ? refs.value[params.targetId] : undefined
      if (typeof target?.[method] === 'function') target[method](params)
      else {
        const field = typeof params?.field === 'string' ? params.field : 'modalVisible'
        if (isSafeDataKey(field)) formData[field] = visible
      }
    }

    // 注册方法
    context.methods = {
      submit: async () => {
        emit('submit', { ...formData })
      },
      validate: async () => {
        const form = refs.value[props.template.root.id]
        try {
          const valid = typeof form?.validate === 'function' ? await form.validate() : true
          emit('validate', true)
          return valid
        } catch (error) {
          emit('validate', false, error)
          throw error
        }
      },
      reset: () => {
        Object.keys(formData).forEach(key => {
          delete formData[key]
        })
        initFormData()
        emit('reset')
      },
      showModal: (params: any) => updateModal(params, 'open', true),
      closeModal: (params?: any) => updateModal(params, 'close', false),
      loadData: async (dataSourceId: string) => {
        if (!templateValidation.value.valid) {
          throw new Error('模板未通过安全校验，不能加载数据源')
        }
        const source = props.template.dataSources?.find(item => item.id === dataSourceId)
        if (!source) throw new Error(`数据源不存在: ${dataSourceId}`)

        let result: any
        if (source.type === 'static') {
          result = source.data
        } else if (source.type === 'function' && source.handler && trustLevel.value === 'trusted') {
          const handler = new Function('context', source.handler)
          result = await handler(context)
        } else if (source.type === 'api' && source.api) {
          const method = source.api.method || 'GET'
          const url = new URL(source.api.url, globalThis.location?.href)
          const request: RequestInit = { method, headers: source.api.headers }
          if (method === 'GET') {
            Object.entries(source.api.params || {}).forEach(([key, value]) => {
              if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
            })
          } else if (source.api.params) {
            request.body = JSON.stringify(source.api.params)
            request.headers = { 'Content-Type': 'application/json', ...source.api.headers }
          }
          const response = await fetch(url, request)
          if (!response.ok) throw new Error(`数据源请求失败: ${response.status}`)
          const contentType = response.headers.get('content-type') || ''
          result = contentType.includes('application/json') ? await response.json() : await response.text()
        }

        dataSources[dataSourceId] = result
        return result
      }
    }

    // 暴露方法
    expose({
      formData,
      submit: context.methods.submit,
      validate: context.methods.validate,
      reset: context.methods.reset,
      loadData: context.methods.loadData,
      dataSources,
      getDiagnostics: () => [...templateValidation.value.diagnostics],
      getFormData: () => ({ ...formData }),
      setFormData: (data: Record<string, any>) => {
        assignSafeRecord(formData, data)
      }
    })

    onMounted(() => {
      if (!templateValidation.value.valid) {
        const error = new Error(templateValidation.value.diagnostics.map(item => item.message).join('\n'))
        props.config.onError?.(error, props.template.root)
        return
      }
      initFormData()
      props.template.dataSources
        ?.filter(source => source.autoLoad)
        .forEach(source => context.methods.loadData(source.id).catch((error: unknown) => {
          props.config.onError?.(error instanceof Error ? error : new Error(String(error)), props.template.root)
        }))
      context.hooks.mounted?.()
    })

    onUnmounted(() => {
      context.hooks.unmounted?.()
    })

    /** 画布配置（列数 / 行高 / 间距 / 画布尺寸），模板没写就取默认 */
    const canvas = computed(() => resolveCanvas(props.template.canvas))

    /**
     * 一个节点用什么模式摆放它的**子节点**。
     *
     * 模式不向下继承：grid 容器的子节点落在单元格里，单元格内部又是流式，
     * 除非那个子节点自己也声明了 layoutMode（这就是「卡片里嵌一块画布」的写法）。
     * 根节点没写时回落到 Template.layoutMode，再没有就是 flow——旧模板因此零变化。
     */
    const modeOf = (node: TemplateNode): LayoutMode =>
      node.layoutMode || (node === props.template.root ? props.template.layoutMode : undefined) || 'flow'

    /** 给子节点套上定位层。没有几何信息的子节点退回流式，不至于整个消失 */
    const wrapInCell = (child: TemplateNode, mode: Exclude<LayoutMode, 'flow'>, vnode: VNode): VNode => {
      const base = mode === 'grid' ? 'vui-tpl-cell' : 'vui-tpl-abs'
      const style = cellStyle(child, mode)
      return h(
        'div',
        {
          key: `cell-${child.id}`,
          class: style ? base : [base, 'is-auto'],
          style,
          'data-node-id': child.id
        },
        [vnode]
      )
    }

    // 渲染节点
    const renderNode = (node: TemplateNode, ctx: RenderContext = context, modelField?: string): VNode | null => {
      // 条件渲染
      if (node.condition) {
        const conditionValue = typeof node.condition === 'string'
          ? parseExpression(node.condition, { formData: ctx.formData, dataSources, ...props.globalData }, trustLevel.value)
          : resolvePropValue(node.condition, { formData: ctx.formData, dataSources, ...props.globalData }, trustLevel.value)
        if (!conditionValue) return null
      }

      // 循环渲染
      if (node.loop) {
        const loopData = typeof node.loop.data === 'string'
          ? parseExpression(node.loop.data, { formData: ctx.formData, dataSources, ...props.globalData }, trustLevel.value)
          : resolvePropValue(node.loop.data, { formData: ctx.formData, dataSources, ...props.globalData }, trustLevel.value)
        
        if (!Array.isArray(loopData)) return null
        
        return h('div', { key: `loop-${node.id}` }, 
          loopData.map((item, index) => {
            const loopContext = {
              ...context,
              formData: {
                ...formData,
                [node.loop!.item]: item,
                [node.loop!.index || 'index']: index
              }
            }
            return renderNodeWithContext(node, loopContext)
          })
        )
      }

      return renderNodeWithContext(node, ctx, modelField)
    }

    // 使用上下文渲染节点
    const renderNodeWithContext = (node: TemplateNode, ctx: RenderContext, modelField?: string): VNode | null => {
      // 解析属性
      const resolvedProps: Record<string, any> = {}
      if (node.props) {
        for (const [key, value] of Object.entries(node.props)) {
          resolvedProps[key] = resolvePropValue(value, { formData: ctx.formData, dataSources, ...props.globalData }, trustLevel.value)
        }
      }

      if (node.type === 'form') {
        resolvedProps.model = ctx.formData
        resolvedProps.rules ??= props.template.formConfig?.rules
        resolvedProps.layout ??= props.template.formConfig?.layout
        resolvedProps.labelWidth ??= props.template.formConfig?.labelWidth
      }

      // 解析事件
      const resolvedEvents: Record<string, Function> = {}
      if (node.events) {
        for (const [key, handler] of Object.entries(node.events)) {
          const eventKey = `on${key.charAt(0).toUpperCase()}${key.slice(1)}`
          resolvedEvents[eventKey] = createEventHandler(handler, ctx, trustLevel.value)
        }
      }

      if (modelField) {
        resolvedProps.modelValue = ctx.formData[modelField]
        resolvedEvents['onUpdate:modelValue'] = (value: any) => {
          ctx.formData[modelField] = value
        }
      }

      // 模板 DSL 使用 field，VFormItem 的实际属性名是 prop。
      if (node.type === 'form-item' && resolvedProps.field && resolvedProps.prop === undefined) {
        resolvedProps.prop = resolvedProps.field
      }

      // 解析样式
      const resolvedStyle = node.style ? resolvePropValue(node.style, { formData: ctx.formData, dataSources }, trustLevel.value) : undefined

      // 解析类名
      const resolvedClassName = node.className ? resolvePropValue(node.className, { formData: ctx.formData, dataSources }, trustLevel.value) : undefined

      // 本节点是不是一块布局容器；是的话它自己要挂容器类名与 CSS 变量
      const layoutMode = modeOf(node)
      const isLayoutContainer = layoutMode !== 'flow'
      const containerClass = isLayoutContainer
        ? [resolvedClassName, LAYOUT_CONTAINER_CLASS[layoutMode]].filter(Boolean)
        : resolvedClassName
      const containerStyle = isLayoutContainer
        ? { ...(resolvedStyle as Record<string, unknown> | undefined), ...containerVars(layoutMode, canvas.value) }
        : resolvedStyle

      // 获取组件
      const component = props.config.componentMap?.[node.type] || builtinComponents[node.type]
      
      // 自定义渲染器
      if (props.config.customRenderers?.[node.type]) {
        return props.config.customRenderers[node.type](node, ctx)
      }

      // 如果找不到组件，使用div
      const Component = component || 'div'

      // 渲染子节点
      let children: any = undefined
      if (node.slots) {
        children = {}
        for (const [slotName, slotNodes] of Object.entries(node.slots)) {
          children[slotName] = () => slotNodes.map(child => renderNode(child, ctx)).filter(Boolean)
        }
      } else if (node.children) {
        const field = node.type === 'form-item' ? resolvedProps.field as string | undefined : undefined
        const renderedChildren = node.children
          .map((child, index) => {
            const vnode = renderNode(child, ctx, index === 0 ? field : undefined)
            if (!vnode) return null
            // 布局容器的直接子节点，每个都要套一层定位包裹
            return isLayoutContainer ? wrapInCell(child, layoutMode, vnode) : vnode
          })
          .filter(Boolean)
        children = typeof Component === 'string'
          ? renderedChildren
          : { default: () => renderedChildren }
      }

      // 叶子节点可直接通过 text/content 声明显示文字。
      if (children === undefined && (resolvedProps.text !== undefined || resolvedProps.content !== undefined)) {
        const text = String(resolvedProps.text ?? resolvedProps.content)
        children = typeof Component === 'string' ? text : { default: () => text }
      }

      return h(
        Component,
        {
          ...resolvedProps,
          ...resolvedEvents,
          style: containerStyle,
          class: containerClass,
          ref: (el: any) => {
            if (node.id) {
              refs.value[node.id] = el
            }
          }
        },
        children
      )
    }

    return () => {
      if (!templateValidation.value.valid) {
        return h('div', { class: ['vui-alert', 'is-error'], role: 'alert' },
          templateValidation.value.diagnostics.map(item => `${item.code}: ${item.message}`).join('；'))
      }
      const root = props.template.root
      if (!root) return null
      
      // 如果根节点是form，包装表单配置
      if (root.type === 'form') {
        return renderNode(root)
      }
      
      // 否则渲染为div
      const rootNode = renderNode(root)
      return h('div', { class: 'vui-template-container' }, rootNode || undefined)
    }
  }
})

// ==================== 表单模板渲染器 ====================

/** 表单模板渲染器 */
export const FormTemplateRenderer = defineComponent({
  name: 'FormTemplateRenderer',
  props: {
    template: { type: Object as PropType<Template>, required: true },
    modelValue: { type: Object as PropType<Record<string, any>>, default: () => ({}) },
    readonly: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'submit', 'validate', 'reset'],
  setup(props, { emit, expose }) {
    const rendererRef = ref()

    expose({
      submit: () => rendererRef.value?.submit(),
      validate: () => rendererRef.value?.validate(),
      reset: () => rendererRef.value?.reset(),
      getFormData: () => rendererRef.value?.getFormData(),
      setFormData: (data: Record<string, any>) => rendererRef.value?.setFormData(data)
    })

    return () => h(TemplateRenderer, {
      ref: rendererRef,
      template: props.template,
      modelValue: props.modelValue,
      'onUpdate:modelValue': (val: any) => emit('update:modelValue', val),
      onSubmit: (data: any) => emit('submit', data),
      onValidate: (valid: boolean, error?: unknown) => emit('validate', valid, error),
      onReset: () => emit('reset')
    })
  }
})

// ==================== 卡片模板渲染器 ====================

/** 卡片模板渲染器 */
export const CardTemplateRenderer = defineComponent({
  name: 'CardTemplateRenderer',
  props: {
    template: { type: Object as PropType<Template>, required: true },
    data: { type: Object as PropType<Record<string, any>>, default: () => ({}) }
  },
  setup(props) {
    return () => h(TemplateRenderer, {
      template: props.template,
      globalData: props.data,
      preview: true
    })
  }
})

export default TemplateRenderer
