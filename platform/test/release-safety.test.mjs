// @pact R019,R027
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadAndCheckGovernance } from '../lib/governance.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

test('root automation exposes only local plan verify and pack operations', async () => {
  const rootPackage = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  const docs = await loadAndCheckGovernance(ROOT);
  const commands = [
    ...Object.values(rootPackage.scripts),
    ...docs['release-units'].units.flatMap((unit) => [...unit.verify, ...unit.pack].map(({ argv }) => argv.join(' ')))
  ];
  for (const command of commands) {
    assert.doesNotMatch(command, /\bnpm\s+publish\b|\bgit\s+push\b|NPM_TOKEN|NODE_AUTH_TOKEN/);
  }
});
