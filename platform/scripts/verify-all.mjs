#!/usr/bin/env node
// @pact R001,R007,R011,R017,R018,R020,R024,R025,R026,R027
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, stableJson } from '../lib/core.mjs';
import { runSerial } from '../lib/run-commands.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const checks = [
  { id: 'platform-tests', argv: ['npm', 'test'] },
  { id: 'governance', argv: ['node', 'platform/scripts/governance-check.mjs'] },
  { id: 'migration', argv: ['node', 'platform/scripts/migration.mjs', 'verify'] },
  { id: 'products', argv: ['node', 'platform/scripts/verify-products.mjs'] },
  { id: 'release-plan', argv: ['node', 'platform/scripts/release-plan.mjs', '--base', 'HEAD^'] },
  { id: 'release-archives', argv: ['node', 'platform/scripts/verify-archives.mjs'] },
  { id: 'pact-lint-self-test', argv: ['bash', 'pact/scripts/pact-lint.sh', '--self-test'] },
  { id: 'pact-material', argv: ['bash', 'pact/scripts/pact-check.sh', '.pact/pact-platform-unification'] },
  { id: 'pact-review', argv: ['bash', 'pact/scripts/pact-review.sh', '.pact/pact-platform-unification'] }
];

const report = await runSerial(checks, { cwd: ROOT });
process.stdout.write(stableJson({
  passed: report.passed,
  checks: report.results.map(({ id, exitCode, passed }) => ({ id, exitCode, passed }))
}));
if (!report.passed) {
  const failed = report.results.at(-1);
  const error = new PlatformError('E_COMMAND_FAILED', failed?.id || 'verify', '全量验证失败', 1);
  process.stderr.write(`${error.code}: ${error.path}: ${error.message}\n`);
  process.exitCode = 1;
}
