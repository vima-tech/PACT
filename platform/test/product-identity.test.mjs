// @pact R015,R016
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('Vima UI Admin keeps package identity and declared agent exports', async () => {
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'products/vima-ui-admin/package.json'), 'utf8'));
  assert.equal(pkg.name, '@vima-tech/ui-admin');
  for (const key of ['.', './agent', './agent/schema/app-spec.v1.json', './ai-manifest.json', './style.css']) assert.ok(pkg.exports[key], key);
  await access(resolve(ROOT, 'products/vima-ui-admin/src/agent/index.ts'));
});

test('Vima Starter keeps CLI identity and frontend/backend template truths', async () => {
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'templates/vima-starter/cli/package.json'), 'utf8'));
  assert.equal(pkg.name, 'create-vima-starter');
  assert.equal(pkg.bin['create-vima-starter'], './index.js');
  await access(resolve(ROOT, 'templates/vima-starter/frontend/package.json'));
  await access(resolve(ROOT, 'templates/vima-starter/backend/pom.xml'));
  await access(resolve(ROOT, 'templates/vima-starter/scripts/sync-template.mjs'));
});
