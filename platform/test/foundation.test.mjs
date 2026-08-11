// @pact R001,R007,R012,R014
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateDocument, schemaIds } from '../lib/schema-validator.mjs';
import { assertTargetSafe, EXCLUDED_SEGMENTS, normalizedTreeHash } from '../lib/tree-hash.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('core boundary contains no Vima product dependency', async () => {
  const roots = (await readdir(ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && (entry.name === 'pact' || entry.name.startsWith('pact-')))
    .map((entry) => join(ROOT, entry.name));
  async function files(dir) {
    const found = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) found.push(...await files(path));
      else found.push(path);
    }
    return found;
  }
  for (const dir of roots) for (const path of await files(dir)) {
    const text = await readFile(path, 'utf8').catch(() => '');
    assert.equal(/products\/vima-ui-admin|templates\/vima-starter/.test(text), false, path);
  }
});

test('all six schema descriptors exist and malformed roots fail', async () => {
  assert.deepEqual([...schemaIds].sort(), ['adapters', 'capabilities', 'compatibility', 'profiles', 'provenance', 'release-units']);
  for (const id of schemaIds) {
    const filename = id === 'profiles' ? 'delivery-profiles.v1.schema.json' : `${id}.v1.schema.json`;
    const schema = JSON.parse(await readFile(join(ROOT, 'platform/schemas', filename), 'utf8'));
    assert.equal(schema.type, 'object');
    assert.equal(validateDocument(id, {}).ok, false);
  }
});

test('tree hash ignores exactly the closed generated-directory set', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pact-tree-'));
  try {
    await writeFile(join(root, 'source.txt'), 'stable');
    const before = await normalizedTreeHash(root);
    for (const segment of EXCLUDED_SEGMENTS) { await mkdir(join(root, segment)); await writeFile(join(root, segment, 'noise'), segment); }
    assert.equal(await normalizedTreeHash(root), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('migration conflict leaves different target untouched', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pact-conflict-'));
  const source = join(root, 'source');
  const target = join(root, 'target');
  try {
    await mkdir(source); await mkdir(target);
    await writeFile(join(source, 'a.txt'), 'source');
    await writeFile(join(target, 'a.txt'), 'target');
    const targetBefore = await normalizedTreeHash(target);
    await assert.rejects(() => assertTargetSafe(source, target), (error) => error.code === 'E_MIGRATION_CONFLICT');
    assert.equal(await normalizedTreeHash(target), targetBefore);
  } finally { await rm(root, { recursive: true, force: true }); }
});
