/**
 * @vima-tech/ui-admin · 模板编辑器
 *
 * 可视化拖拽编辑器核心逻辑
 */

import { defineComponent, h, ref, reactive, computed, watch, onMounted, provide, inject, type PropType, type VNode, type Ref } from 'vue'
import { createTemplateId } from './id'
import type { 
  Template, TemplateNode, ComponentType, 
  EditorState, EditorMode, ComponentPanelItem,
  PropConfigItem, TemplateType
} from './types'
import { TemplateRenderer } from './renderer'

// ==================== 编辑器上下文 ====================

const EDITOR_KEY = Symbol('TemplateEditor')

interface EditorContext {
  state: EditorState
  template: Ref<Template>
  selectedNode: Ref<TemplateNode | null>
  addNode: (type: ComponentType, parentId?: string, position?: number) => TemplateNode
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, targetParentId: string, position: number) => void
  updateNode: (nodeId: string, updates: Partial<TemplateNode>) => void
  selectNode: (nodeId: string | null) => void
  duplicateNode: (nodeId: string) => TemplateNode | null
  undo: () => void
  redo: () => void
  saveHistory: () => void
}

// ==================== 组件面板配置 ====================

/** 组件面板分类 */
export const COMPONENT_CATEGORIES = [
  {
    name: '布局',
    icon: 'layout',
    components: [
      { type: 'container', label: '容器', icon: 'package', description: '通用容器' },
      { type: 'row', label: '行', icon: 'layout', description: '行布局' },
      { type: 'col', label: '列', icon: 'layout', description: '列布局' },
      { type: 'card', label: '卡片', icon: 'app', description: '卡片容器' },
      { type: 'divider', label: '分割线', icon: 'divider', description: '分割线' }
    ]
  },
  {
    name: '表单',
    icon: 'form',
    components: [
      { type: 'form', label: '表单', icon: 'form', description: '表单容器' },
      { type: 'form-item', label: '表单项', icon: 'file-text', description: '表单项' },
      { type: 'input', label: '输入框', icon: 'edit', description: '文本输入' },
      { type: 'input-number', label: '数字输入', icon: 'text', description: '数字输入' },
      { type: 'select', label: '选择器', icon: 'chevron-down', description: '下拉选择' },
      { type: 'switch', label: '开关', icon: 'button', description: '开关选择' },
      { type: 'radio', label: '单选', icon: 'circle', description: '单选框' },
      { type: 'radio-group', label: '单选组', icon: 'circle', description: '单选组' },
      { type: 'checkbox', label: '多选', icon: 'check-circle', description: '多选框' },
      { type: 'checkbox-group', label: '多选组', icon: 'check-circle', description: '多选组' },
      { type: 'datepicker', label: '日期选择', icon: 'app', description: '日期选择器' },
      { type: 'timepicker', label: '时间选择', icon: 'circle', description: '时间选择器' },
      { type: 'textarea', label: '文本域', icon: 'text', description: '多行文本' },
      { type: 'tag-input', label: '标签输入', icon: 'tag', description: '标签集合输入' },
      { type: 'upload', label: '上传', icon: 'upload', description: '文件上传' }
    ]
  },
  {
    name: '数据展示',
    icon: 'chart-bar',
    components: [
      { type: 'icon', label: '图标', icon: 'circle', description: '统一 SVG 图标' },
      { type: 'text', label: '文本', icon: 'text', description: '文本内容' },
      { type: 'table', label: '表格', icon: 'table', description: '数据表格' },
      { type: 'pagination', label: '分页', icon: 'more-vertical', description: '分页导航' },
      { type: 'tag', label: '标签', icon: 'file-text', description: '标签' },
      { type: 'badge', label: '徽标', icon: 'circle', description: '徽标' },
      { type: 'progress', label: '进度条', icon: 'chart-bar', description: '进度条' },
      { type: 'statistic', label: '统计', icon: 'chart-bar', description: '统计数值' },
      { type: 'descriptions', label: '描述列表', icon: 'file-text', description: '描述列表' },
      { type: 'descriptions-item', label: '描述项', icon: 'file-text', description: '描述列表条目' },
      { type: 'tree', label: '树', icon: 'layout', description: '树形控件' }
    ]
  },
  {
    name: '反馈',
    icon: 'info',
    components: [
      { type: 'alert', label: '警告提示', icon: 'alert', description: '警告提示' },
      { type: 'empty', label: '空状态', icon: 'package', description: '空数据提示' },
      { type: 'loading', label: '加载', icon: 'refresh', description: '加载状态' },
      { type: 'tooltip', label: '文字提示', icon: 'info', description: '文字提示' },
      { type: 'popover', label: '气泡卡片', icon: 'info', description: '气泡卡片' }
    ]
  },
  {
    name: '操作',
    icon: 'settings',
    components: [
      { type: 'button', label: '按钮', icon: 'button', description: '按钮' },
      { type: 'button-group', label: '按钮组', icon: 'button', description: '按钮组' },
      { type: 'link', label: '链接', icon: 'link', description: '链接' },
      { type: 'dropdown', label: '下拉菜单', icon: 'chevron-down', description: '下拉菜单' }
    ]
  }
]

/** 组件属性配置 */
export const COMPONENT_PROPS_CONFIG: Record<ComponentType, PropConfigItem[]> = {
  container: [],
  row: [
    { name: 'gutter', label: '间距', type: 'number', defaultValue: 16 },
    { name: 'justify', label: '水平对齐', type: 'select', options: [
      { label: '左对齐', value: 'start' },
      { label: '居中', value: 'center' },
      { label: '右对齐', value: 'end' },
      { label: '两端对齐', value: 'space-between' },
      { label: '分散对齐', value: 'space-around' }
    ]},
    { name: 'align', label: '垂直对齐', type: 'select', options: [
      { label: '顶部', value: 'top' },
      { label: '居中', value: 'middle' },
      { label: '底部', value: 'bottom' }
    ]}
  ],
  col: [
    { name: 'span', label: '栅格数', type: 'number', defaultValue: 12 },
    { name: 'offset', label: '偏移', type: 'number', defaultValue: 0 }
  ],
  card: [
    { name: 'title', label: '标题', type: 'string' },
    { name: 'shadow', label: '阴影', type: 'select', options: [
      { label: '总是显示', value: 'always' },
      { label: '悬停显示', value: 'hover' },
      { label: '从不显示', value: 'never' }
    ]}
  ],
  divider: [
    { name: 'direction', label: '方向', type: 'select', options: [
      { label: '水平', value: 'horizontal' },
      { label: '垂直', value: 'vertical' }
    ]},
    { name: 'contentPosition', label: '内容位置', type: 'select', options: [
      { label: '左', value: 'left' },
      { label: '中', value: 'center' },
      { label: '右', value: 'right' }
    ]}
  ],
  form: [
    { name: 'layout', label: '布局', type: 'select', options: [
      { label: '水平', value: 'horizontal' },
      { label: '垂直', value: 'vertical' },
      { label: '行内', value: 'inline' }
    ]},
    { name: 'labelWidth', label: '标签宽度', type: 'string' }
  ],
  'form-item': [
    { name: 'label', label: '标签', type: 'string' },
    { name: 'field', label: '字段名', type: 'string' },
    { name: 'required', label: '必填', type: 'boolean', defaultValue: false }
  ],
  input: [
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '文本', value: 'text' },
      { label: '密码', value: 'password' },
      { label: '邮箱', value: 'email' },
      { label: '手机号', value: 'tel' }
    ]},
    { name: 'placeholder', label: '占位符', type: 'string' },
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false },
    { name: 'clearable', label: '可清空', type: 'boolean', defaultValue: false },
    { name: 'prefix', label: '前缀', type: 'string' },
    { name: 'suffix', label: '后缀', type: 'string' }
  ],
  'input-number': [
    { name: 'min', label: '最小值', type: 'number' },
    { name: 'max', label: '最大值', type: 'number' },
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false }
  ],
  select: [
    { name: 'placeholder', label: '占位符', type: 'string' },
    { name: 'multiple', label: '多选', type: 'boolean', defaultValue: false },
    { name: 'clearable', label: '可清空', type: 'boolean', defaultValue: false },
    { name: 'options', label: '选项', type: 'json' }
  ],
  switch: [
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false }
  ],
  radio: [
    { name: 'value', label: '值', type: 'string' },
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false }
  ],
  'radio-group': [
    { name: 'options', label: '选项', type: 'json' }
  ],
  checkbox: [
    { name: 'value', label: '值', type: 'string' },
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false }
  ],
  'checkbox-group': [
    { name: 'options', label: '选项', type: 'json' }
  ],
  datepicker: [
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '日期', value: 'date' },
      { label: '日期时间', value: 'datetime' }
    ]},
    { name: 'placeholder', label: '占位符', type: 'string' },
    { name: 'range', label: '日期范围', type: 'boolean', defaultValue: false },
    { name: 'allowClear', label: '可清空', type: 'boolean', defaultValue: false }
  ],
  timepicker: [
    { name: 'min', label: '最早时间', type: 'string' },
    { name: 'max', label: '最晚时间', type: 'string' },
    { name: 'step', label: '步长秒数', type: 'number', defaultValue: 60 },
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false },
    { name: 'readonly', label: '只读', type: 'boolean', defaultValue: false },
    { name: 'clearable', label: '可清空', type: 'boolean', defaultValue: true }
  ],
  textarea: [
    { name: 'placeholder', label: '占位符', type: 'string' },
    { name: 'rows', label: '行数', type: 'number', defaultValue: 3 },
    { name: 'autosize', label: '自适应高度', type: 'boolean', defaultValue: false }
  ],
  'tag-input': [
    { name: 'allowClear', label: '可清空', type: 'boolean', defaultValue: false },
    { name: 'disabledInput', label: '禁止新增', type: 'boolean', defaultValue: false },
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false }
  ],
  upload: [
    { name: 'url', label: '上传地址', type: 'string' },
    { name: 'accept', label: '接受类型', type: 'string' },
    { name: 'multiple', label: '多选', type: 'boolean', defaultValue: false }
  ],
  icon: [
    { name: 'name', label: '图标名称', type: 'string' },
    { name: 'size', label: '尺寸', type: 'string', defaultValue: '1em' },
    { name: 'title', label: '可访问标题', type: 'string' }
  ],
  text: [
    { name: 'content', label: '内容', type: 'string', defaultValue: '文本内容' }
  ],
  table: [
    { name: 'columns', label: '列配置', type: 'json' }
  ],
  pagination: [
    { name: 'current', label: '当前页', type: 'number', defaultValue: 1 },
    { name: 'pageSize', label: '每页条数', type: 'number', defaultValue: 10 },
    { name: 'total', label: '总条数', type: 'number', defaultValue: 0 }
  ],
  tag: [
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '默认', value: '' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '危险', value: 'danger' },
      { label: '信息', value: 'info' }
    ]},
    { name: 'closable', label: '可关闭', type: 'boolean', defaultValue: false }
  ],
  badge: [
    { name: 'value', label: '值', type: 'string' },
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '主要', value: 'primary' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '危险', value: 'danger' },
      { label: '信息', value: 'info' }
    ]}
  ],
  progress: [
    { name: 'percent', label: '百分比', type: 'number' },
    { name: 'status', label: '状态', type: 'select', options: [
      { label: '正常', value: '' },
      { label: '成功', value: 'success' },
      { label: '异常', value: 'exception' }
    ]}
  ],
  statistic: [
    { name: 'title', label: '标题', type: 'string' },
    { name: 'value', label: '值', type: 'string' },
    { name: 'prefix', label: '前缀', type: 'string' },
    { name: 'suffix', label: '后缀', type: 'string' }
  ],
  descriptions: [
    { name: 'title', label: '标题', type: 'string' },
    { name: 'column', label: '列数', type: 'number', defaultValue: 3 },
    { name: 'border', label: '边框', type: 'boolean', defaultValue: false }
  ],
  'descriptions-item': [
    { name: 'label', label: '标签', type: 'string' },
    { name: 'span', label: '占列数', type: 'number', defaultValue: 1 }
  ],
  tree: [
    { name: 'data', label: '数据', type: 'json' },
    { name: 'showCheckbox', label: '显示复选框', type: 'boolean', defaultValue: false }
  ],
  alert: [
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '信息', value: 'info' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '错误', value: 'error' }
    ]},
    { name: 'title', label: '标题', type: 'string' },
    { name: 'description', label: '描述', type: 'string' },
    { name: 'closable', label: '可关闭', type: 'boolean', defaultValue: true }
  ],
  empty: [
    { name: 'description', label: '描述', type: 'string' }
  ],
  loading: [
    { name: 'text', label: '提示', type: 'string' },
    { name: 'fullscreen', label: '全屏', type: 'boolean', defaultValue: false }
  ],
  message: [],
  modal: [],
  drawer: [],
  tooltip: [
    { name: 'content', label: '内容', type: 'string' },
    { name: 'placement', label: '位置', type: 'select', options: [
      { label: '上', value: 'top' },
      { label: '下', value: 'bottom' },
      { label: '左', value: 'left' },
      { label: '右', value: 'right' }
    ]}
  ],
  popover: [
    { name: 'title', label: '标题', type: 'string' },
    { name: 'content', label: '内容', type: 'string' },
    { name: 'trigger', label: '触发方式', type: 'select', options: [
      { label: '点击', value: 'click' },
      { label: '悬停', value: 'hover' }
    ]}
  ],
  button: [
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '默认', value: 'default' },
      { label: '主要', value: 'primary' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '危险', value: 'danger' },
      { label: '信息', value: 'info' },
      { label: '文字', value: 'text' }
    ]},
    { name: 'size', label: '尺寸', type: 'select', options: [
      { label: '大', value: 'large' },
      { label: '中', value: 'default' },
      { label: '小', value: 'small' }
    ]},
    { name: 'disabled', label: '禁用', type: 'boolean', defaultValue: false },
    { name: 'loading', label: '加载中', type: 'boolean', defaultValue: false }
  ],
  'button-group': [],
  link: [
    { name: 'type', label: '类型', type: 'select', options: [
      { label: '默认', value: '' },
      { label: '主要', value: 'primary' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '危险', value: 'danger' },
      { label: '信息', value: 'info' }
    ]},
    { name: 'href', label: '链接', type: 'string' },
    { name: 'target', label: '打开方式', type: 'select', options: [
      { label: '当前窗口', value: '_self' },
      { label: '新窗口', value: '_blank' }
    ]}
  ],
  dropdown: [
    { name: 'placement', label: '展开方向', type: 'select', options: [
      { label: '底部左侧', value: 'bottom-start' },
      { label: '底部右侧', value: 'bottom-end' }
    ]}
  ],
  custom: []
} as Record<ComponentType, PropConfigItem[]>

// ==================== 工具函数 ====================

/**
 * 创建空模板
 */
export function createEmptyTemplate(type: TemplateType, name: string): Template {
  const id = createTemplateId()
  
  const rootTemplates: Record<TemplateType, TemplateNode> = {
    form: {
      id: createTemplateId(),
      type: 'form',
      props: { layout: 'vertical', labelWidth: '100px' },
      children: [],
      meta: { label: '表单', icon: 'form' }
    },
    card: {
      id: createTemplateId(),
      type: 'card',
      props: { title: name },
      children: [],
      meta: { label: '卡片', icon: 'app' }
    },
    list: {
      id: createTemplateId(),
      type: 'container',
      children: [],
      meta: { label: '列表容器', icon: 'package' }
    },
    page: {
      id: createTemplateId(),
      type: 'container',
      children: [],
      meta: { label: '页面', icon: 'file' }
    },
    custom: {
      id: createTemplateId(),
      type: 'container',
      children: [],
      meta: { label: '自定义', icon: 'settings' }
    }
  }

  return {
    id,
    name,
    type,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    root: rootTemplates[type],
    formConfig: type === 'form' ? {
      layout: 'vertical',
      labelWidth: '100px'
    } : undefined
  }
}

/**
 * 创建节点
 */
export function createNode(type: ComponentType, props?: Record<string, any>): TemplateNode {
  const defaultProps = COMPONENT_PROPS_CONFIG[type]?.reduce((acc, item) => {
    if (item.defaultValue !== undefined) acc[item.name] = item.defaultValue
    return acc
  }, {} as Record<string, any>) || {}
  const panelItem = COMPONENT_CATEGORIES.flatMap(c => c.components).find(c => c.type === type)
  const defaultChildren = type === 'form-item' ? [createNode('input')] : []

  return {
    id: createTemplateId(),
    type,
    props: { ...defaultProps, ...props },
    children: defaultChildren,
    meta: {
      label: panelItem?.label || type,
      icon: panelItem?.icon
    }
  }
}

/**
 * 在树中查找节点
 */
export function findNode(root: TemplateNode, nodeId: string): TemplateNode | null {
  if (root.id === nodeId) return root
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, nodeId)
      if (found) return found
    }
  }
  if (root.slots) {
    for (const nodes of Object.values(root.slots)) {
      for (const child of nodes) {
        const found = findNode(child, nodeId)
        if (found) return found
      }
    }
  }
  return null
}

/**
 * 在树中查找父节点
 */
export function findParentNode(root: TemplateNode, nodeId: string): TemplateNode | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === nodeId) return root
      const found = findParentNode(child, nodeId)
      if (found) return found
    }
  }
  if (root.slots) {
    for (const nodes of Object.values(root.slots)) {
      for (const child of nodes) {
        if (child.id === nodeId) return root
        const found = findParentNode(child, nodeId)
        if (found) return found
      }
    }
  }
  return null
}

/**
 * 深拷贝节点
 */
export function cloneNode(node: TemplateNode, regenerateIds = false): TemplateNode {
  const clone = JSON.parse(JSON.stringify(node)) as TemplateNode
  if (regenerateIds) {
    const updateIds = (current: TemplateNode) => {
      current.id = createTemplateId()
      current.children?.forEach(updateIds)
      Object.values(current.slots || {}).flat().forEach(updateIds)
    }
    updateIds(clone)
  }
  return clone
}

/**
 * 导出模板为JSON
 */
export function exportTemplate(template: Template): string {
  return JSON.stringify(template, null, 2)
}

/**
 * 从JSON导入模板
 */
export function importTemplate(json: string): Template {
  try {
    const template = JSON.parse(json)
    // 验证基本结构
    if (!template.id || !template.name || !template.type || !template.root?.id || !template.root?.type) {
      throw new Error('无效的模板格式')
    }
    return template
  } catch (error: any) {
    throw new Error(`导入模板失败: ${error.message}`)
  }
}

export default {
  COMPONENT_CATEGORIES,
  COMPONENT_PROPS_CONFIG,
  createEmptyTemplate,
  createNode,
  findNode,
  findParentNode,
  cloneNode,
  exportTemplate,
  importTemplate
}
