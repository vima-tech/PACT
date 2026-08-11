#!/usr/bin/env node
// @pact R020,R021,R022,R023
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, resolveInside, stableJson } from '../lib/core.mjs';
import { loadAndCheckGovernance } from '../lib/governance.mjs';
import { collectGitChangedPaths, planRelease } from '../lib/release-plan.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const flag = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };

try {
  const base = flag('--base');
  const docs = await loadAndCheckGovernance(ROOT);
  const plan = planRelease(collectGitChangedPaths(base, ROOT), docs['release-units'].units, base);
  const jsonPath = flag('--json');
  if (jsonPath) {
    const output = resolveInside(ROOT, jsonPath);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, stableJson(plan));
  }
  process.stdout.write(stableJson(plan));
  process.stderr.write(`直接发布：${plan.directReleaseUnits.join(', ') || '无'}；验证：${plan.verificationUnits.join(', ') || '无'}\n`);
} catch (error) {
  const diagnostic = error instanceof PlatformError ? error.diagnostic() : { code: 'E_COMMAND_FAILED', path: '$', message: error.message };
  process.stdout.write(stableJson({ ok: false, diagnostics: [diagnostic] }));
  process.exitCode = error.exitCode || 1;
}
