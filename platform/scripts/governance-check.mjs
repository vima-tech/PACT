#!/usr/bin/env node
// @pact R002,R006,R007,R008,R010,R019
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformError, stableJson } from '../lib/core.mjs';
import { loadAndCheckGovernance, registryFiles } from '../lib/governance.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

try {
  const docs = await loadAndCheckGovernance(ROOT);
  process.stdout.write(stableJson({
    ok: true,
    schemas: Object.keys(registryFiles).sort(),
    capabilities: docs.capabilities.capabilities.map(({ id, readiness }) => ({ id, readiness }))
  }));
} catch (error) {
  const diagnostic = error instanceof PlatformError
    ? error.diagnostic()
    : { code: 'E_COMMAND_FAILED', path: '$', message: error.message };
  process.stdout.write(stableJson({ ok: false, diagnostics: [diagnostic] }));
  process.exitCode = error.exitCode || 1;
}
