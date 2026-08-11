#!/usr/bin/env node
// @pact R015,R016,R017,R024,R025
import { open, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, stableJson } from '../lib/core.mjs';
import { runSerial } from '../lib/run-commands.mjs';
import { normalizedTreeHash } from '../lib/tree-hash.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const registry = await readJson(resolve(ROOT, 'platform/registry/release-units.v1.json'));
const reportPathIndex = process.argv.indexOf('--report');
const reportPath = reportPathIndex >= 0 ? resolve(ROOT, process.argv[reportPathIndex + 1]) : null;
const ids = ['vima-ui-admin', 'vima-starter'];
const products = [];

for (const id of ids) {
  const unit = registry.units.find((candidate) => candidate.id === id);
  const target = resolve(ROOT, id === 'vima-ui-admin' ? 'products/vima-ui-admin' : 'templates/vima-starter');
  const execution = await runSerial(unit.verify, { cwd: ROOT });
  products.push({ id, targetSha256: await normalizedTreeHash(target), checks: execution.results.map(({ id: checkId, exitCode, passed }) => ({ id: checkId, exitCode, passed })), passed: execution.passed });
  if (!execution.passed) break;
}

const report = { version: '1', passed: products.length === ids.length && products.every((item) => item.passed), products };
if (reportPath) {
  await mkdir(dirname(reportPath), { recursive: true });
  const temp = `${reportPath}.tmp`;
  const handle = await open(temp, 'w');
  try { await handle.writeFile(stableJson(report)); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, reportPath);
}
process.stdout.write(stableJson(report));
if (!report.passed) process.exitCode = 1;

