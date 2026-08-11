/**
 * @vima-tech/ui-admin · 模板系统
 *
 * 自定义模板功能，支持可视化编辑和JSON存储
 */

// 导出类型
export type {
  // 基础类型
  ComponentType,
  PropValue,
  ComponentProps,
  Expression,
  EventHandler,
  // 模板节点
  TemplateNode,
  // 模板定义
  Template,
  TemplateType,
  DataSourceDefinition,
  FormConfig,
  StyleConfig,
  ScriptDefinition,
  // 布局与几何
  LayoutMode,
  BreakpointKey,
  Geometry,
  NodeLayout,
  CanvasConfig,
  // 编辑器相关
  EditorMode,
  EditorState,
  ComponentPanelItem,
  PropConfigItem,
  // 渲染器相关
  RenderContext,
  RendererConfig,
  // AI接口相关
  AIOperationType,
  AIRequest,
  AIResponse,
  UIDiagnostic,
  // 存储相关
  TemplateStorage,
  ListOptions
} from './types'

// 导出渲染器
export {
  TemplateRenderer,
  FormTemplateRenderer,
  CardTemplateRenderer,
  registerComponent,
  registerComponents
} from './renderer'

// 导出几何计算（纯函数，拖拽/缩放/吸附的算法层）
export {
  DEFAULT_CANVAS,
  BREAKPOINT_MIN_WIDTH,
  BREAKPOINTS_DESC,
  RESIZE_HANDLES,
  resolveCanvas,
  pickBreakpoint,
  resolveGridGeometry,
  clamp,
  clampGeometry,
  collides,
  findCollisions,
  resolveGridCollisions,
  compactGrid,
  gridHeight,
  colWidth,
  gridToPixel,
  pixelToGrid,
  pixelToGridDelta,
  snapPosition,
  snapResize,
  applyResizeDelta
} from './geometry'
export type { PlacedRect, SnapGuide, ResizeHandle } from './geometry'

// 导出可视化编辑器组件
export { VTemplateEditor } from './VTemplateEditor'

// 导出编辑器状态机（撤销重做 / 多选 / 剪贴板 / 几何提交）
export { createTemplateEditor } from './editor-state'
export type { TemplateEditor, TemplateEditorOptions, GeometryUpdateOptions } from './editor-state'

// 导出编辑器工具
export {
  COMPONENT_CATEGORIES,
  COMPONENT_PROPS_CONFIG,
  createEmptyTemplate,
  createNode,
  findNode,
  findParentNode,
  cloneNode,
  exportTemplate,
  importTemplate
} from './editor'

// 导出存储和AI服务
export {
  LocalTemplateStorage,
  ApiTemplateStorage,
  AITemplateService,
  defaultStorage,
  defaultAIService
} from './storage'

// 导出模板契约和验证
export {
  TEMPLATE_COMPONENT_NAMES,
  TEMPLATE_COMPONENT_TYPES,
  createTemplateComponentMap
} from './contracts'
export {
  assertValidTemplate,
  templateComponentName,
  validateTemplate
} from './validate'
export type {
  TemplateComponentContract,
  TemplateTrustLevel,
  TemplateValidationOptions,
  TemplateValidationResult
} from './validate'
