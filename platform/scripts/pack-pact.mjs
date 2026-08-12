#!/usr/bin/env node
// @pact R026,R027,R029,R030,R039
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, resolveInside } from '../lib/core.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const outputFlag = process.argv.indexOf('--output');
const outputDir = resolveInside(ROOT, outputFlag >= 0 ? process.argv[outputFlag + 1] : 'artifacts/release');
await mkdir(outputDir, { recursive: true });
const manifest = spawnSync('node', ['platform/scripts/build-install-manifest.mjs'], { cwd: ROOT, encoding: 'utf8' });
if (manifest.status !== 0) throw new PlatformError('E_COMMAND_FAILED', 'install-manifest', `安装清单生成失败：${manifest.stderr}`, 1);
const result = spawnSync('npm', ['pack', '--pack-destination', outputDir], { cwd: ROOT, encoding: 'utf8' });
if (result.status !== 0) throw new PlatformError('E_COMMAND_FAILED', 'pact-pack', `PACT npm 归档失败：${result.stderr}`, 1);
process.stdout.write(result.stdout);
