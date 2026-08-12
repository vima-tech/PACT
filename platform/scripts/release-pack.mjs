#!/usr/bin/env node
// @pact R024,R025,R026,R027,R029,R030,R039,R042
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, resolveInside, sha256File, stableJson } from '../lib/core.mjs';
import { loadAndCheckGovernance } from '../lib/governance.mjs';
import { runSerial } from '../lib/run-commands.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const flag = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const outputDir = resolveInside(ROOT, flag('--output') || 'artifacts/release');

try {
  const manifestBuild = spawnSync('node', ['platform/scripts/build-install-manifest.mjs'], { cwd: ROOT, stdio: 'inherit' });
  if (manifestBuild.status !== 0) throw new PlatformError('E_COMMAND_FAILED', 'install-manifest', '安装清单生成失败', 1);
  const docs = await loadAndCheckGovernance(ROOT);
  const checks = docs['release-units'].units.flatMap((unit) => unit.verify.map((check) => ({ ...check, id: `${unit.id}:${check.id}` })));
  const verification = await runSerial(checks, { cwd: ROOT });
  if (!verification.passed) throw new PlatformError('E_COMMAND_FAILED', verification.results.at(-1)?.id || 'verify', '发布前门禁失败', 1);
  await mkdir(outputDir, { recursive: true });
  for (const name of await readdir(outputDir)) {
    if (name.endsWith('.tgz') || name.endsWith('.tar.gz') || name === 'archives.v1.json') await rm(resolve(outputDir, name), { force: true });
  }

  const { version: platformVersion } = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  const { version: uiVersion } = JSON.parse(await readFile(resolve(ROOT, 'products/vima-ui-admin/package.json'), 'utf8'));
  const { version: starterVersion } = JSON.parse(await readFile(resolve(ROOT, 'templates/vima-starter/cli/package.json'), 'utf8'));
  const expected = [
    `vima-tech-pact-${platformVersion}.tgz`,
    `vima-tech-ui-admin-${uiVersion}.tgz`,
    `create-vima-starter-${starterVersion}.tgz`
  ].sort();

  const packCalls = [
    ['npm', ['pack', '--pack-destination', outputDir]],
    ['npm', ['pack', './products/vima-ui-admin', '--pack-destination', outputDir]],
    ['npm', ['pack', './templates/vima-starter/cli', '--pack-destination', outputDir]]
  ];
  for (const [command, args] of packCalls) {
    const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
    if (result.status !== 0) throw new PlatformError('E_COMMAND_FAILED', 'release-pack', `${command} 本地归档失败`, 1);
  }

  const actual = (await readdir(outputDir)).filter((name) => name.endsWith('.tgz') || name.endsWith('.tar.gz')).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new PlatformError('E_COMMAND_FAILED', 'artifacts/release', '本地归档集合不是约定的三份', 1);
  const archives = [];
  for (const name of actual) archives.push({ name: basename(name), sha256: await sha256File(resolve(outputDir, name)) });
  const report = { version: '1', published: false, archives };
  await writeFile(resolve(outputDir, 'archives.v1.json'), stableJson(report));
  process.stdout.write(stableJson(report));
} catch (error) {
  const diagnostic = error instanceof PlatformError ? error.diagnostic() : { code: 'E_COMMAND_FAILED', path: '$', message: error.message };
  process.stdout.write(stableJson({ ok: false, diagnostics: [diagnostic] }));
  process.exitCode = error.exitCode || 1;
}
