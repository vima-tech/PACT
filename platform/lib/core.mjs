// @pact R001,R005,R007,R022
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

export class PlatformError extends Error {
  constructor(code, path, message, exitCode = 2) {
    super(message);
    this.code = code;
    this.path = path;
    this.exitCode = exitCode;
  }

  diagnostic() {
    return { code: this.code, path: this.path, message: this.message };
  }
}

export function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableJson(value, space = 2) {
  return `${JSON.stringify(stableValue(value), null, space)}\n`;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export function resolveInside(root, candidate) {
  const base = resolve(root);
  const target = resolve(base, candidate);
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new PlatformError('E_PATH_ESCAPE', candidate, '路径超出仓库边界', 6);
  }
  return target;
}

export function repoRoot(importMetaUrl) {
  return resolve(dirname(new URL(importMetaUrl).pathname), '../..');
}

