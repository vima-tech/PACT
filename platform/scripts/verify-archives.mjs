#!/usr/bin/env node
// @pact R027,R029,R030,R039,R042
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256File, stableJson } from '../lib/core.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const directory = resolve(ROOT, 'artifacts/release');
const report = JSON.parse(await readFile(resolve(directory, 'archives.v1.json'), 'utf8'));
const actual = (await readdir(directory)).filter((name) => name.endsWith('.tgz') || name.endsWith('.tar.gz')).sort();
const expected = report.archives.map(({ name }) => name).sort();
if (report.published !== false || actual.length !== 3 || JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('归档集合不正确');
for (const archive of report.archives) if (await sha256File(resolve(directory, archive.name)) !== archive.sha256) throw new Error(`${archive.name} hash 不匹配`);
if (!actual.some((name) => /^vima-tech-pact-\d+\.\d+\.\d+\.tgz$/.test(name))) throw new Error('PACT 完整 npm tgz 缺失');
process.stdout.write(stableJson({ ok: true, archives: actual }));
