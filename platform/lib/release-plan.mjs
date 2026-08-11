// @pact R020,R021,R022,R023
import { PlatformError } from './core.mjs';
import { execFileSync } from 'node:child_process';

function globRegex(glob) {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') { pattern += '.*'; index += 1; }
    else if (char === '*') pattern += '[^/]*';
    else pattern += char.replace(/[\\^$+?.()|{}[\]]/g, '\\$&');
  }
  return new RegExp(`${pattern}$`);
}

export function pathsFromNameStatus(text) {
  const paths = [];
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const fields = line.split('\t');
    if (/^[RC]/.test(fields[0])) paths.push(fields[1], fields[2]);
    else paths.push(fields[1]);
  }
  return paths.filter(Boolean);
}

export function collectGitChangedPaths(base, cwd) {
  if (!base) throw new PlatformError('E_SCHEMA', 'argv.--base', '必须显式提供 Git baseline', 2);
  try { execFileSync('git', ['rev-parse', '--verify', `${base}^{commit}`], { cwd, stdio: 'ignore' }); }
  catch { throw new PlatformError('E_BASELINE_UNKNOWN', 'argv.--base', `无法解析 baseline：${base}`, 4); }
  const calls = [
    ['diff', '--name-status', '--find-renames', `${base}...HEAD`],
    ['diff', '--cached', '--name-status', '--find-renames'],
    ['diff', '--name-status', '--find-renames']
  ];
  const paths = calls.flatMap((args) => pathsFromNameStatus(execFileSync('git', args, { cwd, encoding: 'utf8' })));
  paths.push(...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
  return [...new Set(paths)].sort();
}

export function planRelease(changedPaths, units, base) {
  if (!Array.isArray(changedPaths)) throw new PlatformError('E_SCHEMA', 'changedPaths', '必须是数组', 2);
  const paths = [...new Set(changedPaths.map((path) => path.replaceAll('\\', '/')).filter(Boolean))].sort();
  const direct = new Set();
  const verification = new Set();
  const reasons = {};
  const addReason = (unit, reason) => {
    verification.add(unit);
    reasons[unit] ??= [];
    if (!reasons[unit].includes(reason)) reasons[unit].push(reason);
  };

  for (const path of paths) {
    if (path === 'artifacts' || path.startsWith('artifacts/')) continue;
    const owners = units.filter((unit) => unit.paths.some((glob) => globRegex(glob).test(path)));
    if (owners.length > 1) throw new PlatformError('E_PATH_OWNERSHIP', path, `路径同时归属 ${owners.map(({ id }) => id).join(',')}`, 5);
    if (owners.length === 1) {
      const owner = owners[0];
      direct.add(owner.id);
      addReason(owner.id, `direct:${path}`);
      continue;
    }
    if (path === '.pact' || path.startsWith('.pact/')) addReason('pact-skills', `material:${path}`);
    else if (path === 'platform' || path.startsWith('platform/') || ['package.json', 'package-lock.json', 'README.md', 'CLAUDE.md', '.gitignore'].includes(path)) {
      for (const unit of units) addReason(unit.id, `shared:${path}`);
    }
  }

  for (const id of direct) {
    const unit = units.find((candidate) => candidate.id === id);
    for (const dependent of unit.verifyDependents) addReason(dependent, `verify-dependent:${id}`);
  }
  for (const id of direct) verification.add(id);
  for (const values of Object.values(reasons)) values.sort();
  return {
    version: '1',
    base,
    directReleaseUnits: [...direct].sort(),
    verificationUnits: [...verification].sort(),
    reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b)))
  };
}
