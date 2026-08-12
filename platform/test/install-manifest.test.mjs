// @pact R029,R030,R032,R036,R039,R042
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadInstallManifest, SKILL_NAMES } from '../lib/install-manifest.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

test('public package and manifest bind both bins, runtime and all nine skills', async () => {
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  const manifest = await loadInstallManifest(ROOT);
  assert.equal(pkg.name, '@vima-tech/pact');
  assert.notEqual(pkg.private, true);
  assert.deepEqual(pkg.bin, { pact: 'bin/pact.mjs', 'vima-pact': 'bin/pact.mjs' });
  assert.deepEqual(pkg.files, [
    'bin/**', 'docs/**', 'pact/**', 'pact-change/**', 'pact-check/**', 'pact-estimate/**',
    'pact-install/**', 'pact-list/**', 'pact-new/**', 'pact-review/**', 'pact-run/**',
    'platform/adapters/**', 'platform/lib/**', 'platform/registry/**', 'platform/schemas/**',
    'platform/scripts/capability-router.mjs', 'platform/scripts/governance-check.mjs',
    'platform/scripts/preinstall.mjs', 'platform/scripts/postinstall.mjs',
    'platform/scripts/preuninstall.mjs', 'install-manifest.json', 'CLAUDE.md'
  ]);
  assert.deepEqual(manifest.skills.map(({ name }) => name), SKILL_NAMES);
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.runtime.files.some(({ path }) => path === 'package.json'));
  assert.ok(manifest.runtime.files.some(({ path }) => path === 'bin/pact.mjs'));
  assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
});

test('npm dry-run contains the complete PACT package and excludes product/user material', () => {
  const packed = spawnSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const files = JSON.parse(packed.stdout)[0].files.map(({ path }) => path);
  for (const required of ['bin/pact.mjs', 'docs/installation.md', 'install-manifest.json', ...SKILL_NAMES.map((name) => `${name}/SKILL.md`)]) assert.ok(files.includes(required), required);
  for (const path of files) assert.doesNotMatch(path, /^(?:products|templates|\.pact|artifacts|platform\/test|\.playwright-mcp)\//);
});

test('pinned real skills CLI discovers exactly the nine public skills', () => {
  const cli = resolve(ROOT, 'node_modules/.bin/skills');
  const result = spawnSync(cli, ['add', '.', '--list'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', CI: '1' } });
  assert.equal(result.status, 0, result.stderr);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /Found 9 skills/);
  for (const name of SKILL_NAMES) assert.match(output, new RegExp(`(?:^|\\s)${name}(?:\\s|$)`));
});
