let idSequence = 0

/** 生成无需外部依赖、适用于浏览器和 Node 的模板 ID。 */
export function createTemplateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID().replace(/-/g, '')
  }
  idSequence += 1
  return `${Date.now().toString(36)}${idSequence.toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
