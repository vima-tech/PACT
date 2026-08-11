// @pact R011,R012,R013,R014,R018
import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, readlink, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXCLUDED_SEGMENTS, normalizedTreeHash } from '../lib/tree-hash.mjs';
import { assertExactAlias, restoreLinkedAliases } from '../scripts/migration.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('provenance snapshot and canonical target hashes match in every migration phase', async () => {
  const doc = JSON.parse(await readFile(resolve(ROOT, 'platform/registry/provenance.v1.json'), 'utf8'));
  for (const item of doc.imports) {
    assert.equal(await normalizedTreeHash(item.snapshotPath), item.normalizedSha256, `${item.id}:snapshot`);
    assert.equal(await normalizedTreeHash(resolve(ROOT, item.targetPath)), item.normalizedSha256, `${item.id}:target`);
    if (item.phase === 'linked') {
      assert.equal((await lstat(item.originalPath)).isSymbolicLink(), true, item.id);
      assert.equal(await readlink(item.originalPath), resolve(ROOT, item.targetPath), item.id);
      assert.equal(item.retiredAt, null, item.id);
    } else if (item.phase === 'finalized') {
      await assert.rejects(lstat(item.originalPath), (error) => error.code === 'ENOENT');
      assert.equal(Number.isNaN(Date.parse(item.retiredAt)), false, item.id);
    } else {
      assert.fail(`unexpected live phase: ${item.phase}`);
    }
  }
});

test('closed exclusion set is stable', () => {
  assert.deepEqual(EXCLUDED_SEGMENTS, ['node_modules', 'dist', 'dist-site', 'target', 'reports', '.vite', '.qoder', '.playwright-mcp']);
});

test('staged import manifest contains no excluded path and target hashes match', async () => {
  const manifest = JSON.parse(await readFile(resolve(ROOT, 'artifacts/migration/import-manifest.v1.json'), 'utf8'));
  const provenance = JSON.parse(await readFile(resolve(ROOT, 'platform/registry/provenance.v1.json'), 'utf8'));
  for (const product of manifest.products) {
    assert.equal(product.entries.some((entry) => entry.path.split('/').some((segment) => EXCLUDED_SEGMENTS.includes(segment))), false);
    const item = provenance.imports.find((candidate) => candidate.id === product.id);
    assert.equal(await normalizedTreeHash(resolve(ROOT, item.targetPath)), item.normalizedSha256);
  }
});

test('finalize recovery restores only a missing exact alias and rejects wrong identities', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pact-finalize-'));
  const target = join(root, 'target');
  const alias = join(root, 'alias');
  try {
    await mkdir(target);
    const entry = { originalPath: alias, linkText: target };
    await restoreLinkedAliases([entry]);
    assert.equal(await readlink(alias), target);
    await assertExactAlias(alias, target);
    await rm(alias);
    await symlink(join(root, 'wrong'), alias, 'dir');
    await assert.rejects(() => restoreLinkedAliases([entry]), (error) => error.code === 'E_MIGRATION_CONFLICT');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
