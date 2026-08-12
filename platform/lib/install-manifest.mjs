// @pact R029,R030,R032,R039
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink, realpath } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { PlatformError, sha256File, stableJson } from './core.mjs';

export const SKILL_NAMES = Object.freeze([
  'pact', 'pact-change', 'pact-check', 'pact-estimate', 'pact-install',
  'pact-list', 'pact-new', 'pact-review', 'pact-run'
]);
export const AGENT_TARGETS = Object.freeze(['claude-code', 'codex', 'cursor', 'universal']);
export const SKILL_EXCLUDES = Object.freeze(['.git', 'node_modules', '.DS_Store']);
export const PUBLIC_SCRIPTS = Object.freeze([
  'platform/scripts/capability-router.mjs',
  'platform/scripts/governance-check.mjs',
  'platform/scripts/postinstall.mjs',
  'platform/scripts/preinstall.mjs',
  'platform/scripts/preuninstall.mjs'
]);
export const RESOURCE_PATHS = Object.freeze([
  'docs', 'platform/adapters', 'platform/registry', 'platform/schemas'
]);

const HEX = /^[a-f0-9]{64}$/;

function fail(path, message) {
  throw new PlatformError('E_INSTALL_MANIFEST', path, message, 3);
}

function encodeRecord(type, path, content) {
  const pathBytes = Buffer.from(path, 'utf8');
  const header = Buffer.alloc(13);
  header[0] = type;
  header.writeUInt32BE(pathBytes.length, 1);
  header.writeBigUInt64BE(BigInt(content.length), 5);
  return Buffer.concat([header.subarray(0, 5), pathBytes, header.subarray(5), content]);
}

function inside(root, candidate) {
  const base = resolve(root);
  const target = resolve(candidate);
  return target === base || target.startsWith(`${base}${sep}`);
}

export async function installTreeHash(root) {
  const sourceRoot = await realpath(resolve(root)).catch(() => fail(root, '资源目录不存在'));
  const entries = [];
  async function walk(directory) {
    const names = await readdir(directory);
    for (const name of names.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))) {
      if (SKILL_EXCLUDES.includes(name)) continue;
      const absolute = resolve(directory, name);
      const stat = await lstat(absolute);
      const path = relative(sourceRoot, absolute).split(sep).join('/').normalize('NFC');
      if (stat.isDirectory()) await walk(absolute);
      else if (stat.isFile()) entries.push({ type: 0x66, path, content: await readFile(absolute) });
      else if (stat.isSymbolicLink()) {
        const linkText = await readlink(absolute);
        if (linkText.startsWith('/') || !inside(sourceRoot, resolve(dirname(absolute), linkText))) fail(path, '不允许绝对或越界软链');
        entries.push({ type: 0x6c, path, content: Buffer.from(linkText, 'utf8') });
      } else fail(path, '只允许普通文件、目录和安全软链');
    }
  }
  await walk(sourceRoot);
  entries.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const hash = createHash('sha256');
  for (const entry of entries) hash.update(encodeRecord(entry.type, entry.path, entry.content));
  return hash.digest('hex');
}

async function listMjs(directory, packageRoot) {
  const result = [];
  for (const name of await readdir(directory)) {
    const path = resolve(directory, name);
    const stat = await lstat(path);
    if (stat.isDirectory()) result.push(...await listMjs(path, packageRoot));
    else if (stat.isFile() && name.endsWith('.mjs')) result.push(relative(packageRoot, path).split(sep).join('/'));
  }
  return result;
}

export async function buildInstallManifest(packageRoot) {
  const root = resolve(packageRoot);
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const runtimePaths = [
    'bin/pact.mjs',
    ...await listMjs(resolve(root, 'platform/lib'), root),
    ...PUBLIC_SCRIPTS,
    'package.json'
  ].sort();
  const runtimeFiles = [];
  for (const path of runtimePaths) runtimeFiles.push({ path, sha256: await sha256File(resolve(root, path)) });
  const skills = [];
  for (const name of SKILL_NAMES) {
    const skillPath = resolve(root, name);
    const skillFile = resolve(skillPath, 'SKILL.md');
    const stat = await lstat(skillFile).catch(() => fail(name, 'Skill 缺少 SKILL.md'));
    if (!stat.isFile()) fail(name, 'SKILL.md 必须是普通文件');
    skills.push({ name, path: name, sha256: await installTreeHash(skillPath) });
  }
  const resources = [];
  for (const path of RESOURCE_PATHS) resources.push({ path, sha256: await installTreeHash(resolve(root, path)) });
  return {
    version: pkg.version,
    skills,
    runtime: { entry: 'bin/pact.mjs', files: runtimeFiles },
    resources,
    agentTargets: [...AGENT_TARGETS]
  };
}

function same(left, right) {
  return stableJson(left) === stableJson(right);
}

export async function loadInstallManifest(packageRoot) {
  const root = resolve(packageRoot);
  let pkg;
  let manifest;
  try {
    pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    manifest = JSON.parse(await readFile(resolve(root, 'install-manifest.json'), 'utf8'));
  } catch (error) {
    fail('install-manifest.json', `无法读取安装清单：${error.message}`);
  }
  if (pkg.name !== '@vima-tech/pact' || pkg.private === true) fail('package.json.name', '公开包身份不正确');
  if (manifest.version !== pkg.version) fail('version', '清单与 package 版本不一致');
  if (!same(pkg.bin, { pact: 'bin/pact.mjs', 'vima-pact': 'bin/pact.mjs' })) fail('package.json.bin', '双 CLI 映射不正确');
  if (!same(pkg.os, ['linux', 'darwin']) || pkg.engines?.node !== '>=20' || pkg.engines?.npm !== '>=10') fail('package.json.engines', '支持矩阵不正确');
  if (pkg.dependencies && Object.keys(pkg.dependencies).length) fail('package.json.dependencies', '运行时 dependencies 必须为 0');
  if (!same(manifest.agentTargets, AGENT_TARGETS)) fail('agentTargets', 'Agent 目标闭集不正确');
  if (!same(manifest.skills?.map(({ name }) => name), SKILL_NAMES)) fail('skills', '九个 Skill 清单不正确');
  const expected = await buildInstallManifest(root);
  if (!same(manifest, expected)) fail('install-manifest.json', '清单哈希或发行闭集与当前包不一致');
  for (const section of [manifest.skills, manifest.runtime.files, manifest.resources]) {
    for (const item of section) if (!HEX.test(item.sha256 || '')) fail(item.path || item.name, '哈希非法');
  }
  return manifest;
}
