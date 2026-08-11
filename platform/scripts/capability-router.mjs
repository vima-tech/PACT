#!/usr/bin/env node
// @pact R003,R004,R005,R009
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeCapability } from '../lib/capability-router.mjs';
import { PlatformError, stableJson } from '../lib/core.mjs';
import { loadAndCheckGovernance } from '../lib/governance.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

async function inputText() {
  const index = process.argv.indexOf('--input');
  if (index >= 0) {
    const value = process.argv[index + 1];
    if (!value) throw new PlatformError('E_SCHEMA', 'argv.--input', '缺少 JSON 或文件路径', 2);
    if (value.trim().startsWith('{')) return value;
    return readFile(resolve(process.cwd(), value), 'utf8');
  }
  if (process.stdin.isTTY) throw new PlatformError('E_SCHEMA', '$', '请从 stdin 或 --input 提供 JSON', 2);
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

try {
  const input = JSON.parse(await inputText());
  const docs = await loadAndCheckGovernance(ROOT);
  const result = routeCapability(input, docs);
  process.stdout.write(stableJson(result));
  if (!result.ok) process.exitCode = result.diagnostics[0].code === 'E_CAPABILITY_BLOCKED' || result.diagnostics[0].code === 'E_COMPATIBILITY' ? 3 : 2;
} catch (error) {
  const diagnostic = error instanceof PlatformError
    ? error.diagnostic()
    : { code: 'E_SCHEMA', path: '$', message: error.message };
  process.stdout.write(stableJson({ ok: false, profile: null, selected: [], candidates: [], diagnostics: [diagnostic] }));
  process.exitCode = error.exitCode || 2;
}
