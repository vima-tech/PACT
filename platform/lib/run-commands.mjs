// @pact R017,R019,R024,R025,R026,R027
import { spawn } from 'node:child_process';
import { PlatformError } from './core.mjs';

const ALLOWED = new Set(['node', 'npm', 'bash', 'mvn']);

export async function runOne(spec, options = {}) {
  if (!Array.isArray(spec.argv) || !ALLOWED.has(spec.argv[0])) throw new PlatformError('E_SCHEMA', spec.id || 'command', '命令不在白名单', 2);
  if (spec.argv[1] === 'publish' || (spec.argv[0] === 'git' && spec.argv[1] === 'push')) throw new PlatformError('E_SCHEMA', spec.id, '禁止外部发布命令', 2);
  return await new Promise((resolve) => {
    const child = spawn(spec.argv[0], spec.argv.slice(1), { cwd: options.cwd, env: options.env || process.env, stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let stdout = '', stderr = '';
    if (options.capture) { child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; }); }
    child.on('error', (error) => resolve({ id: spec.id, argv: spec.argv, exitCode: 127, stdout, stderr: `${stderr}${error.message}`, passed: false }));
    child.on('close', (code) => resolve({ id: spec.id, argv: spec.argv, exitCode: code ?? 1, stdout, stderr, passed: code === 0 }));
  });
}

export async function runSerial(checks, options = {}) {
  const results = [];
  for (const check of checks) {
    const result = await runOne(check, options);
    results.push(result);
    if (!result.passed) break;
  }
  return { passed: results.length === checks.length && results.every((item) => item.passed), results };
}
