/**
 * @vima-tech/ui-admin · AI友好型工具函数
 *
 * 为AI Agent提供更友好的API和错误提示
 */

// ==================== 智能默认值系统 ====================

interface FieldInference {
  type?: string
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  pattern?: string
  rows?: number
  options?: Array<{ value: any; label: string }>
}

/**
 * 根据字段名智能推断配置
 */
export function inferFieldConfig(fieldName: string, label?: string): FieldInference {
  const normalizedField = fieldName.toLowerCase()
  const normalizedLabel = (label || fieldName).toLowerCase()

  // 姓名相关
  if (/name|姓名|名称/.test(normalizedField) || /name|姓名|名称/.test(normalizedLabel)) {
    return {
      type: 'text',
      required: true,
      placeholder: `请输入${label || '姓名'}`,
      max: 50
    }
  }

  // 邮箱相关
  if (/email|邮箱|邮件/.test(normalizedField) || /email|邮箱|邮件/.test(normalizedLabel)) {
    return {
      type: 'email',
      required: true,
      placeholder: `请输入${label || '邮箱'}`,
      pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$'
    }
  }

  // 手机号相关
  if (/phone|mobile|手机|电话|手机号/.test(normalizedField) || /phone|mobile|手机|电话/.test(normalizedLabel)) {
    return {
      type: 'tel',
      required: true,
      placeholder: `请输入${label || '手机号'}`,
      pattern: '^1[3-9]\\d{9}$'
    }
  }

  // 密码相关
  if (/password|密码/.test(normalizedField) || /password|密码/.test(normalizedLabel)) {
    return {
      type: 'password',
      required: true,
      placeholder: `请输入${label || '密码'}`,
      min: 8,
      max: 20
    }
  }

  // 年龄相关
  if (/age|年龄/.test(normalizedField) || /age|年龄/.test(normalizedLabel)) {
    return {
      type: 'number',
      placeholder: `请输入${label || '年龄'}`,
      min: 0,
      max: 150
    }
  }

  // 地址相关
  if (/address|地址/.test(normalizedField) || /address|地址/.test(normalizedLabel)) {
    return {
      type: 'textarea',
      placeholder: `请输入${label || '详细地址'}`,
      rows: 3
    }
  }

  // 状态相关
  if (/status|状态/.test(normalizedField) || /status|状态/.test(normalizedLabel)) {
    return {
      type: 'select',
      placeholder: `请选择${label || '状态'}`,
      options: [
        { value: 'active', label: '启用' },
        { value: 'disabled', label: '禁用' }
      ]
    }
  }

  // 日期相关
  if (/date|时间|日期/.test(normalizedField) || /date|时间|日期/.test(normalizedLabel)) {
    return {
      type: 'date',
      placeholder: `请选择${label || '日期'}`
    }
  }

  // 默认配置
  return {
    type: 'text',
    placeholder: `请输入${label || '内容'}`
  }
}

// ==================== 错误处理系统 ====================

export interface UIErrorOptions {
  code: string
  component: string
  prop?: string
  received?: any
  expected?: any
  message: string
  suggestion?: string
  documentation?: string
}

export class UIError extends Error {
  code: string
  component: string
  prop?: string
  received?: any
  expected?: any
  suggestion?: string
  documentation?: string

  constructor(options: UIErrorOptions) {
    super(options.message)
    this.name = 'UIError'
    this.code = options.code
    this.component = options.component
    this.prop = options.prop
    this.received = options.received
    this.expected = options.expected
    this.suggestion = options.suggestion
    this.documentation = options.documentation
  }

  toJSON() {
    return {
      code: this.code,
      component: this.component,
      prop: this.prop,
      received: this.received,
      expected: this.expected,
      message: this.message,
      suggestion: this.suggestion,
      documentation: this.documentation
    }
  }
}

/**
 * 验证属性值
 */
export function validateProp(
  component: string,
  prop: string,
  value: any,
  validValues?: any[],
  type?: string
): void {
  // 检查类型
  if (type && typeof value !== type) {
    throw new UIError({
      code: 'INVALID_PROP_TYPE',
      component,
      prop,
      received: typeof value,
      expected: type,
      message: `${component}的${prop}属性类型错误`,
      suggestion: `期望类型为${type}，实际为${typeof value}`
    })
  }

  // 检查可选值
  if (validValues && !validValues.includes(value)) {
    throw new UIError({
      code: 'INVALID_PROP_VALUE',
      component,
      prop,
      received: value,
      expected: validValues,
      message: `${component}的${prop}属性值"${value}"无效`,
      suggestion: `可选值为: ${validValues.join(', ')}`
    })
  }
}

// ==================== 状态标准化 ====================

export interface StandardState<T> {
  value: T
  valid: boolean
  errors: ValidationError[]
  dirty: boolean
  touched: boolean
  pristine: boolean
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  rule?: string
}

/**
 * 创建标准化状态
 */
export function createStandardState<T>(initialValue: T): StandardState<T> {
  return {
    value: initialValue,
    valid: true,
    errors: [],
    dirty: false,
    touched: false,
    pristine: true
  }
}

// ==================== 代码生成辅助 ====================

export interface FieldConfig {
  name: string
  label: string
  type: string
  required?: boolean
  options?: Array<{ value: any; label: string }>
  width?: number
  slot?: string
}

/**
 * 生成表单代码
 */
export function generateFormCode(fields: FieldConfig[]): string {
  const imports = `import { ref, reactive } from 'vue'
import { VForm, VFormItem, VInput, VSelect, VDatePicker, VSwitch, VInputNumber } from "@vima-tech/ui-admin"`

  const template = `<template>
  <VForm :model="formData" :rules="rules" @submit="handleSubmit">
${fields.map(field => {
  const config = inferFieldConfig(field.name, field.label)
  const component = inferComponentName(config.type || 'text')
  return `    <VFormItem label="${field.label}" prop="${field.name}">
      <${component} v-model="formData.${field.name}"${config.required ? ' required' : ''} />
    </VFormItem>`
}).join('\n')}
    <VFormItem>
      <VButton mode="primary" type="submit">提交</VButton>
    </VFormItem>
  </VForm>
</template>`

  const script = `<script setup>
${imports}

const formData = reactive({
${fields.map(field => {
  const config = inferFieldConfig(field.name, field.label)
  return `  ${field.name}: ${getDefaultValue(config.type || 'text')}`
}).join(',\n')}
})

const rules = {
${fields.filter(field => {
  const config = inferFieldConfig(field.name, field.label)
  return config.required
}).map(field => `  ${field.name}: [{ required: true, message: '请输入${field.label}' }]`).join(',\n')}
}

const handleSubmit = () => {
  console.log('提交数据:', formData)
}
</script>`

  return `${template}\n\n${script}`
}

/**
 * 生成表格代码
 */
export function generateTableCode(columns: FieldConfig[]): string {
  const template = `<template>
  <VTable 
    :columns="columns" 
    :data-source="dataSource"
    :default-toolbar="true"
  >
${columns.filter(c => c.slot).map(c => `    <template #${c.slot}="{ row }">
      <!-- ${c.label}的自定义渲染 -->
      <span>{{ row.${c.name} }}</span>
    </template>`).join('\n')}
  </VTable>
</template>`

  const script = `<script setup>
import { ref } from 'vue'
import { VTable } from "@vima-tech/ui-admin"

const columns = [
${columns.map(c => `  { key: '${c.name}', title: '${c.label}', width: ${c.width || 120} }`).join(',\n')}
]

const dataSource = ref([])
</script>`

  return `${template}\n\n${script}`
}

// ==================== 辅助函数 ====================

function inferComponentName(type: string): string {
  const mapping: Record<string, string> = {
    'text': 'VInput',
    'email': 'VInput',
    'tel': 'VInput',
    'password': 'VInput',
    'number': 'VInputNumber',
    'textarea': 'VInput',
    'select': 'VSelect',
    'date': 'VDatePicker',
    'boolean': 'VSwitch'
  }
  return mapping[type] || 'VInput'
}

function getDefaultValue(type: string): string {
  const mapping: Record<string, string> = {
    'text': "''",
    'email': "''",
    'tel': "''",
    'password': "''",
    'number': '0',
    'textarea': "''",
    'select': "''",
    'date': "''",
    'boolean': 'false'
  }
  return mapping[type] || "''"
}

// ==================== 调试工具 ====================

export interface DebugInfo {
  component: string
  props: Record<string, any>
  state: any
  timestamp: number
}

const debugHistory: DebugInfo[] = []

/**
 * 记录组件调试信息
 */
export function logComponentDebug(component: string, props: Record<string, any>, state: any): void {
  debugHistory.push({
    component,
    props,
    state,
    timestamp: Date.now()
  })

  // 限制历史记录数量
  if (debugHistory.length > 100) {
    debugHistory.shift()
  }
}

/**
 * 获取调试历史
 */
export function getDebugHistory(): DebugInfo[] {
  return [...debugHistory]
}

/**
 * 清空调试历史
 */
export function clearDebugHistory(): void {
  debugHistory.length = 0
}

// ==================== 性能监控 ====================

export interface PerformanceMetric {
  component: string
  operation: 'render' | 'mount' | 'update'
  duration: number
  timestamp: number
}

const perfMetrics: PerformanceMetric[] = []

/**
 * 测量组件性能
 */
export function measurePerformance(
  component: string,
  operation: 'render' | 'mount' | 'update',
  fn: () => void
): number {
  const start = performance.now()
  fn()
  const duration = performance.now() - start

  perfMetrics.push({
    component,
    operation,
    duration,
    timestamp: Date.now()
  })

  return duration
}

/**
 * 获取性能指标
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...perfMetrics]
}

/**
 * 获取平均性能
 */
export function getAveragePerformance(component?: string): Record<string, number> {
  const filtered = component 
    ? perfMetrics.filter(m => m.component === component)
    : perfMetrics

  const grouped: Record<string, number[]> = {}
  for (const metric of filtered) {
    const key = `${metric.component}.${metric.operation}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(metric.duration)
  }

  const result: Record<string, number> = {}
  for (const [key, values] of Object.entries(grouped)) {
    result[key] = values.reduce((a, b) => a + b, 0) / values.length
  }

  return result
}
