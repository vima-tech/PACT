#!/usr/bin/env node
// @pact R029,R031,R033,R035,R038,R039,R040
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, stableJson } from '../platform/lib/core.mjs';
import { loadInstallManifest } from '../platform/lib/install-manifest.mjs';
import {
  adoptAgentSkill, aggregateReports, inspectAgentSkills, removeAgentSkills, reportExitCode,
  syncAgentSkills, unadoptAgentSkill, uninstallAgentSkills
} from '../platform/lib/agent-skills.mjs';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const json = args.includes('--json');
const cleanArgs = args.filter((arg) => arg !== '--json');

function supportedRuntime() {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (!['linux', 'darwin'].includes(process.platform)) throw new PlatformError('E_UNSUPPORTED_PLATFORM', 'process.platform', `不支持平台 ${process.platform}`, 4);
  if (nodeMajor < 20) throw new PlatformError('E_UNSUPPORTED_PLATFORM', 'process.version', '需要 Node.js >=20', 4);
}

function usage(message) { throw new PlatformError('E_USAGE', 'argv', message, 2); }
function value(flag) { const index = cleanArgs.indexOf(flag); return index >= 0 ? cleanArgs[index + 1] : undefined; }
function has(flag) { return cleanArgs.includes(flag); }

function human(report) {
  const lines = [`PACT ${report.version} · ${report.command}`, `状态: ${report.status} · 变更: ${report.changes}`];
  for (const agent of report.agents) lines.push(`- ${agent.id}: ${agent.detected ? agent.status : 'undetected'} (${agent.root.replace(process.env.HOME || '', '~')})`);
  for (const item of report.diagnostics) lines.push(`! ${item.code} ${item.path}: ${item.message}`);
  return `${lines.join('\n')}\n`;
}

function help() {
  return `PACT ${pkg.version} — AI Agent 业务系统交付控制平台

⚠️ 本项目已归档，不再维护。接替项目: https://github.com/vima-tech/vima-cli

主推安装: npm i -g @vima-tech/pact
轻量 Skills: npx skills add vima-tech/pact -g
自动安装: 让 Agent 按 https://github.com/vima-tech/pact/blob/main/docs/installation.md 执行

命令:
  pact doctor [--json]
  pact agent list|verify [--agent <id>] [--json]
  pact agent sync [--agent <id>] [--copy] [--recover] [--json]
  pact agent install <id> [--copy] [--json]
  pact agent adopt|unadopt <id> --skill <name> [--json]
  pact agent remove <id> [--skill <name>] [--json]
  pact install [--inspect|--repair|--upgrade] [--json]
  pact uninstall [--inspect|--apply] [--recover] [--json]
`;
}

async function run() {
  supportedRuntime();
  if (!cleanArgs.length || has('--help') || cleanArgs[0] === 'help') { process.stdout.write(help()); return 0; }
  if (has('--version') || cleanArgs[0] === 'version') { process.stdout.write(`${pkg.version}\n`); return 0; }
  const manifest = await loadInstallManifest(PACKAGE_ROOT);
  const command = cleanArgs[0];
  let reports;
  let report;
  if (command === 'doctor') {
    reports = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest });
    report = aggregateReports('doctor', pkg.version, reports);
  } else if (command === 'agent') {
    const action = cleanArgs[1];
    const agent = value('--agent');
    if (action === 'list' || action === 'verify') {
      reports = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest, agentIds: agent ? [agent] : undefined });
      report = aggregateReports(`agent ${action}`, pkg.version, reports);
    } else if (action === 'sync') {
      if (has('--recover') && !agent) usage('--recover 必须同时指定 --agent');
      reports = await syncAgentSkills({ packageRoot: PACKAGE_ROOT, manifest, agentIds: agent ? [agent] : undefined, copy: has('--copy'), recover: has('--recover') });
      const inspected = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest });
      report = aggregateReports('agent sync', pkg.version, inspected);
      report.changes = reports.reduce((sum, item) => sum + item.changes, 0);
    } else if (action === 'install') {
      const id = cleanArgs[2];
      if (!id || id.startsWith('--')) usage('agent install 需要 Agent ID');
      reports = await syncAgentSkills({ packageRoot: PACKAGE_ROOT, manifest, agentIds: [id], explicitInstall: id, copy: has('--copy') });
      report = aggregateReports('agent install', pkg.version, reports);
    } else if (action === 'adopt') {
      const id = cleanArgs[2]; const skill = value('--skill');
      if (!id || !skill) usage('agent adopt 需要 Agent ID 和 --skill');
      const agentReport = await adoptAgentSkill({ packageRoot: PACKAGE_ROOT, manifest, agent: id, skill });
      report = aggregateReports('agent adopt', pkg.version, [{ ...agentReport, changes: 1 }]);
    } else if (action === 'unadopt') {
      const id = cleanArgs[2]; const skill = value('--skill');
      if (!id || !skill) usage('agent unadopt 需要 Agent ID 和 --skill');
      const result = await unadoptAgentSkill({ agent: id, skill });
      reports = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest, agentIds: [id] });
      report = aggregateReports('agent unadopt', pkg.version, reports); report.changes = result.changes;
    } else if (action === 'remove') {
      const id = cleanArgs[2];
      if (!id) usage('agent remove 需要 Agent ID');
      const result = await removeAgentSkills({ agent: id, skill: value('--skill') });
      reports = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest, agentIds: [id] });
      report = aggregateReports('agent remove', pkg.version, reports); report.changes = result.changes;
    } else usage('未知 agent 子命令');
  } else if (command === 'install') {
    if (has('--upgrade')) {
      report = { ok: false, command: 'install upgrade', version: pkg.version, status: 'needs-sync', changes: 0, agents: [], diagnostics: [{ code: 'E_SKILL_PENDING', path: '@vima-tech/pact', message: `请显式运行 npm i -g @vima-tech/pact@latest；当前 ${pkg.version}，目标版本未联网查询` }] };
    } else if (has('--repair')) {
      reports = await syncAgentSkills({ packageRoot: PACKAGE_ROOT, manifest });
      report = aggregateReports('install repair', pkg.version, await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest }));
      report.changes = reports.reduce((sum, item) => sum + item.changes, 0);
    } else {
      reports = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest });
      report = aggregateReports('install inspect', pkg.version, reports, [{ code: 'E_SKILL_PENDING', path: 'adapters', message: '重型 Adapter/环境安装尚未开放；本命令只诊断 PACT 与 Agent Skills' }]);
      report.ok = false;
      report.status = 'needs-sync';
    }
  } else if (command === 'uninstall') {
    if (has('--recover') && !has('--apply')) usage('uninstall --recover 必须与 --apply 同用');
    if (has('--apply')) {
      const result = await uninstallAgentSkills({ packageVersion: pkg.version, recover: has('--recover') });
      report = { ok: !result.conflicts.length, command: 'uninstall apply', version: pkg.version, status: result.conflicts.length ? 'conflict' : 'ready', changes: result.changes, agents: [], diagnostics: result.conflicts.map((item) => ({ code: 'E_SKILL_CONFLICT', path: `${item.agent}/${item.name}`, message: '目标已修改，保留原文件并记录冲突' })) };
    } else {
      reports = await inspectAgentSkills({ packageRoot: PACKAGE_ROOT, manifest });
      report = aggregateReports('uninstall inspect', pkg.version, reports);
    }
  } else usage('未知命令');
  process.stdout.write(json ? stableJson(report) : human(report));
  return reportExitCode(report);
}

try { process.exitCode = await run(); }
catch (reason) {
  const issue = reason instanceof PlatformError ? reason : new PlatformError('E_INSTALL_IO', '$', reason.message, 6);
  const status = issue.code === 'E_INSTALL_MANIFEST' ? 'manifest-broken' : issue.code === 'E_USAGE' ? 'error' : 'conflict';
  const report = { ok: false, command: cleanArgs.join(' ') || 'pact', version: pkg.version, status, changes: 0, agents: [], diagnostics: [issue.diagnostic()] };
  if (json) process.stdout.write(stableJson(report));
  else process.stderr.write(`${issue.code} ${issue.path}: ${issue.message}\n`);
  process.exitCode = issue.exitCode || 1;
}
