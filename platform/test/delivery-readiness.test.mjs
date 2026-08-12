// @pact R028,R041
import assert from 'node:assert/strict';
import test from 'node:test';
import { completionLevels, evaluateCompletion } from '../lib/delivery-readiness.mjs';

const hash = 'a'.repeat(64);
const allEvidence = () => completionLevels.flatMap((level) => level.requiredEvidence.map((id) => ({
  id,
  passed: true,
  command: `verify ${id}`,
  exitCode: 0,
  snapshotSha256: hash,
  artifact: `artifacts/${id}.json`
})));

test('completion levels are the closed eight-stage business delivery model', () => {
  assert.deepEqual(completionLevels.map(({ id, rank }) => [id, rank]), [
    ['implemented', 1], ['buildable', 2], ['startable', 3], ['integrated', 4],
    ['business-closed-loop', 5], ['accepted', 6], ['deployable', 7], ['stable', 8]
  ]);
});

test('completion aggregates sequentially and stable has no blockedAt', () => {
  const complete = evaluateCompletion(allEvidence());
  assert.equal(complete.achieved, 'stable');
  assert.equal(complete.blockedAt, null);
  assert.ok(complete.levels.every(({ status }) => status === 'achieved'));

  const partial = allEvidence().filter(({ id }) => id !== 'real-start-pass');
  const report = evaluateCompletion(partial);
  assert.equal(report.achieved, 'buildable');
  assert.equal(report.blockedAt, 'startable');
  assert.deepEqual(report.levels.map(({ status }) => status), [
    'achieved', 'achieved', 'blocked', 'blocked', 'blocked', 'blocked', 'blocked', 'blocked'
  ]);
});

test('completion rejects malformed, duplicate and unknown evidence', () => {
  const valid = allEvidence()[0];
  for (const evidence of [
    {},
    [{ ...valid, id: 'unknown' }],
    [valid, valid],
    [{ ...valid, command: '' }],
    [{ ...valid, exitCode: 0.5 }],
    [{ ...valid, snapshotSha256: 'bad' }],
    [{ ...valid, artifact: '' }]
  ]) {
    assert.throws(() => evaluateCompletion(evidence), (error) => error.code === 'E_SCHEMA' && error.exitCode === 2);
  }
});
