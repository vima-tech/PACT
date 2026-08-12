#!/usr/bin/env node
// @pact R034,R040,R042
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableJson } from '../lib/core.mjs';
import { uninstallAgentSkills } from '../lib/agent-skills.mjs';
import { loadInstallManifest } from '../lib/install-manifest.mjs';

if (process.env.npm_config_global === 'true' || process.env.npm_config_global === '1') {
  const packageRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  try {
    const manifest = await loadInstallManifest(packageRoot);
    const result = await uninstallAgentSkills({ packageVersion: manifest.version });
    process.stdout.write(stableJson({ ok: !result.conflicts.length, command: 'preuninstall', version: manifest.version, status: result.conflicts.length ? 'conflict' : 'ready', changes: result.changes, agents: [], diagnostics: result.conflicts.map((item) => ({ code: 'E_SKILL_CONFLICT', path: `${item.agent}/${item.name}`, message: '已保留修改后目标' })) }));
  } catch (reason) {
    process.stdout.write(stableJson({ ok: false, command: 'preuninstall', version: 'unknown', status: 'conflict', changes: 0, agents: [], diagnostics: [{ code: reason.code || 'E_INSTALL_IO', path: reason.path || '$', message: reason.message }] }));
    process.stderr.write('PACT 安全卸载未收敛；重装后运行 pact uninstall --apply --recover。\n');
  }
}
