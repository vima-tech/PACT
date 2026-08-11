#!/usr/bin/env node
// @pact R011,R012,R013,R014,R018
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, open, readFile, readlink, realpath, rename, rm, symlink, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, readJson, resolveInside, stableJson } from '../lib/core.mjs';
import { assertTargetSafe, EXCLUDED_SEGMENTS, listSnapshotEntries, normalizedTreeHash } from '../lib/tree-hash.mjs';
import { validateDocument } from '../lib/schema-validator.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS = join(ROOT, 'artifacts', 'migration');
const PROVENANCE = join(ROOT, 'platform', 'registry', 'provenance.v1.json');
const STATE = join(ARTIFACTS, 'state.v1.json');
const IMPORT_MANIFEST = join(ARTIFACTS, 'import-manifest.v1.json');
const WRITE_LOCK = join(ARTIFACTS, 'write.lock');
const FINALIZE_JOURNAL = join(ARTIFACTS, 'finalize-journal.v1.json');

function flag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function writeAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  const handle = await open(temp, 'w');
  try { await handle.writeFile(stableJson(value)); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, path);
}

async function removeIfExists(path) {
  try { await unlink(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function withWriteLock(operation, task, { takeOver = false } = {}) {
  await mkdir(ARTIFACTS, { recursive: true });
  if (takeOver) await removeIfExists(WRITE_LOCK);
  let handle;
  try {
    handle = await open(WRITE_LOCK, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') throw new PlatformError('E_INVALID_TRANSITION', 'artifacts/migration/write.lock', '迁移写锁已存在；确认原进程结束后显式运行 --recover-finalize', 7);
    throw error;
  }
  try {
    await handle.writeFile(stableJson({ operation, pid: process.pid }));
    await handle.sync();
    return await task();
  } finally {
    await handle.close();
    await removeIfExists(WRITE_LOCK);
  }
}

function planSha256(plan) {
  return createHash('sha256').update(stableJson(plan)).digest('hex');
}

async function plannedImports() {
  const doc = await readJson(PROVENANCE);
  const validation = validateDocument('provenance', doc);
  if (!validation.ok) throw new PlatformError('E_SCHEMA', validation.diagnostics[0].path, validation.diagnostics[0].message, 2);
  return doc.imports;
}

async function createPlan() {
  const products = [];
  for (const item of await plannedImports()) {
    const source = item.phase === 'planned' ? item.originalPath : item.snapshotPath;
    const hash = await normalizedTreeHash(source);
    if (hash !== item.normalizedSha256) throw new PlatformError('E_MIGRATION_CONFLICT', item.id, '来源快照 hash 与 provenance 不一致', 6);
    products.push({ ...item, sourcePath: source, targetAbsolute: resolve(ROOT, item.targetPath), stagingPath: join(ARTIFACTS, 'staging', item.id) });
  }
  return { version: '1', pact: 'pact-platform-unification', products };
}

async function copySnapshot(source, staging) {
  if (await exists(staging)) await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  const entries = await listSnapshotEntries(source);
  for (const entry of entries) {
    const output = join(staging, ...entry.path.split('/'));
    await mkdir(dirname(output), { recursive: true });
    if (entry.type === 'file') await copyFile(entry.full, output);
    else await symlink(entry.target, output);
  }
  return entries.map(({ type, path }) => ({ type, path }));
}

async function applyStaged(plan) {
  const manifest = { version: '1', excludedSegments: EXCLUDED_SEGMENTS, products: [] };
  for (const item of plan.products) {
    const disposition = await assertTargetSafe(item.sourcePath, item.targetAbsolute);
    let entries;
    if (disposition === 'absent') {
      entries = await copySnapshot(item.sourcePath, item.stagingPath);
      const hash = await normalizedTreeHash(item.stagingPath);
      if (hash !== item.normalizedSha256) throw new PlatformError('E_MIGRATION_CONFLICT', item.id, 'staging hash 不一致', 6);
      await mkdir(dirname(item.targetAbsolute), { recursive: true });
      await rename(item.stagingPath, item.targetAbsolute);
    } else {
      entries = (await listSnapshotEntries(item.targetAbsolute)).map(({ type, path }) => ({ type, path }));
    }
    const excluded = entries.filter((entry) => entry.path.split('/').some((segment) => EXCLUDED_SEGMENTS.includes(segment)));
    if (excluded.length) throw new PlatformError('E_MIGRATION_CONFLICT', item.id, 'import manifest 含排除目录', 6);
    manifest.products.push({ id: item.id, normalizedSha256: item.normalizedSha256, entries });
  }
  await writeAtomic(IMPORT_MANIFEST, manifest);
  await writeAtomic(STATE, { version: '1', status: 'staged', planSha256: plan.products.map((item) => item.normalizedSha256), importManifest: relative(ROOT, IMPORT_MANIFEST) });
  return { ok: true, status: 'staged', importManifest: relative(ROOT, IMPORT_MANIFEST) };
}

async function readVerification(path, plan) {
  const report = await readJson(path);
  if (report.passed !== true || !Array.isArray(report.products)) throw new PlatformError('E_COMMAND_FAILED', 'verificationReport', '产品验证报告未通过', 1);
  for (const item of plan.products) {
    const actual = await normalizedTreeHash(item.targetAbsolute);
    const found = report.products.find((product) => product.id === item.id);
    if (!found || found.targetSha256 !== actual || actual !== item.normalizedSha256 || found.passed !== true) {
      throw new PlatformError('E_COMMAND_FAILED', item.id, '产品验证报告未绑定当前 target hash', 1);
    }
  }
  return report;
}

export async function assertExactAlias(path, expectedTarget, { allowMissing = false } = {}) {
  let stat;
  try { stat = await lstat(path); } catch (error) {
    if (error.code === 'ENOENT' && allowMissing) return null;
    if (error.code === 'ENOENT') throw new PlatformError('E_MIGRATION_CONFLICT', path, '旧入口不存在', 6);
    throw error;
  }
  if (!stat.isSymbolicLink()) throw new PlatformError('E_MIGRATION_CONFLICT', path, '旧入口不是软链接', 6);
  const linkText = await readlink(path);
  if (linkText !== expectedTarget) throw new PlatformError('E_MIGRATION_CONFLICT', path, '旧入口不是指向 canonical target 的精确绝对软链接', 6);
  return linkText;
}

async function assertImportHashes(item, targetAbsolute) {
  const [targetHash, snapshotHash] = await Promise.all([
    normalizedTreeHash(targetAbsolute),
    normalizedTreeHash(item.snapshotPath)
  ]);
  if (targetHash !== item.normalizedSha256 || snapshotHash !== item.normalizedSha256) {
    throw new PlatformError('E_MIGRATION_CONFLICT', item.id, 'canonical target 或 backup hash 与 provenance 不一致', 6);
  }
  return { targetHash, snapshotHash };
}

function runtimePlan(plan, provenance) {
  if (plan.version !== '1' || plan.pact !== 'pact-platform-unification' || !Array.isArray(plan.products)) {
    throw new PlatformError('E_SCHEMA', 'plan', '迁移计划格式错误', 2);
  }
  if (plan.products.length !== provenance.imports.length) throw new PlatformError('E_MIGRATION_CONFLICT', 'plan.products', '迁移计划产品集合不完整', 6);
  return provenance.imports.map((item) => {
    const planned = plan.products.find((candidate) => candidate.id === item.id);
    const targetAbsolute = resolve(ROOT, item.targetPath);
    if (!planned || planned.originalPath !== item.originalPath || planned.backupPath !== item.backupPath ||
        planned.targetPath !== item.targetPath || planned.targetAbsolute !== targetAbsolute ||
        planned.normalizedSha256 !== item.normalizedSha256) {
      throw new PlatformError('E_MIGRATION_CONFLICT', item.id, '迁移计划与 live provenance 不一致', 6);
    }
    return { ...item, targetAbsolute };
  });
}

async function readProvenance() {
  const doc = await readJson(PROVENANCE);
  const validation = validateDocument('provenance', doc);
  if (!validation.ok) throw new PlatformError('E_SCHEMA', validation.diagnostics[0].path, validation.diagnostics[0].message, 2);
  return doc;
}

async function verifyFinalized(provenance, { requireCleanJournal = true } = {}) {
  if (!provenance.imports.every((item) => item.phase === 'finalized')) throw new PlatformError('E_INVALID_TRANSITION', 'provenance.imports.phase', 'provenance 尚未全部 finalized', 7);
  const products = [];
  for (const item of provenance.imports) {
    const targetAbsolute = resolve(ROOT, item.targetPath);
    const hashes = await assertImportHashes(item, targetAbsolute);
    if (await exists(item.originalPath)) throw new PlatformError('E_MIGRATION_CONFLICT', item.originalPath, 'finalized 后旧入口必须不存在', 6);
    products.push({ id: item.id, ...hashes });
  }
  if (requireCleanJournal && await exists(FINALIZE_JOURNAL)) throw new PlatformError('E_INVALID_TRANSITION', 'artifacts/migration/finalize-journal.v1.json', '存在未处理 finalize journal', 7);
  return products;
}

function validatedJournalEntries(journal, provenance) {
  if (journal.version !== '1' || journal.status !== 'prepared' || !Array.isArray(journal.entries) || journal.entries.length !== provenance.imports.length) {
    throw new PlatformError('E_SCHEMA', 'finalizeJournal', 'finalize journal 格式错误', 2);
  }
  return provenance.imports.map((item) => {
    const entry = journal.entries.find((candidate) => candidate.id === item.id);
    const targetAbsolute = resolve(ROOT, item.targetPath);
    if (!entry || entry.originalPath !== item.originalPath || entry.targetAbsolute !== targetAbsolute || entry.linkText !== targetAbsolute) {
      throw new PlatformError('E_MIGRATION_CONFLICT', item.id, 'finalize journal 路径身份不匹配', 6);
    }
    return entry;
  });
}

export async function restoreLinkedAliases(entries) {
  for (const entry of entries) {
    const linkText = await assertExactAlias(entry.originalPath, entry.linkText, { allowMissing: true });
    if (linkText === null) await symlink(entry.linkText, entry.originalPath, 'dir');
  }
}

async function recoverFinalize() {
  const provenance = await readProvenance();
  const phases = new Set(provenance.imports.map((item) => item.phase));
  const journal = await exists(FINALIZE_JOURNAL) ? await readJson(FINALIZE_JOURNAL) : null;
  if (phases.size !== 1 || (!phases.has('linked') && !phases.has('finalized'))) {
    throw new PlatformError('E_INVALID_TRANSITION', 'provenance.imports.phase', 'finalize recovery 遇到混合或非法 phase', 7);
  }
  if (phases.has('finalized')) {
    await verifyFinalized(provenance, { requireCleanJournal: false });
    const retiredAt = provenance.imports[0].retiredAt;
    await writeAtomic(STATE, { version: '1', status: 'finalized', retiredAt });
    await removeIfExists(FINALIZE_JOURNAL);
    return { ok: true, status: 'finalized', recovered: true };
  }
  if (journal) {
    const entries = validatedJournalEntries(journal, provenance);
    for (const item of provenance.imports) await assertImportHashes(item, resolve(ROOT, item.targetPath));
    await restoreLinkedAliases(entries);
  } else {
    for (const item of provenance.imports) {
      await assertImportHashes(item, resolve(ROOT, item.targetPath));
      await assertExactAlias(item.originalPath, resolve(ROOT, item.targetPath));
    }
  }
  await writeAtomic(STATE, { version: '1', status: 'linked', importedAt: provenance.imports[0].importedAt });
  await removeIfExists(FINALIZE_JOURNAL);
  return { ok: true, status: 'linked', recovered: true };
}

async function applyLinked(plan, reportPath) {
  if (!reportPath) throw new PlatformError('E_COMMAND_FAILED', 'verificationReport', '切链必须提供产品验证报告', 1);
  await readVerification(resolveInside(ROOT, reportPath), plan);
  await writeAtomic(STATE, { version: '1', status: 'verified' });
  const linked = [];
  try {
    for (const item of plan.products) {
      const stat = await lstat(item.originalPath);
      if (stat.isSymbolicLink()) {
        if (await realpath(item.originalPath) !== await realpath(item.targetAbsolute)) throw new PlatformError('E_MIGRATION_CONFLICT', item.originalPath, '旧入口软链指向错误', 6);
        continue;
      }
      if (await exists(item.backupPath)) throw new PlatformError('E_MIGRATION_CONFLICT', item.backupPath, '备份路径已存在', 6);
      await rename(item.originalPath, item.backupPath);
      await symlink(item.targetAbsolute, item.originalPath, 'dir');
      linked.push(item);
    }
  } catch (error) {
    for (const item of linked.reverse()) { await unlink(item.originalPath); await rename(item.backupPath, item.originalPath); }
    await writeAtomic(STATE, { version: '1', status: 'failed', code: error.code || 'E_COMMAND_FAILED' });
    throw error;
  }
  const provenance = await readJson(PROVENANCE);
  const importedAt = new Date().toISOString();
  provenance.imports = provenance.imports.map((item) => ({ ...item, phase: 'linked', snapshotPath: item.backupPath, importedAt, retiredAt: null }));
  await writeAtomic(PROVENANCE, provenance);
  await writeAtomic(STATE, { version: '1', status: 'linked', importedAt });
  return { ok: true, status: 'linked' };
}

async function applyFinalized(plan, reportPath) {
  if (!reportPath) throw new PlatformError('E_COMMAND_FAILED', 'verificationReport', 'finalize 必须提供绑定当前 target hash 的产品验证报告', 1);
  const provenance = await readProvenance();
  if (provenance.imports.every((item) => item.phase === 'finalized')) {
    const products = await verifyFinalized(provenance);
    return { ok: true, status: 'finalized', products };
  }
  if (!provenance.imports.every((item) => item.phase === 'linked')) {
    throw new PlatformError('E_INVALID_TRANSITION', 'provenance.imports.phase', '只有 linked 可进入 finalized', 7);
  }
  if (await exists(FINALIZE_JOURNAL)) throw new PlatformError('E_INVALID_TRANSITION', 'artifacts/migration/finalize-journal.v1.json', '存在遗留 journal，请先 --recover-finalize', 7);

  const products = runtimePlan(plan, provenance);
  await readVerification(resolveInside(ROOT, reportPath), { products });
  const entries = [];
  for (const item of products) {
    await assertImportHashes(item, item.targetAbsolute);
    const linkText = await assertExactAlias(item.originalPath, item.targetAbsolute);
    entries.push({ id: item.id, originalPath: item.originalPath, targetAbsolute: item.targetAbsolute, linkText });
  }

  const retiredAt = new Date().toISOString();
  const journal = { version: '1', status: 'prepared', planSha256: planSha256(plan), retiredAt, entries, removedIds: [] };
  await writeAtomic(FINALIZE_JOURNAL, journal);
  try {
    for (const entry of entries) {
      await assertExactAlias(entry.originalPath, entry.linkText);
      await unlink(entry.originalPath);
      journal.removedIds.push(entry.id);
      await writeAtomic(FINALIZE_JOURNAL, journal);
    }
    for (const item of products) {
      if (await exists(item.originalPath)) throw new PlatformError('E_MIGRATION_CONFLICT', item.originalPath, '旧入口退役后仍存在', 6);
      await assertImportHashes(item, item.targetAbsolute);
    }
    provenance.imports = provenance.imports.map((item) => ({ ...item, phase: 'finalized', retiredAt }));
    await writeAtomic(PROVENANCE, provenance);
    await writeAtomic(STATE, { version: '1', status: 'finalized', retiredAt });
    await removeIfExists(FINALIZE_JOURNAL);
    return { ok: true, status: 'finalized', retiredAt, retiredAliases: entries.map(({ originalPath }) => originalPath) };
  } catch (error) {
    try { await recoverFinalize(); } catch (recoveryError) { throw recoveryError; }
    throw error;
  }
}

async function verifyMigration() {
  const doc = await readProvenance();
  const phases = new Set(doc.imports.map((item) => item.phase));
  if (phases.size !== 1 || (!phases.has('linked') && !phases.has('finalized'))) throw new PlatformError('E_INVALID_TRANSITION', 'provenance.imports.phase', '迁移校验要求统一 linked/finalized phase', 7);
  const phase = doc.imports[0].phase;
  if (phase === 'finalized') {
    const products = await verifyFinalized(doc);
    if (await exists(STATE) && (await readJson(STATE)).status !== 'finalized') throw new PlatformError('E_INVALID_TRANSITION', 'artifacts/migration/state.v1.json', 'state 与 finalized provenance 不一致', 7);
    return { ok: true, status: 'finalized', products };
  }
  const products = [];
  for (const item of doc.imports) {
    const target = resolve(ROOT, item.targetPath);
    const targetHash = await normalizedTreeHash(target);
    const snapshotHash = await normalizedTreeHash(item.snapshotPath);
    const linkTarget = await realpath(item.originalPath);
    if (targetHash !== item.normalizedSha256 || snapshotHash !== item.normalizedSha256 || linkTarget !== await realpath(target)) {
      throw new PlatformError('E_MIGRATION_CONFLICT', item.id, '迁移校验失败', 6);
    }
    products.push({ id: item.id, targetHash, snapshotHash, realpath: linkTarget });
  }
  if (await exists(STATE) && !['linked', 'verified'].includes((await readJson(STATE)).status)) throw new PlatformError('E_INVALID_TRANSITION', 'artifacts/migration/state.v1.json', 'state 与 linked provenance 不一致', 7);
  return { ok: true, status: 'linked', products };
}

async function rollback() {
  const imports = await plannedImports();
  if (imports.some((item) => item.phase === 'finalized')) throw new PlatformError('E_INVALID_TRANSITION', 'provenance.imports.phase', 'finalized 不允许 rollback 或重建旧入口', 7);
  for (const item of [...imports].reverse()) {
    if (await exists(item.originalPath) && (await lstat(item.originalPath)).isSymbolicLink() && await exists(item.backupPath)) {
      await unlink(item.originalPath);
      await rename(item.backupPath, item.originalPath);
    }
  }
  await writeAtomic(STATE, { version: '1', status: 'source' });
  return { ok: true, status: 'source' };
}

async function main() {
  const action = process.argv[2];
  let result;
  if (action === 'plan') {
    result = await createPlan();
    const output = flag('--output');
    if (output) await writeAtomic(resolve(ROOT, output), result);
  } else if (action === 'apply' && process.argv.includes('--recover-finalize')) {
    result = await withWriteLock('recover-finalize', recoverFinalize, { takeOver: true });
  } else if (action === 'apply' && process.argv.includes('--rollback')) result = await withWriteLock('rollback', rollback);
  else if (action === 'apply') {
    const planPath = flag('--plan');
    const until = flag('--until');
    if (!planPath || !['staged', 'linked', 'finalized'].includes(until)) throw new PlatformError('E_SCHEMA', 'argv', 'apply 需要 --plan 和 --until staged|linked|finalized', 2);
    const plan = await readJson(resolveInside(ROOT, planPath));
    result = await withWriteLock(until, () => {
      if (until === 'staged') return applyStaged(plan);
      if (until === 'linked') return applyLinked(plan, flag('--verification-report'));
      return applyFinalized(plan, flag('--verification-report'));
    });
  } else if (action === 'verify') result = await verifyMigration();
  else throw new PlatformError('E_SCHEMA', 'argv', '用法：migration.mjs plan|apply|verify', 2);
  process.stdout.write(stableJson(result));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const diagnostic = error instanceof PlatformError ? error.diagnostic() : { code: 'E_COMMAND_FAILED', path: '$', message: error.message };
    process.stdout.write(stableJson({ ok: false, diagnostics: [diagnostic] }));
    process.exitCode = error.exitCode || 1;
  });
}
