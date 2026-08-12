// @pact R029,R033,R035,R038,R039,R042
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');
const cli = resolve(ROOT, 'bin/pact.mjs');
const preinstall = resolve(ROOT, 'platform/scripts/preinstall.mjs');

function run(args, env = {}) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, npm_config_user_agent: '' } });
}

test('help and both version invocations work without npm lifecycle environment', () => {
  const version = run(['--version']);
  assert.equal(version.status, 0);
  assert.equal(version.stdout, '1.0.0\n');
  assert.equal(version.stderr, '');
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /npm i -g @vima-tech\/pact/);
  assert.match(help.stdout, /npx skills add vima-tech\/pact -g/);
});

test('preinstall requires a valid npm >=10 lifecycle user agent', () => {
  for (const userAgent of ['', 'broken', 'npm/9.9.0 node/v20.0.0']) {
    const result = spawnSync(process.execPath, [preinstall], { encoding: 'utf8', env: { ...process.env, npm_config_user_agent: userAgent } });
    assert.equal(result.status, 4, userAgent);
  }
  const valid = spawnSync(process.execPath, [preinstall], { encoding: 'utf8', env: { ...process.env, npm_config_user_agent: 'npm/10.0.0 node/v20.0.0 linux x64' } });
  assert.equal(valid.status, 0, valid.stderr);
});

test('CLI syncs a detected isolated Codex home and doctor becomes ready', async () => {
  const userHome = await mkdtemp(join(tmpdir(), 'pact-cli-home-'));
  try {
    await mkdir(join(userHome, '.codex'));
    const env = { PACT_ALLOW_HOME_OVERRIDE: '1', PACT_USER_HOME: userHome };
    const before = run(['doctor', '--json'], env);
    assert.equal(before.status, 1);
    assert.equal(JSON.parse(before.stdout).status, 'needs-sync');
    const sync = run(['agent', 'sync', '--json'], env);
    assert.equal(sync.status, 0, sync.stderr);
    assert.equal(JSON.parse(sync.stdout).changes, 9);
    const ready = run(['doctor', '--json'], env);
    assert.equal(ready.status, 0, ready.stderr);
    const report = JSON.parse(ready.stdout);
    assert.equal(report.status, 'ready');
    assert.deepEqual(report.diagnostics, []);
  } finally { await rm(userHome, { recursive: true, force: true }); }
});

test('pact install reports the unopened Adapter boundary as an explicit limitation', async () => {
  const userHome = await mkdtemp(join(tmpdir(), 'pact-cli-install-home-'));
  try {
    const result = run(['install', '--json'], { PACT_ALLOW_HOME_OVERRIDE: '1', PACT_USER_HOME: userHome });
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.equal(report.status, 'needs-sync');
    assert.equal(report.diagnostics.some((item) => item.path === 'adapters'), true);
  } finally { await rm(userHome, { recursive: true, force: true }); }
});
