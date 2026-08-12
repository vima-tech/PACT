// @pact R005,R006,R007,R008,R010,R019,R023,R041
import { PlatformError } from './core.mjs';
import { EXCLUDED_SEGMENTS } from './tree-hash.mjs';

const CAPABILITIES = new Set(['pact-core', 'vima-ui-admin', 'vima-starter', 'ui-admin-adapter', 'vima-starter-adapter']);
const SUPPORTS = new Set(['pact-specification', 'action-graph', 'vue3-admin-ui', 'ui-artifact-plan', 'spring-boot-host', 'starter-cli', 'ui-admin-adaptation', 'starter-host-adaptation']);
const LIMITATIONS = new Set(['none-evidenced', 'standalone-ui-only', 'business-contracts-not-included', 'no-business-data-adapter', 'backend-business-permission-enforcement-missing', 'production-secret-migration-hardening-missing', 'backend-test-baseline-missing', 'full-stack-spec-adapter-not-implemented']);
const READINESS = new Set(['ready', 'partial', 'blocked']);
const PROFILES = new Set(['generic', 'admin-ui', 'business-system']);
const UNITS = new Set(['pact-skills', 'vima-ui-admin', 'vima-starter']);
const COMPLETION_LEVELS = Object.freeze([
  ['implemented', ['trace-complete', 'implementation-tests-pass']],
  ['buildable', ['locked-build-pass']],
  ['startable', ['real-start-pass', 'health-check-pass']],
  ['integrated', ['real-database-pass', 'real-request-pass']],
  ['business-closed-loop', ['business-state-change-pass', 'business-query-or-audit-pass']],
  ['accepted', ['pact-t1-pass', 'delivery-profile-pass', 'business-owner-accepted', 'no-hard-blocker']],
  ['deployable', ['production-config-pass', 'migration-pass', 'security-pass', 'release-pass', 'rollback-plan-pass']],
  ['stable', ['restart-recovery-pass', 'observability-pass', 'stability-threshold-pass']]
]);

function fail(path, message) { throw new PlatformError('E_SCHEMA', path, message, 2); }
function object(value, path) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '必须是对象'); }
function array(value, path) { if (!Array.isArray(value)) fail(path, '必须是数组'); }
function exactVersion(doc) { object(doc, '$'); if (doc.version !== '1') fail('version', '只支持 version=1'); }
function enumValue(value, allowed, path) { if (!allowed.has(value)) fail(path, `非法枚举值：${value}`); }
function stringArray(value, allowed, path) { array(value, path); value.forEach((item, i) => { if (typeof item !== 'string') fail(`${path}.${i}`, '必须是字符串'); if (allowed) enumValue(item, allowed, `${path}.${i}`); }); }
function evidence(value, path) { array(value, path); if (!value.length) fail(path, '至少需要一条证据'); value.forEach((item, i) => { object(item, `${path}.${i}`); if (typeof item.path !== 'string' || !item.path) fail(`${path}.${i}.path`, '证据路径必填'); if (!/^[a-f0-9]{64}$/.test(item.sha256 || '')) fail(`${path}.${i}.sha256`, '证据 hash 必须是 64 位小写十六进制'); }); }
function uniqueIds(items, path) { const ids = items.map((item) => item.id); if (new Set(ids).size !== ids.length) fail(path, 'ID 必须唯一'); }

const validators = {
  capabilities(doc) {
    exactVersion(doc); array(doc.capabilities, 'capabilities'); uniqueIds(doc.capabilities, 'capabilities');
    doc.capabilities.forEach((item, i) => { const p = `capabilities.${i}`; object(item, p); enumValue(item.id, CAPABILITIES, `${p}.id`); enumValue(item.kind, new Set(['core', 'product', 'adapter']), `${p}.kind`); stringArray(item.supports, SUPPORTS, `${p}.supports`); stringArray(item.limitations, LIMITATIONS, `${p}.limitations`); enumValue(item.readiness, READINESS, `${p}.readiness`); evidence(item.evidence, `${p}.evidence`); });
  },
  profiles(doc) {
    exactVersion(doc); array(doc.completionLevels, 'completionLevels');
    if (doc.completionLevels.length !== COMPLETION_LEVELS.length) fail('completionLevels', '完成度必须恰为八级');
    doc.completionLevels.forEach((item, i) => {
      const path = `completionLevels.${i}`;
      object(item, path);
      const [expectedId, expectedEvidence] = COMPLETION_LEVELS[i];
      if (item.id !== expectedId) fail(`${path}.id`, `必须为 ${expectedId}`);
      if (item.rank !== i + 1) fail(`${path}.rank`, '必须为 1–8 连续整数');
      if (JSON.stringify(item.requiredEvidence) !== JSON.stringify(expectedEvidence)) fail(`${path}.requiredEvidence`, '证据 ID 或顺序不符合闭集');
    });
    array(doc.profiles, 'profiles'); uniqueIds(doc.profiles, 'profiles');
    doc.profiles.forEach((item, i) => { const p = `profiles.${i}`; enumValue(item.id, PROFILES, `${p}.id`); if (item.matchKind !== item.id) fail(`${p}.matchKind`, '必须等于 id'); stringArray(item.requiredCapabilities, CAPABILITIES, `${p}.requiredCapabilities`); stringArray(item.optionalCapabilities, CAPABILITIES, `${p}.optionalCapabilities`); stringArray(item.requiredChecks, null, `${p}.requiredChecks`); });
  },
  adapters(doc) {
    exactVersion(doc); array(doc.adapters, 'adapters'); uniqueIds(doc.adapters, 'adapters');
    doc.adapters.forEach((item, i) => { const p = `adapters.${i}`; enumValue(item.id, new Set(['ui-admin-adapter', 'vima-starter-adapter']), `${p}.id`); stringArray(item.applicableKinds, PROFILES, `${p}.applicableKinds`); stringArray(item.consumes, SUPPORTS, `${p}.consumes`); stringArray(item.provides, SUPPORTS, `${p}.provides`); stringArray(item.requiredCapabilities, CAPABILITIES, `${p}.requiredCapabilities`); enumValue(item.readiness, READINESS, `${p}.readiness`); if (typeof item.contractVersion !== 'string') fail(`${p}.contractVersion`, '必填'); evidence(item.evidence, `${p}.evidence`); });
  },
  compatibility(doc) {
    exactVersion(doc); array(doc.records, 'records');
    doc.records.forEach((item, i) => { const p = `records.${i}`; enumValue(item.consumer, CAPABILITIES, `${p}.consumer`); enumValue(item.provider, CAPABILITIES, `${p}.provider`); if (item.consumer === item.provider) fail(p, 'consumer/provider 不得相同'); for (const key of ['consumerVersion', 'providerVersion', 'contractVersion']) if (typeof item[key] !== 'string' || !item[key]) fail(`${p}.${key}`, '必填'); if (!/^[a-f0-9]{64}$/.test(item.providerContentSha256 || '')) fail(`${p}.providerContentSha256`, '非法 hash'); enumValue(item.releaseStatus, new Set(['published', 'unpublished-changes', 'blocked']), `${p}.releaseStatus`); enumValue(item.status, new Set(['compatible', 'verify-required', 'incompatible']), `${p}.status`); evidence(item.evidence, `${p}.evidence`); });
  },
  provenance(doc) {
    exactVersion(doc); array(doc.imports, 'imports');
    doc.imports.forEach((item, i) => {
      const p = `imports.${i}`;
      enumValue(item.phase, new Set(['planned', 'linked', 'finalized']), `${p}.phase`);
      for (const key of ['originalPath', 'snapshotPath', 'targetPath', 'backupPath']) if (typeof item[key] !== 'string' || !item[key]) fail(`${p}.${key}`, '路径必填');
      if (item.phase === 'planned') {
        if (item.snapshotPath !== item.originalPath) fail(`${p}.snapshotPath`, 'planned 时必须等于 originalPath');
        if (item.importedAt !== null) fail(`${p}.importedAt`, 'planned 时必须为 null');
        if (item.retiredAt !== null) fail(`${p}.retiredAt`, 'planned 时必须为 null');
      } else {
        if (item.snapshotPath !== item.backupPath) fail(`${p}.snapshotPath`, `${item.phase} 时必须等于 backupPath`);
        if (typeof item.importedAt !== 'string' || Number.isNaN(Date.parse(item.importedAt))) fail(`${p}.importedAt`, `${item.phase} 时必须为 RFC 3339`);
        if (item.phase === 'linked' && item.retiredAt !== null) fail(`${p}.retiredAt`, 'linked 时必须为 null');
        if (item.phase === 'finalized' && (typeof item.retiredAt !== 'string' || Number.isNaN(Date.parse(item.retiredAt)))) fail(`${p}.retiredAt`, 'finalized 时必须为 RFC 3339');
      }
      if (JSON.stringify(item.excludedSegments) !== JSON.stringify(EXCLUDED_SEGMENTS)) fail(`${p}.excludedSegments`, '排除闭集不可变');
      if (!/^[a-f0-9]{64}$/.test(item.normalizedSha256 || '')) fail(`${p}.normalizedSha256`, '非法 hash');
      if (item.historyAvailable !== false) fail(`${p}.historyAvailable`, '当前快照 historyAvailable 必须为 false');
    });
  },
  'release-units'(doc) {
    exactVersion(doc); array(doc.units, 'units'); uniqueIds(doc.units, 'units');
    doc.units.forEach((item, i) => { const p = `units.${i}`; enumValue(item.id, UNITS, `${p}.id`); stringArray(item.paths, null, `${p}.paths`); if (typeof item.versionSource !== 'string' || !item.versionSource) fail(`${p}.versionSource`, '必填'); for (const key of ['verify', 'pack']) { array(item[key], `${p}.${key}`); item[key].forEach((cmd, j) => { object(cmd, `${p}.${key}.${j}`); if (typeof cmd.id !== 'string' || !Array.isArray(cmd.argv) || !['node', 'npm', 'bash', 'mvn'].includes(cmd.argv[0])) fail(`${p}.${key}.${j}`, '命令必须有 id 和白名单 argv'); if ((cmd.argv[0] === 'npm' && cmd.argv[1] === 'publish') || (cmd.argv[0] === 'git' && cmd.argv[1] === 'push') || cmd.argv.some((arg) => /NPM_TOKEN/.test(arg))) fail(`${p}.${key}.${j}`, '禁止外部发布命令'); }); } stringArray(item.verifyDependents, UNITS, `${p}.verifyDependents`); });
  }
};

export function validateDocument(schemaId, input) {
  try { const validator = validators[schemaId]; if (!validator) fail('schemaId', `未知 schema：${schemaId}`); validator(input); return { ok: true, diagnostics: [] }; }
  catch (error) { if (error instanceof PlatformError) return { ok: false, diagnostics: [error.diagnostic()] }; throw error; }
}

export const schemaIds = Object.freeze(Object.keys(validators));
