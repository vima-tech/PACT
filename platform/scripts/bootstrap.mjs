#!/usr/bin/env node
// @pact R017,R024,R025
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSerial } from '../lib/run-commands.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [
  { id: 'bootstrap-ui', argv: ['npm', '--prefix', 'products/vima-ui-admin', 'ci'] },
  { id: 'bootstrap-starter', argv: ['npm', '--prefix', 'templates/vima-starter', 'ci'] }
];
const report = await runSerial(checks, { cwd: ROOT });
if (!report.passed) process.exitCode = 1;

