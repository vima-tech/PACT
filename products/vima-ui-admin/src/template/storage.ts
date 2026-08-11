/**
 * @vima-tech/ui-admin · 模板存储层
 *
 * 提供模板的持久化存储和AI接口
 */

import type { Template, TemplateStorage, ListOptions, AIRequest, AIResponse } from './types'
import { createTemplateId } from './id'
import { assertValidTemplate, validateTemplate, type TemplateValidationOptions } from './validate'

// ==================== LocalStorage 存储实现 ====================

const STORAGE_PREFIX = 'vui-template:'

/**
 * LocalStorage 存储实现
 */
export class LocalTemplateStorage implements TemplateStorage {
  private prefix: string
  private validationOptions: TemplateValidationOptions

  constructor(prefix: string = STORAGE_PREFIX, validationOptions: TemplateValidationOptions = {}) {
    this.prefix = prefix
    this.validationOptions = validationOptions
  }

  async save(template: Template): Promise<void> {
    try {
      assertValidTemplate(template, this.validationOptions)
      template.updatedAt = new Date().toISOString()
      if (!template.createdAt) {
        template.createdAt = template.updatedAt
      }
      localStorage.setItem(
        `${this.prefix}${template.id}`,
        JSON.stringify(template)
      )
    } catch (error: any) {
      throw new Error(`保存模板失败: ${error.message}`)
    }
  }

  async load(id: string): Promise<Template | null> {
    try {
      const data = localStorage.getItem(`${this.prefix}${id}`)
      if (!data) return null
      const template = JSON.parse(data)
      assertValidTemplate(template, this.validationOptions)
      return template
    } catch (error: any) {
      throw new Error(`加载模板失败: ${error.message}`)
    }
  }

  async list(options?: ListOptions): Promise<Template[]> {
    try {
      const templates: Template[] = []
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix))
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const template = JSON.parse(data)
            assertValidTemplate(template, this.validationOptions)
            templates.push(template)
          }
        } catch {
          // 忽略解析失败的项
        }
      }

      // 筛选
      let filtered = templates
      if (options?.keyword) {
        const keyword = options.keyword.toLowerCase()
        filtered = filtered.filter(t => 
          t.name.toLowerCase().includes(keyword) ||
          t.description?.toLowerCase().includes(keyword) ||
          t.tags?.some(tag => tag.toLowerCase().includes(keyword))
        )
      }
      if (options?.type) {
        filtered = filtered.filter(t => t.type === options.type)
      }
      if (options?.tags?.length) {
        filtered = filtered.filter(t => 
          t.tags?.some(tag => options.tags!.includes(tag))
        )
      }

      // 排序
      const sortBy = options?.sortBy || 'updatedAt'
      const sortOrder = options?.sortOrder || 'desc'
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortBy] || ''
        const bVal = (b as any)[sortBy] || ''
        return sortOrder === 'asc' 
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      })

      // 分页
      const page = options?.page || 1
      const pageSize = options?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize

      return filtered.slice(start, end)
    } catch (error: any) {
      throw new Error(`列出模板失败: ${error.message}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.prefix}${id}`)
    } catch (error: any) {
      throw new Error(`删除模板失败: ${error.message}`)
    }
  }

  async export(id: string): Promise<string> {
    const template = await this.load(id)
    if (!template) {
      throw new Error(`模板不存在: ${id}`)
    }
    return JSON.stringify(template, null, 2)
  }

  async import(data: string): Promise<Template> {
    try {
      const template = JSON.parse(data) as Template
      if (!template.id || !template.name || !template.root) {
        throw new Error('无效的模板格式')
      }
      // 生成新ID避免冲突
      template.id = `imported-${createTemplateId()}`
      template.createdAt = new Date().toISOString()
      template.updatedAt = template.createdAt
      await this.save(template)
      return template
    } catch (error: any) {
      throw new Error(`导入模板失败: ${error.message}`)
    }
  }

  /**
   * 清空所有模板
   */
  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix))
    keys.forEach(key => localStorage.removeItem(key))
  }

  /**
   * 获取存储大小
   */
  getSize(): number {
    let size = 0
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix))
    keys.forEach(key => {
      const data = localStorage.getItem(key)
      if (data) size += data.length
    })
    return size
  }
}

// ==================== API 存储实现 ====================

interface ApiStorageConfig {
  baseUrl: string
  headers?: Record<string, string>
  validation?: TemplateValidationOptions
}

/**
 * API 存储实现
 */
export class ApiTemplateStorage implements TemplateStorage {
  private config: ApiStorageConfig

  constructor(config: ApiStorageConfig) {
    this.config = config
  }

  private async request(path: string, options?: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...options?.headers
      }
    })
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async save(template: Template): Promise<void> {
    assertValidTemplate(template, this.config.validation)
    await this.request(`/templates/${template.id}`, {
      method: 'PUT',
      body: JSON.stringify(template)
    })
  }

  async load(id: string): Promise<Template | null> {
    try {
      const template = await this.request(`/templates/${id}`)
      assertValidTemplate(template, this.config.validation)
      return template
    } catch {
      return null
    }
  }

  async list(options?: ListOptions): Promise<Template[]> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.pageSize) params.set('pageSize', String(options.pageSize))
    if (options?.keyword) params.set('keyword', options.keyword)
    if (options?.type) params.set('type', options.type)
    if (options?.tags) params.set('tags', options.tags.join(','))
    if (options?.sortBy) params.set('sortBy', options.sortBy)
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder)
    
    const templates = await this.request(`/templates?${params.toString()}`)
    if (!Array.isArray(templates)) throw new Error('API 返回的模板列表格式无效')
    templates.forEach((template) => assertValidTemplate(template, this.config.validation))
    return templates
  }

  async delete(id: string): Promise<void> {
    await this.request(`/templates/${id}`, { method: 'DELETE' })
  }

  async export(id: string): Promise<string> {
    const template = await this.load(id)
    return JSON.stringify(template, null, 2)
  }

  async import(data: string): Promise<Template> {
    const template = JSON.parse(data)
    assertValidTemplate(template, this.config.validation)
    const imported = await this.request('/templates/import', {
      method: 'POST',
      body: JSON.stringify(template)
    })
    assertValidTemplate(imported, this.config.validation)
    return imported
  }
}

// ==================== AI 接口层 ====================

/**
 * AI 模板服务
 */
export class AITemplateService {
  private storage: TemplateStorage
  private aiEndpoint?: string

  constructor(storage: TemplateStorage, aiEndpoint?: string) {
    this.storage = storage
    this.aiEndpoint = aiEndpoint
  }

  /**
   * 处理 AI 请求
   */
  async handleRequest(request: AIRequest): Promise<AIResponse> {
    try {
      switch (request.operation) {
        case 'create':
          return await this.createTemplate(request)
        case 'read':
          return await this.readTemplate(request)
        case 'update':
          return await this.updateTemplate(request)
        case 'delete':
          return await this.deleteTemplate(request)
        case 'generate':
          return await this.generateTemplate(request)
        case 'transform':
          return await this.transformTemplate(request)
        default:
          throw new Error(`未知的操作类型: ${request.operation}`)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code || 'AI_TEMPLATE_REQUEST_FAILED',
        diagnostics: error.diagnostics
      }
    }
  }

  /**
   * 创建模板
   */
  private async createTemplate(request: AIRequest): Promise<AIResponse> {
    if (!request.template) {
      throw new Error('缺少模板数据')
    }
    const template = request.template as Template
    template.id = template.id || `ai-${Date.now()}`
    template.createdAt = new Date().toISOString()
    template.updatedAt = template.createdAt
    const validation = validateTemplate(template)
    if (!validation.valid) {
      return {
        success: false,
        code: 'TEMPLATE_VALIDATION_FAILED',
        error: '模板未通过结构或安全校验',
        diagnostics: validation.diagnostics
      }
    }
    await this.storage.save(template)
    return { success: true, template }
  }

  /**
   * 读取模板
   */
  private async readTemplate(request: AIRequest): Promise<AIResponse> {
    if (!request.templateId) {
      throw new Error('缺少模板ID')
    }
    const template = await this.storage.load(request.templateId)
    if (!template) {
      throw new Error(`模板不存在: ${request.templateId}`)
    }
    return { success: true, template }
  }

  /**
   * 更新模板
   */
  private async updateTemplate(request: AIRequest): Promise<AIResponse> {
    if (!request.templateId || !request.template) {
      throw new Error('缺少模板ID或数据')
    }
    const existing = await this.storage.load(request.templateId)
    if (!existing) {
      throw new Error(`模板不存在: ${request.templateId}`)
    }
    const updated = { ...existing, ...request.template, id: request.templateId }
    updated.updatedAt = new Date().toISOString()
    const validation = validateTemplate(updated)
    if (!validation.valid) {
      return {
        success: false,
        code: 'TEMPLATE_VALIDATION_FAILED',
        error: '模板未通过结构或安全校验',
        diagnostics: validation.diagnostics
      }
    }
    await this.storage.save(updated)
    return { success: true, template: updated }
  }

  /**
   * 删除模板
   */
  private async deleteTemplate(request: AIRequest): Promise<AIResponse> {
    if (!request.templateId) {
      throw new Error('缺少模板ID')
    }
    await this.storage.delete(request.templateId)
    return { success: true }
  }

  /**
   * AI 生成模板
   */
  private async generateTemplate(request: AIRequest): Promise<AIResponse> {
    if (!request.prompt) {
      throw new Error('缺少生成提示')
    }

    if (!this.aiEndpoint) {
      return {
        success: false,
        code: 'AI_ENDPOINT_NOT_CONFIGURED',
        error: '未配置 AI 模板生成端点'
      }
    }
    const response = await fetch(this.aiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt, params: request.params })
    })
    if (!response.ok) {
      return {
        success: false,
        code: 'AI_ENDPOINT_ERROR',
        error: `AI 模板端点请求失败: ${response.status}`
      }
    }
    const result = await response.json()
    const validation = validateTemplate(result.template)
    if (!validation.valid) {
      return {
        success: false,
        code: 'TEMPLATE_VALIDATION_FAILED',
        error: 'AI 返回的模板未通过结构或安全校验',
        diagnostics: validation.diagnostics
      }
    }
    await this.storage.save(result.template)
    return { success: true, template: result.template }
  }

  /**
   * 转换模板
   */
  private async transformTemplate(request: AIRequest): Promise<AIResponse> {
    return {
      success: false,
      code: 'UNSUPPORTED_OPERATION',
      error: `模板转换尚未实现${request.target ? `: ${request.target}` : ''}`
    }
  }

  /**
   * 列出所有模板
   */
  async listTemplates(options?: ListOptions): Promise<Template[]> {
    return this.storage.list(options)
  }

  /**
   * 导出模板
   */
  async exportTemplate(id: string): Promise<string> {
    return this.storage.export(id)
  }

  /**
   * 导入模板
   */
  async importTemplate(data: string): Promise<Template> {
    return this.storage.import(data)
  }
}

// ==================== 默认实例 ====================

/** 默认本地存储实例 */
export const defaultStorage = new LocalTemplateStorage()

/** 默认 AI 服务实例 */
export const defaultAIService = new AITemplateService(defaultStorage)

export default {
  LocalTemplateStorage,
  ApiTemplateStorage,
  AITemplateService,
  defaultStorage,
  defaultAIService
}
