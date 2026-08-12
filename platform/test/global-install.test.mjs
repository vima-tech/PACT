// @pact R029,R031,R032,R034,R035,R039,R040,R042
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');

function npmEnv(root, userHome) {
  return {
    ...process.env,
    PACT_ALLOW_HOME_OVERRIDE: '1',
    PACT_USER_HOME: userHome,
    NPM_TOKEN: 'PACT_TEST_SECRET_MUST_NOT_LEAK',
    npm_config_cache: join(root, 'npm-cache'),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false'
  };
}

function run(command, args, options) {
  return spawnSync(command, args, { ...options, encoding: 'utf8' });
}

test('real scripts-enabled global tgz install auto-registers bundled skills; ignore-scripts remains repairable', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'pact-global-install-'));
  try {
    const archives = join(sandbox, 'archives');
    await mkdir(archives);
    const packed = run('npm', ['pack', '--ignore-scripts', '--pack-destination', archives], { cwd: ROOT, env: npmEnv(sandbox, sandbox) });
    assert.equal(packed.status, 0, packed.stderr);
    const tgz = join(archives, (await readdir(archives)).find((name) => name.endsWith('.tgz')));

    for (const ignoreScripts of [false, true]) {
      const userHome = join(sandbox, ignoreScripts ? 'home-manual' : 'home-auto');
      const prefix = join(sandbox, ignoreScripts ? 'prefix-manual' : 'prefix-auto');
      await mkdir(join(userHome, '.codex'), { recursive: true });
      const env = npmEnv(sandbox, userHome);
      const installArgs = ['install', '-g', '--offline', '--prefix', prefix];
      if (ignoreScripts) installArgs.push('--ignore-scripts');
      installArgs.push(tgz);
      const installed = run('npm', installArgs, { cwd: sandbox, env });
      assert.equal(installed.status, 0, installed.stderr);
      assert.doesNotMatch(`${installed.stdout}${installed.stderr}`, /PACT_TEST_SECRET_MUST_NOT_LEAK/);
      const cli = join(prefix, 'bin/pact');
      let doctor = run(cli, ['doctor', '--json'], { cwd: sandbox, env: { ...env, npm_config_user_agent: '' } });
      assert.equal(doctor.status, ignoreScripts ? 1 : 0, doctor.stderr);
      if (ignoreScripts) {
        const repaired = run(cli, ['agent', 'sync', '--json'], { cwd: sandbox, env: { ...env, npm_config_user_agent: '' } });
        assert.equal(repaired.status, 0, repaired.stderr);
        doctor = run(cli, ['doctor', '--json'], { cwd: sandbox, env: { ...env, npm_config_user_agent: '' } });
      }
      assert.equal(doctor.status, 0, doctor.stderr);
      assert.equal(JSON.parse(doctor.stdout).status, 'ready');
      assert.equal((await readdir(join(userHome, '.codex/skills'))).length, 9);
    }
  } finally { await rm(sandbox, { recursive: true, force: true }); }
});

test('postinstall runtime has no network, subprocess or credential-reading imports', async () => {
  const files = [
    'platform/scripts/postinstall.mjs',
    'platform/lib/agent-skills.mjs',
    'platform/lib/install-manifest.mjs',
    'platform/lib/core.mjs'
  ];
  for (const path of files) {
    const source = await readFile(resolve(ROOT, path), 'utf8');
    assert.doesNotMatch(source, /node:(?:child_process|http|https|http2|net|dns)|NPM_TOKEN|NODE_AUTH_TOKEN|skills add/);
  }
});
