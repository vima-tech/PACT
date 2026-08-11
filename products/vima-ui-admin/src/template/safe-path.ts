const DATA_PATH = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** 不会进入 JavaScript 原型链的点分隔数据路径。 */
export function isSafeDataPath(path: string): boolean {
  const normalized = path.trim();
  return DATA_PATH.test(normalized)
    && normalized.split('.').every((segment) => !FORBIDDEN_SEGMENTS.has(segment));
}

/** 只沿对象自身属性读取，不继承访问器或原型成员。 */
export function readSafeDataPath(context: unknown, path: string): unknown {
  if (!isSafeDataPath(path)) return undefined;
  let current = context;
  for (const segment of path.trim().split('.')) {
    if ((typeof current !== 'object' && typeof current !== 'function') || current === null) return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function isSafeDataKey(key: string): boolean {
  return Boolean(key) && !FORBIDDEN_SEGMENTS.has(key);
}

export function isSafeDataIdentifier(key: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(key) && isSafeDataKey(key);
}

export function assignSafeRecord(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (isSafeDataKey(key)) target[key] = value;
  }
}
