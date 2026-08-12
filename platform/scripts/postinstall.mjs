#!/usr/bin/env node
// @pact R031,R032,R034,R035,R042
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableJson } from '../lib/core.mjs';
import { aggregateReports, inspectAgentSkills, syncAgentSkills } from '../lib/agent-skills.mjs';
import { loadInstallManifest } from '../lib/install-manifest.mjs';

if (process.env.npm_config_global === 'true' || process.env.npm_config_global === '1') {
  const packageRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  try {
    const manifest = await loadInstallManifest(packageRoot);
    const changed = await syncAgentSkills({ packageRoot, manifest });
    const report = aggregateReports('postinstall', manifest.version, await inspectAgentSkills({ packageRoot, manifest }));
    report.changes = changed.reduce((sum, agent) => sum + agent.changes, 0);
    process.stdout.write(stableJson(report));
    if (!report.ok) process.stderr.write('PACT Skills 未全部就绪；运行 pact doctor 和 pact agent sync 修复。\n');
  } catch (reason) {
    const manifestBroken = reason.code === 'E_INSTALL_MANIFEST';
    const report = { ok: false, command: 'postinstall', version: 'unknown', status: manifestBroken ? 'manifest-broken' : 'error', changes: 0, agents: [], diagnostics: [{ code: reason.code || 'E_INSTALL_IO', path: reason.path || '$', message: reason.message }] };
    process.stdout.write(stableJson(report));
    if (manifestBroken) process.exitCode = 3;
    else process.stderr.write('PACT Skills 自动同步未完成；运行 pact doctor 和 pact agent sync 修复。\n');
  }
}
