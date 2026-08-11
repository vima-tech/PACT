#!/usr/bin/env node
// @pact R026,R027
import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, resolveInside } from '../lib/core.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const outputFlag = process.argv.indexOf('--output');
const outputDir = resolveInside(ROOT, outputFlag >= 0 ? process.argv[outputFlag + 1] : 'artifacts/release');
const { version } = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
const output = resolve(outputDir, `pact-skills-${version}.tar.gz`);
const inputs = ['pact', 'pact-change', 'pact-check', 'pact-estimate', 'pact-list', 'pact-new', 'pact-review', 'pact-run'];
await mkdir(outputDir, { recursive: true });
const result = spawnSync('tar', [
  '--sort=name', '--mtime=2026-08-11T00:00:00Z', '--owner=0', '--group=0', '--numeric-owner',
  '-czf', output, ...inputs
], { cwd: ROOT, stdio: 'inherit' });
if (result.status !== 0) throw new PlatformError('E_COMMAND_FAILED', 'pact-pack', 'PACT skills 归档失败', 1);
process.stdout.write(`${output}\n`);
