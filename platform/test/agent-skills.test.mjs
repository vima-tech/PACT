// @pact R031,R033,R034,R035,R040,R042
import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  inspectAgentSkills, syncAgentSkills, uninstallAgentSkills
} from '../lib/agent-skills.mjs';
import { loadInstallManifest, SKILL_NAMES } from '../lib/install-manifest.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const manifest = await loadInstallManifest(ROOT);

async function home(agent = '.codex') {
  const path = await mkdtemp(join(tmpdir(), 'pact-agent-home-'));
  await mkdir(join(path, agent), { recursive: true });
  return path;
}

test('detected Agent moves needs-sync -> ready and repeated sync is a no-op', async () => {
  const userHome = await home();
  try {
    const before = await inspectAgentSkills({ packageRoot: ROOT, manifest, userHome });
    assert.equal(before.find(({ id }) => id === 'codex').status, 'needs-sync');
    const first = await syncAgentSkills({ packageRoot: ROOT, manifest, userHome });
    assert.equal(first[0].status, 'ready');
    assert.equal(first[0].changes, 9);
    const second = await syncAgentSkills({ packageRoot: ROOT, manifest, userHome });
    assert.equal(second[0].changes, 0);
    for (const name of SKILL_NAMES) assert.equal((await lstat(join(userHome, '.codex/skills', name))).isSymbolicLink(), true);
    const state = JSON.parse(await readFile(join(userHome, '.local/state/vima-tech/pact/agents/codex.state.v1.json'), 'utf8'));
    assert.equal(state.records.length, 9);
    assert.ok(state.records.every(({ ownership }) => ownership === 'managed'));
  } finally { await rm(userHome, { recursive: true, force: true }); }
});

test('identical pre-existing skills are observed and uninstall never deletes them', async () => {
  const userHome = await home('.claude');
  try {
    const skillsRoot = join(userHome, '.claude/skills');
    await mkdir(skillsRoot);
    for (const name of SKILL_NAMES) await cp(join(ROOT, name), join(skillsRoot, name), { recursive: true });
    const synced = await syncAgentSkills({ packageRoot: ROOT, manifest, userHome });
    assert.equal(synced[0].id, 'claude-code');
    const state = JSON.parse(await readFile(join(userHome, '.local/state/vima-tech/pact/agents/claude-code.state.v1.json'), 'utf8'));
    assert.ok(state.records.every(({ ownership }) => ownership === 'observed'));
    await uninstallAgentSkills({ userHome, packageVersion: manifest.version });
    for (const name of SKILL_NAMES) assert.equal((await lstat(join(skillsRoot, name))).isDirectory(), true);
  } finally { await rm(userHome, { recursive: true, force: true }); }
});

test('uninstall removes exact managed targets and preserves changed target in conflict ledger', async () => {
  const userHome = await home();
  try {
    await syncAgentSkills({ packageRoot: ROOT, manifest, userHome });
    const changed = join(userHome, '.codex/skills/pact');
    await unlink(changed);
    await mkdir(changed);
    await writeFile(join(changed, 'LOCAL.md'), 'user change');
    const result = await uninstallAgentSkills({ userHome, packageVersion: manifest.version });
    assert.equal(result.conflicts.length, 1);
    assert.equal(await readFile(join(changed, 'LOCAL.md'), 'utf8'), 'user change');
    for (const name of SKILL_NAMES.filter((name) => name !== 'pact')) {
      await assert.rejects(() => lstat(join(userHome, '.codex/skills', name)), (error) => error.code === 'ENOENT');
    }
    const ledgerPath = join(userHome, '.local/state/vima-tech/pact/uninstall-conflicts.v1.json');
    const first = await readFile(ledgerPath, 'utf8');
    await uninstallAgentSkills({ userHome, packageVersion: manifest.version });
    assert.equal(await readFile(ledgerPath, 'utf8'), first);
  } finally { await rm(userHome, { recursive: true, force: true }); }
});
