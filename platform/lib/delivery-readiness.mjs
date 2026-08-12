// @pact R028,R041
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PlatformError } from './core.mjs';
import { validateDocument } from './schema-validator.mjs';

const PROFILE_PATH = fileURLToPath(new URL('../registry/delivery-profiles.v1.json', import.meta.url));
const document = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
const validation = validateDocument('profiles', document);
if (!validation.ok) {
  const first = validation.diagnostics[0];
  throw new PlatformError(first.code, first.path, first.message, 2);
}

export const completionLevels = Object.freeze(document.completionLevels.map((level) => Object.freeze({
  id: level.id,
  rank: level.rank,
  requiredEvidence: Object.freeze([...level.requiredEvidence])
})));

const evidenceIds = new Set(completionLevels.flatMap((level) => level.requiredEvidence));
const HEX_64 = /^[a-f0-9]{64}$/;

function schema(path, message) {
  throw new PlatformError('E_SCHEMA', path, message, 2);
}

export function evaluateCompletion(evidence) {
  if (!Array.isArray(evidence)) schema('evidence', '必须是 CompletionEvidence[]');
  const byId = new Map();
  evidence.forEach((record, index) => {
    const path = `evidence.${index}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) schema(path, '必须是对象');
    if (!evidenceIds.has(record.id)) schema(`${path}.id`, '未知 evidence ID');
    if (byId.has(record.id)) schema(`${path}.id`, '重复 evidence ID');
    if (typeof record.passed !== 'boolean') schema(`${path}.passed`, '必须是 boolean');
    if (typeof record.command !== 'string' || !record.command.trim()) schema(`${path}.command`, '不得为空');
    if (!Number.isInteger(record.exitCode)) schema(`${path}.exitCode`, '必须是整数');
    if (!HEX_64.test(record.snapshotSha256 || '')) schema(`${path}.snapshotSha256`, '必须是 64 位小写十六进制');
    if (typeof record.artifact !== 'string' || !record.artifact.trim()) schema(`${path}.artifact`, '不得为空');
    byId.set(record.id, record);
  });

  const levels = [];
  let blocked = false;
  let achieved = null;
  let blockedAt = null;
  for (const level of completionLevels) {
    const passed = !blocked && level.requiredEvidence.every((id) => {
      const record = byId.get(id);
      return record?.passed === true && record.exitCode === 0;
    });
    if (passed) {
      achieved = level.id;
      levels.push({ id: level.id, status: 'achieved' });
    } else {
      blocked = true;
      blockedAt ??= level.id;
      levels.push({ id: level.id, status: 'blocked' });
    }
  }
  return { achieved, blockedAt, levels };
}
