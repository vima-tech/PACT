// @pact R003,R004,R005,R009,R010
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { routeCapability } from '../lib/capability-router.mjs';
import { loadAndCheckGovernance } from '../lib/governance.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const docs = await loadAndCheckGovernance(ROOT);

test('generic selects only PACT Core even while Vima products exist', () => {
  assert.deepEqual(routeCapability({ version: '1', kind: 'generic' }, docs), {
    ok: true, profile: 'generic', selected: ['pact-core'], candidates: [], diagnostics: []
  });
});

test('admin-ui lists UI adapter unless it is explicitly preferred', () => {
  assert.deepEqual(routeCapability({ version: '1', kind: 'admin-ui' }, docs).candidates, ['ui-admin-adapter']);
  assert.deepEqual(routeCapability({ version: '1', kind: 'admin-ui', preferredCapabilities: ['ui-admin-adapter'] }, docs).selected,
    ['pact-core', 'ui-admin-adapter', 'vima-ui-admin']);
});

test('business system lists both adapters but blocked Starter is never selected', () => {
  const candidate = routeCapability({ version: '1', kind: 'business-system' }, docs);
  assert.deepEqual(candidate.selected, ['pact-core']);
  assert.deepEqual(candidate.candidates, ['ui-admin-adapter', 'vima-starter-adapter']);
  const blocked = routeCapability({ version: '1', kind: 'business-system', preferredCapabilities: ['vima-starter-adapter'] }, docs);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.diagnostics[0].code, 'E_COMPATIBILITY');
  assert.deepEqual(blocked.selected, []);
});

test('unknown and non-applicable requirements fail closed', () => {
  assert.equal(routeCapability({ version: '1', kind: 'unknown' }, docs).diagnostics[0].code, 'E_REQUIREMENT_INCOMPLETE');
  assert.equal(routeCapability({ version: '1', kind: 'generic', preferredCapabilities: ['ui-admin-adapter'] }, docs).diagnostics[0].code, 'E_CAPABILITY_NOT_APPLICABLE');
});
