// @pact R020,R021,R022,R023
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { stableJson } from '../lib/core.mjs';
import { loadAndCheckGovernance } from '../lib/governance.mjs';
import { collectGitChangedPaths, pathsFromNameStatus, planRelease } from '../lib/release-plan.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const units = (await loadAndCheckGovernance(ROOT))['release-units'].units;

test('added modified deleted and rename status paths are all retained', () => {
  assert.deepEqual(pathsFromNameStatus('A\tpact/a\nM\tproducts/vima-ui-admin/a\nD\ttemplates/vima-starter/a\nR100\told\tnew\n'),
    ['pact/a', 'products/vima-ui-admin/a', 'templates/vima-starter/a', 'old', 'new']);
});

test('UI public change releases UI but only propagates verification to Starter', () => {
  const plan = planRelease(['products/vima-ui-admin/src/agent/types.ts'], units, 'fixture');
  assert.deepEqual(plan.directReleaseUnits, ['vima-ui-admin']);
  assert.deepEqual(plan.verificationUnits, ['vima-starter', 'vima-ui-admin']);
  assert.deepEqual(plan.reasons['vima-starter'], ['verify-dependent:vima-ui-admin']);
});

test('release plan is byte deterministic and shared files verify all units', () => {
  const first = stableJson(planRelease(['platform/x', 'README.md'], units, 'fixture'));
  const second = stableJson(planRelease(['README.md', 'platform/x', 'README.md'], units, 'fixture'));
  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first).verificationUnits, ['pact-skills', 'vima-starter', 'vima-ui-admin']);
});

test('overlapping direct ownership and unknown baseline fail closed', () => {
  const overlapping = [...units, { ...units[0], id: 'duplicate', paths: ['products/**'] }];
  assert.throws(() => planRelease(['products/vima-ui-admin/a'], overlapping, 'fixture'), (error) => error.code === 'E_PATH_OWNERSHIP');
  assert.throws(() => collectGitChangedPaths('definitely-not-a-ref', ROOT), (error) => error.code === 'E_BASELINE_UNKNOWN');
});
