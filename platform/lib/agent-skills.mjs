// @pact R031,R033,R034,R035,R040
import { randomUUID } from 'node:crypto';
import {
  constants, copyFile, cp, lstat, mkdir, open, readFile, readlink, realpath, rename, rm, stat, unlink, writeFile
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { PlatformError, sha256File, stableJson } from './core.mjs';
import { installTreeHash, loadInstallManifest, SKILL_NAMES } from './install-manifest.mjs';

const TARGETS = Object.freeze({
  'claude-code': { base: ['.claude'], skills: ['.claude', 'skills'] },
  codex: { base: ['.codex'], skills: ['.codex', 'skills'] },
  cursor: { base: ['.cursor'], skills: ['.cursor', 'skills'] },
  universal: { base: ['.config', 'agents'], skills: ['.config', 'agents', 'skills'] }
});
const AGENT_IDS = Object.freeze(Object.keys(TARGETS).sort());
const COPY_FALLBACK = new Set(['EPERM', 'EOPNOTSUPP', 'ENOSYS']);

function error(code, path, message, exitCode = 5) {
  return new PlatformError(code, path, message, exitCode);
}

function pathInside(root, candidate) {
  const base = resolve(root);
  const target = resolve(candidate);
  return target === base || target.startsWith(`${base}${sep}`);
}

async function exists(path) {
  return lstat(path).then(() => true, (reason) => reason.code === 'ENOENT' ? false : Promise.reject(reason));
}

async function currentUidOwned(path, kind = 'directory') {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw error('E_SKILL_PATH', path, `${kind} 不得是软链`);
  if (kind === 'directory' && !info.isDirectory()) throw error('E_SKILL_PATH', path, '必须是目录');
  if (typeof process.getuid === 'function' && info.uid !== process.getuid()) throw error('E_SKILL_PATH', path, '必须归当前用户所有');
  return info;
}

async function ensureSafeDirectory(path, userHome, create = false) {
  if (!pathInside(userHome, path)) throw error('E_SKILL_PATH', path, '目录越出当前用户 home');
  if (!await exists(path)) {
    if (!create) return false;
    await mkdir(path, { recursive: true, mode: 0o700 });
  }
  await currentUidOwned(path);
  const actual = await realpath(path);
  const homeActual = await realpath(userHome);
  if (!pathInside(homeActual, actual)) throw error('E_SKILL_PATH', path, '目录 realpath 越界');
  return true;
}

export async function resolveInstallContext(options = {}) {
  const platform = options.platform || process.platform;
  if (!['linux', 'darwin'].includes(platform)) throw error('E_UNSUPPORTED_PLATFORM', 'process.platform', `不支持平台 ${platform}`, 4);
  let userHome = options.userHome || homedir();
  if (!options.userHome && process.env.PACT_ALLOW_HOME_OVERRIDE === '1' && process.env.PACT_USER_HOME) userHome = process.env.PACT_USER_HOME;
  if (!isAbsolute(userHome)) throw error('E_SKILL_PATH', 'userHome', 'user home 必须是绝对路径');
  userHome = resolve(userHome);
  await currentUidOwned(userHome);
  const stateRoot = platform === 'darwin'
    ? join(userHome, 'Library', 'Application Support', 'vima-tech', 'pact')
    : join(userHome, '.local', 'state', 'vima-tech', 'pact');
  return { platform, userHome, stateRoot };
}

function agentPaths(context, id) {
  const target = TARGETS[id];
  if (!target) throw error('E_AGENT_UNKNOWN', 'agent', `未知 Agent ${id}`, 4);
  return {
    id,
    base: join(context.userHome, ...target.base),
    root: join(context.userHome, ...target.skills),
    state: join(context.stateRoot, 'agents', `${id}.state.v1.json`),
    lock: join(context.stateRoot, `sync-${id}.lock`),
    journal: join(context.stateRoot, `sync-${id}-journal.v1.json`)
  };
}

async function readJsonOptional(path, code = 'E_INSTALL_STATE') {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (reason) {
    if (reason.code === 'ENOENT') return null;
    if (reason instanceof SyntaxError) throw error(code, path, '状态 JSON 损坏');
    throw reason;
  }
}

async function fsyncDirectory(path) {
  const handle = await open(path, constants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(stableJson(value)); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, path);
  await fsyncDirectory(dirname(path));
}

async function acquireLock(path, recover = false) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  if (recover) {
    if (!await exists(path)) throw error('E_INSTALL_RECOVERY', path, '没有可恢复的锁/journal');
    return null;
  }
  try {
    const handle = await open(path, 'wx', 0o600);
    await handle.writeFile(`${process.pid}\n`);
    await handle.sync();
    return handle;
  } catch (reason) {
    if (reason.code === 'EEXIST') throw error('E_SKILL_CONFLICT', path, '安装锁已存在；确认旧进程结束后显式 recover');
    throw reason;
  }
}

async function releaseLock(path, handle) {
  await handle?.close().catch(() => {});
  await unlink(path).catch((reason) => { if (reason.code !== 'ENOENT') throw reason; });
}

function diagnostic(code, path, message) { return { code, path, message }; }

function emptySkill(name, status = 'pending') {
  return { name, status, method: null, ownership: null, sourceSha256: '', targetSha256: null };
}

async function inspectLeaf(source, sourceSha256, target, record, packageChanged = false) {
  let info;
  try { info = await lstat(target); }
  catch (reason) { if (reason.code === 'ENOENT') return { status: 'missing', targetSha256: null, method: record?.method || null, ownership: record?.ownership || null }; throw reason; }
  let method;
  let linkText = null;
  if (info.isSymbolicLink()) { method = 'symlink'; linkText = await readlink(target); }
  else if (info.isDirectory()) method = 'copy';
  else return { status: 'conflict', targetSha256: null, method: null, ownership: record?.ownership || null };
  let targetSha256;
  try { targetSha256 = await installTreeHash(target); }
  catch { return { status: 'conflict', targetSha256: null, method, ownership: record?.ownership || null }; }
  if (!record) return { status: targetSha256 === sourceSha256 ? 'ready' : 'conflict', targetSha256, method, ownership: targetSha256 === sourceSha256 ? 'observed' : null, linkText };
  if (record.method !== method) return { status: 'conflict', targetSha256, method, ownership: record.ownership, linkText };
  if (method === 'symlink' && linkText !== record.source) return { status: 'conflict', targetSha256, method, ownership: record.ownership, linkText };
  if (packageChanged && record.ownership === 'managed') {
    const unchangedManaged = method === 'symlink' ? targetSha256 === sourceSha256 : targetSha256 === record.targetSha256;
    return { status: unchangedManaged ? 'needs-sync' : 'conflict', targetSha256, method, ownership: record.ownership, linkText };
  }
  if (targetSha256 !== record.targetSha256) return { status: 'conflict', targetSha256, method, ownership: record.ownership, linkText };
  if (record.source !== source || record.sourceSha256 !== sourceSha256) return { status: 'needs-sync', targetSha256, method, ownership: record.ownership, linkText };
  return { status: 'ready', targetSha256, method, ownership: record.ownership, linkText };
}

function aggregateSkillStatus(skills, detected) {
  if (!detected) return 'pending';
  if (skills.some(({ status }) => status === 'conflict')) return 'conflict';
  if (skills.some(({ status }) => status === 'missing' || status === 'needs-sync')) return 'needs-sync';
  return 'ready';
}

export async function detectAgents(input = {}) {
  const context = await resolveInstallContext(input);
  const agents = [];
  for (const id of AGENT_IDS) {
    const paths = agentPaths(context, id);
    let detected = false;
    if (await exists(paths.base)) { await ensureSafeDirectory(paths.base, context.userHome); detected = true; }
    agents.push({ ...paths, detected });
  }
  return { context, agents };
}

export async function inspectAgentSkills(input) {
  const packageRoot = resolve(input.packageRoot);
  const manifest = input.manifest || await loadInstallManifest(packageRoot);
  const { context, agents } = await detectAgents(input);
  const selected = input.agentIds?.length ? agents.filter(({ id }) => input.agentIds.includes(id)) : agents;
  for (const id of input.agentIds || []) if (!AGENT_IDS.includes(id)) throw error('E_AGENT_UNKNOWN', 'agent', `未知 Agent ${id}`, 4);
  const reports = [];
  for (const target of selected) {
    const state = await readJsonOptional(target.state);
    const records = new Map((state?.records || []).map((record) => [record.name, record]));
    const skills = [];
    if (!target.detected && !input.explicitInstall) {
      skills.push(...SKILL_NAMES.map((name) => emptySkill(name)));
    } else {
      if (await exists(target.root)) await ensureSafeDirectory(target.root, context.userHome);
      for (const skill of manifest.skills) {
        const source = resolve(packageRoot, skill.path);
        const targetPath = join(target.root, skill.name);
        const record = records.get(skill.name);
        const result = await inspectLeaf(source, skill.sha256, targetPath, record, Boolean(state && state.packageVersion !== manifest.version));
        skills.push({ name: skill.name, status: result.status, method: result.method, ownership: result.ownership, sourceSha256: skill.sha256, targetSha256: result.targetSha256 });
      }
    }
    const status = aggregateSkillStatus(skills, target.detected || input.explicitInstall === target.id);
    const diagnostics = status === 'ready' ? [] : [diagnostic(
      status === 'conflict' ? 'E_SKILL_CONFLICT' : 'E_SKILL_PENDING',
      target.id,
      status === 'pending' ? '未检测到 Agent' : status === 'conflict' ? 'Skill 目标与 PACT state 冲突' : 'Skill 需要同步'
    )];
    reports.push({ id: target.id, detected: target.detected, root: target.root, status, changes: 0, skills, diagnostics });
  }
  return reports.sort((a, b) => a.id.localeCompare(b.id));
}

async function createStage(stage, manifest, packageRoot, method) {
  await mkdir(stage, { recursive: true, mode: 0o700 });
  for (const skill of manifest.skills) {
    const source = resolve(packageRoot, skill.path);
    const leaf = join(stage, skill.name);
    if (method === 'copy') await cp(source, leaf, { recursive: true, errorOnExist: true, preserveTimestamps: false });
    else await import('node:fs/promises').then(({ symlink }) => symlink(source, leaf, 'dir'));
  }
}

function makeRecord(agent, name, source, target, method, ownership, hash) {
  return { agent, name, source, target, method, ownership, sourceSha256: hash, targetSha256: hash };
}

export async function syncAgentSkills(input) {
  const packageRoot = resolve(input.packageRoot);
  const manifest = input.manifest || await loadInstallManifest(packageRoot);
  const { context, agents } = await detectAgents(input);
  const requested = input.agentIds?.length ? input.agentIds : agents.filter(({ detected }) => detected).map(({ id }) => id);
  for (const id of requested) if (!AGENT_IDS.includes(id)) throw error('E_AGENT_UNKNOWN', 'agent', `未知 Agent ${id}`, 4);
  if (input.recover && requested.length !== 1) throw error('E_USAGE', 'recover', '--recover 必须指定一个 --agent', 2);
  const reports = [];
  for (const id of requested.sort()) {
    const target = agents.find((agent) => agent.id === id);
    if (!target.detected && input.explicitInstall !== id) continue;
    let changedCount = 0;
    const lockHandle = await acquireLock(target.lock, input.recover);
    try {
      if (input.recover) {
        const journal = await readJsonOptional(target.journal, 'E_INSTALL_RECOVERY');
        if (!journal) throw error('E_INSTALL_RECOVERY', target.journal, '恢复 journal 不存在');
        await atomicJson(target.state, journal.nextState);
        await rm(journal.stage, { recursive: true, force: true });
        await rm(journal.backup, { recursive: true, force: true });
        await unlink(target.journal);
        await releaseLock(target.lock, null);
      } else {
        if (input.explicitInstall === id) {
          await ensureSafeDirectory(target.base, context.userHome, true);
          target.detected = true;
        }
        await ensureSafeDirectory(target.root, context.userHome, true);
        await ensureSafeDirectory(context.stateRoot, context.userHome, true);
        await ensureSafeDirectory(dirname(target.state), context.userHome, true);
        const state = await readJsonOptional(target.state);
        const records = new Map((state?.records || []).map((record) => [record.name, record]));
        const inspection = await inspectAgentSkills({ ...input, manifest, agentIds: [id], explicitInstall: id });
        if (inspection[0].status === 'conflict') throw error('E_SKILL_CONFLICT', id, 'Skill 冲突，不会覆盖');
        const nextRecords = [];
        const changes = inspection[0].skills.filter(({ status }) => status !== 'ready').length;
        changedCount = changes;
        if (!changes) {
          for (const skill of manifest.skills) {
            const source = resolve(packageRoot, skill.path);
            const targetPath = join(target.root, skill.name);
            const existing = records.get(skill.name);
            nextRecords.push(existing || makeRecord(id, skill.name, source, targetPath, inspection[0].skills.find(({ name }) => name === skill.name).method, 'observed', skill.sha256));
          }
          const nextState = { version: 1, agent: id, packageVersion: manifest.version, records: nextRecords.sort((a, b) => a.name.localeCompare(b.name)) };
          if (stableJson(state) !== stableJson(nextState)) await atomicJson(target.state, nextState);
        } else {
          const transaction = randomUUID();
          const stage = join(target.root, `.pact-stage-${transaction}`);
          const backup = join(target.root, `.pact-backup-${transaction}`);
          let method = input.copy ? 'copy' : 'symlink';
          try { await createStage(stage, manifest, packageRoot, method); }
          catch (reason) {
            await rm(stage, { recursive: true, force: true });
            if (method !== 'symlink' || !COPY_FALLBACK.has(reason.code)) throw reason;
            method = 'copy';
            await createStage(stage, manifest, packageRoot, method);
          }
          await mkdir(backup, { mode: 0o700 });
          for (const skill of manifest.skills) {
            const source = resolve(packageRoot, skill.path);
            const targetPath = join(target.root, skill.name);
            const existingInspection = inspection[0].skills.find(({ name }) => name === skill.name);
            if (existingInspection.status === 'ready' && records.get(skill.name)?.ownership === 'observed') {
              nextRecords.push(records.get(skill.name));
            } else {
              nextRecords.push(makeRecord(id, skill.name, source, targetPath, method, 'managed', skill.sha256));
            }
          }
          const nextState = { version: 1, agent: id, packageVersion: manifest.version, records: nextRecords.sort((a, b) => a.name.localeCompare(b.name)) };
          const journal = { version: 1, agent: id, transaction, packageVersion: manifest.version, status: 'prepared', stage, backup, nextState };
          await atomicJson(target.journal, journal);
          for (const skill of manifest.skills) {
            const targetPath = join(target.root, skill.name);
            const prior = records.get(skill.name);
            if (prior?.ownership === 'observed') { await rm(join(stage, skill.name), { recursive: true, force: true }); continue; }
            if (await exists(targetPath)) await rename(targetPath, join(backup, skill.name));
            await rename(join(stage, skill.name), targetPath);
          }
          await fsyncDirectory(target.root);
          await atomicJson(target.state, nextState);
          await rm(stage, { recursive: true, force: true });
          await rm(backup, { recursive: true, force: true });
          await unlink(target.journal);
        }
      }
    } finally {
      if (!input.recover || await exists(target.lock)) await releaseLock(target.lock, lockHandle).catch(() => {});
    }
    const [report] = await inspectAgentSkills({ ...input, manifest, agentIds: [id], explicitInstall: id });
    report.changes = report.status === 'ready' ? changedCount : 0;
    reports.push(report);
  }
  return reports;
}

export async function adoptAgentSkill(input) {
  const packageRoot = resolve(input.packageRoot);
  const manifest = input.manifest || await loadInstallManifest(packageRoot);
  if (!SKILL_NAMES.includes(input.skill)) throw error('E_USAGE', 'skill', '未知 Skill', 2);
  const { context } = await resolveInstallContext(input);
  const paths = agentPaths(context, input.agent);
  await ensureSafeDirectory(paths.root, context.userHome);
  const skill = manifest.skills.find(({ name }) => name === input.skill);
  const target = join(paths.root, input.skill);
  const targetHash = await installTreeHash(target).catch(() => null);
  if (targetHash !== skill.sha256) throw error('E_SKILL_CONFLICT', target, '只能接管与当前 source 完全一致的 Skill');
  const info = await lstat(target);
  const method = info.isSymbolicLink() ? 'symlink' : info.isDirectory() ? 'copy' : null;
  if (!method) throw error('E_SKILL_CONFLICT', target, '目标类型不可接管');
  const state = await readJsonOptional(paths.state) || { version: 1, agent: input.agent, packageVersion: manifest.version, records: [] };
  state.records = state.records.filter(({ name }) => name !== input.skill);
  state.records.push(makeRecord(input.agent, input.skill, resolve(packageRoot, skill.path), target, method, 'observed', skill.sha256));
  state.records.sort((a, b) => a.name.localeCompare(b.name));
  await atomicJson(paths.state, state);
  return (await inspectAgentSkills({ ...input, manifest, agentIds: [input.agent] }))[0];
}

export async function unadoptAgentSkill(input) {
  const context = await resolveInstallContext(input);
  const paths = agentPaths(context, input.agent);
  const state = await readJsonOptional(paths.state);
  const record = state?.records.find(({ name }) => name === input.skill);
  if (!record || record.ownership !== 'observed') throw error('E_SKILL_CONFLICT', input.skill, '只能 unadopt observed 记录');
  state.records = state.records.filter(({ name }) => name !== input.skill);
  await atomicJson(paths.state, state);
  return { changes: 1 };
}

export async function removeAgentSkills(input) {
  const context = await resolveInstallContext(input);
  const paths = agentPaths(context, input.agent);
  const state = await readJsonOptional(paths.state);
  if (!state) return { changes: 0, conflicts: [] };
  const names = input.skill ? [input.skill] : state.records.map(({ name }) => name);
  const conflicts = [];
  let changes = 0;
  for (const name of names) {
    const record = state.records.find((item) => item.name === name);
    if (!record) continue;
    if (record.ownership === 'observed') { conflicts.push(name); continue; }
    const result = await inspectLeaf(record.source, record.sourceSha256, record.target, record);
    if (result.status === 'ready' || result.status === 'needs-sync') {
      await rm(record.target, { recursive: true, force: true });
      state.records = state.records.filter((item) => item.name !== name);
      changes += 1;
    } else conflicts.push(name);
  }
  await atomicJson(paths.state, state);
  if (conflicts.length) throw error('E_SKILL_CONFLICT', input.agent, `未删除冲突/observed Skill：${conflicts.join(',')}`);
  return { changes, conflicts };
}

export async function uninstallAgentSkills(input) {
  const context = await resolveInstallContext(input);
  await ensureSafeDirectory(context.stateRoot, context.userHome, true);
  const globalLock = join(context.stateRoot, 'uninstall.lock');
  const journalPath = join(context.stateRoot, 'uninstall-journal.v1.json');
  const conflictsPath = join(context.stateRoot, 'uninstall-conflicts.v1.json');
  const lockHandle = await acquireLock(globalLock, input.recover);
  const held = [];
  try {
    if (input.recover) {
      const journal = await readJsonOptional(journalPath, 'E_INSTALL_RECOVERY');
      if (!journal) throw error('E_INSTALL_RECOVERY', journalPath, '卸载 journal 不存在');
      await atomicJson(conflictsPath, journal.conflicts.next);
      for (const agent of journal.agents) await atomicJson(agent.path, agent.next);
      for (const removal of journal.removals) await rm(removal.target, { recursive: true, force: true });
      await unlink(journalPath);
      await releaseLock(globalLock, null);
      return { changes: journal.removals.length, conflicts: journal.conflicts.next.conflicts };
    }
    const agentStates = [];
    for (const id of AGENT_IDS) {
      const paths = agentPaths(context, id);
      const state = await readJsonOptional(paths.state);
      if (!state) continue;
      const handle = await acquireLock(paths.lock);
      held.push([paths.lock, handle]);
      agentStates.push({ id, paths, state });
    }
    const existing = await readJsonOptional(conflictsPath) || { version: 1, packageVersion: input.packageVersion || 'unknown', conflicts: [] };
    const byKey = new Map(existing.conflicts.map((item) => [`${item.agent}\0${item.name}\0${item.target}`, item]));
    const removals = [];
    let conflictCount = 0;
    for (const item of agentStates) {
      const remaining = [];
      for (const record of item.state.records) {
        if (record.ownership === 'observed') continue;
        const result = await inspectLeaf(record.source, record.sourceSha256, record.target, record);
        if (result.status === 'ready' || result.status === 'needs-sync') removals.push({ agent: item.id, name: record.name, target: record.target });
        else {
          conflictCount += 1;
          const key = `${item.id}\0${record.name}\0${record.target}`;
          const next = { agent: item.id, name: record.name, target: record.target, reason: 'target-content-changed', recordedAt: byKey.get(key)?.recordedAt || new Date().toISOString(), stateRecord: record };
          byKey.set(key, next);
        }
      }
      item.next = { ...item.state, records: remaining };
    }
    const nextConflicts = { version: 1, packageVersion: input.packageVersion || existing.packageVersion, conflicts: [...byKey.values()].sort((a, b) => `${a.agent}\0${a.name}\0${a.target}`.localeCompare(`${b.agent}\0${b.name}\0${b.target}`)) };
    if (!removals.length && agentStates.every(({ state, next }) => stableJson(state) === stableJson(next)) && stableJson(existing) === stableJson(nextConflicts)) return { changes: 0, conflicts: nextConflicts.conflicts };
    const journal = { version: 1, transaction: randomUUID(), packageVersion: input.packageVersion || 'unknown', status: 'prepared', conflicts: { path: conflictsPath, next: nextConflicts }, agents: agentStates.map(({ id, paths, next }) => ({ agent: id, path: paths.state, next })), removals };
    await atomicJson(journalPath, journal);
    for (const removal of removals) await rm(removal.target, { recursive: true, force: true });
    await atomicJson(conflictsPath, nextConflicts);
    for (const agent of journal.agents) await atomicJson(agent.path, agent.next);
    await unlink(journalPath);
    return { changes: removals.length + agentStates.reduce((sum, { state }) => sum + state.records.filter(({ ownership }) => ownership === 'observed').length, 0), conflicts: nextConflicts.conflicts, conflictCount };
  } finally {
    for (const [path, handle] of held.reverse()) await releaseLock(path, handle).catch(() => {});
    if (!input.recover || await exists(globalLock)) await releaseLock(globalLock, lockHandle).catch(() => {});
  }
}

export function aggregateReports(command, version, agents, diagnostics = []) {
  const detected = agents.filter(({ detected }) => detected);
  const relevant = detected.length ? detected : agents;
  let status = 'pending';
  if (relevant.some(({ status: value }) => value === 'conflict')) status = 'conflict';
  else if (relevant.some(({ status: value }) => value === 'needs-sync')) status = 'needs-sync';
  else if (detected.length && relevant.every(({ status: value }) => value === 'ready')) status = 'ready';
  const allDiagnostics = [...relevant.flatMap(({ diagnostics: value }) => value), ...diagnostics]
    .sort((a, b) => `${a.code}\0${a.path}`.localeCompare(`${b.code}\0${b.path}`));
  return { ok: status === 'ready' || (status === 'pending' && !detected.length), command, version, status, changes: agents.reduce((sum, agent) => sum + agent.changes, 0), agents, diagnostics: allDiagnostics };
}

export function reportExitCode(report) {
  if (report.status === 'ready' || report.status === 'pending') return 0;
  if (report.status === 'needs-sync') return 1;
  if (report.status === 'manifest-broken') return 3;
  if (report.status === 'conflict') return 5;
  return 2;
}
