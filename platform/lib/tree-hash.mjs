// @pact R012,R013,R014
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink, realpath } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { PlatformError } from './core.mjs';

export const EXCLUDED_SEGMENTS = Object.freeze([
  'node_modules', 'dist', 'dist-site', 'target', 'reports', '.vite', '.qoder', '.playwright-mcp'
]);

function posixRelative(root, path) {
  return relative(root, path).split(sep).join('/').normalize('NFC');
}

function encodeRecord(type, path, content) {
  const pathBytes = Buffer.from(path, 'utf8');
  const head = Buffer.alloc(13);
  head[0] = type;
  head.writeUInt32BE(pathBytes.length, 1);
  head.writeBigUInt64BE(BigInt(content.length), 5);
  return Buffer.concat([head.subarray(0, 5), pathBytes, head.subarray(5), content]);
}

export async function listSnapshotEntries(root) {
  const absoluteRoot = await realpath(resolve(root));
  const entries = [];
  async function walk(dir) {
    for (const name of await readdir(dir)) {
      if (EXCLUDED_SEGMENTS.includes(name)) continue;
      const full = resolve(dir, name);
      const stat = await lstat(full);
      const path = posixRelative(absoluteRoot, full);
      if (stat.isDirectory()) await walk(full);
      else if (stat.isFile()) entries.push({ type: 'file', path, full });
      else if (stat.isSymbolicLink()) {
        const target = await readlink(full);
        if (target.startsWith('/') || resolve(dir, target).split(sep).includes('..') || !resolve(dir, target).startsWith(`${absoluteRoot}${sep}`)) {
          throw new PlatformError('E_PATH_ESCAPE', path, '快照包含绝对或逃逸软链', 6);
        }
        entries.push({ type: 'link', path, target });
      }
    }
  }
  await walk(absoluteRoot);
  return entries.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
}

export async function normalizedTreeHash(root) {
  const hash = createHash('sha256');
  for (const entry of await listSnapshotEntries(root)) {
    const content = entry.type === 'file' ? await readFile(entry.full) : Buffer.from(entry.target, 'utf8');
    hash.update(encodeRecord(entry.type === 'file' ? 0x66 : 0x6c, entry.path, content));
  }
  return hash.digest('hex');
}

export async function assertTargetSafe(source, target) {
  let targetStat;
  try { targetStat = await lstat(target); } catch (error) { if (error.code === 'ENOENT') return 'absent'; throw error; }
  if (!targetStat.isDirectory()) throw new PlatformError('E_MIGRATION_CONFLICT', target, '迁移目标存在且不是目录', 6);
  const [sourceHash, targetHash] = await Promise.all([normalizedTreeHash(source), normalizedTreeHash(target)]);
  if (sourceHash !== targetHash) throw new PlatformError('E_MIGRATION_CONFLICT', target, '迁移目标已有不同内容', 6);
  return 'identical';
}

