// @pact R002,R006,R007,R008,R010,R019
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { assertCompatibilityIdentities, loadAndCheckGovernance, registryFiles } from '../lib/governance.mjs';
import { validateDocument } from '../lib/schema-validator.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

test('all six live governance documents pass schema and semantic evidence checks', async () => {
  const docs = await loadAndCheckGovernance(ROOT);
  assert.equal(Object.keys(docs).length, 6);
});

test('each governance schema rejects a malformed fixture', async () => {
  for (const [schemaId, path] of Object.entries(registryFiles)) {
    const doc = JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));
    doc.version = '999';
    assert.equal(validateDocument(schemaId, doc).ok, false, schemaId);
  }
});

test('same provider semver with a different contract hash is a compatibility conflict', () => {
  const base = { provider: 'vima-ui-admin', providerVersion: '0.1.0' };
  assert.throws(() => assertCompatibilityIdentities([
    { ...base, providerContentSha256: 'a'.repeat(64) },
    { ...base, providerContentSha256: 'b'.repeat(64) }
  ]), (error) => error.code === 'E_COMPATIBILITY');
});

test('provenance finalized phase requires retiredAt and a backup snapshot', async () => {
  const doc = JSON.parse(await readFile(resolve(ROOT, 'platform/registry/provenance.v1.json'), 'utf8'));
  const fixture = structuredClone(doc);
  fixture.imports = fixture.imports.map((item) => ({
    ...item,
    phase: 'finalized',
    snapshotPath: item.backupPath,
    retiredAt: '2026-08-11T10:00:00.000Z'
  }));
  assert.equal(validateDocument('provenance', fixture).ok, true);
  fixture.imports[0].retiredAt = null;
  assert.equal(validateDocument('provenance', fixture).ok, false);
});
