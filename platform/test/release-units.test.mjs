// @pact R017,R019,R027
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runSerial } from '../lib/run-commands.mjs';
import { validateDocument } from '../lib/schema-validator.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('release units are three independent valid units', async () => {
  const doc = JSON.parse(await readFile(resolve(ROOT, 'platform/registry/release-units.v1.json'), 'utf8'));
  assert.equal(validateDocument('release-units', doc).ok, true);
  assert.deepEqual(doc.units.map((item) => item.id), ['pact-skills', 'vima-ui-admin', 'vima-starter']);
  for (const unit of doc.units) for (const command of [...unit.verify, ...unit.pack]) {
    assert.notEqual(command.argv[1], 'publish');
    assert.equal(command.argv.some((arg) => /NPM_TOKEN/.test(arg)), false);
  }
});

test('serial runner stops after first failure', async () => {
  const report = await runSerial([
    { id: 'first', argv: ['node', '-e', 'process.exit(0)'] },
    { id: 'failure', argv: ['node', '-e', 'process.exit(7)'] },
    { id: 'must-not-run', argv: ['node', '-e', 'process.exit(0)'] }
  ], { cwd: ROOT, capture: true });
  assert.equal(report.passed, false);
  assert.deepEqual(report.results.map((item) => item.id), ['first', 'failure']);
});
