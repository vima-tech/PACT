// @pact R002,R006,R007,R008,R010,R019
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PlatformError, readJson } from './core.mjs';
import { schemaIds, validateDocument } from './schema-validator.mjs';

export const registryFiles = Object.freeze({
  capabilities: 'platform/registry/capabilities.v1.json',
  profiles: 'platform/registry/delivery-profiles.v1.json',
  adapters: 'platform/registry/adapters.v1.json',
  compatibility: 'platform/registry/compatibility.v1.json',
  provenance: 'platform/registry/provenance.v1.json',
  'release-units': 'platform/registry/release-units.v1.json'
});

export const providerContractFiles = Object.freeze({
  'vima-ui-admin': [
    'products/vima-ui-admin/package.json',
    'products/vima-ui-admin/dist/ai-manifest.json',
    'products/vima-ui-admin/dist/agent/schema/app-spec.v1.json'
  ],
  'vima-starter': [
    'templates/vima-starter/package.json',
    'templates/vima-starter/backend/pom.xml'
  ]
});

export async function fileSha256(root, path) {
  const bytes = await readFile(resolve(root, path));
  return createHash('sha256').update(bytes).digest('hex');
}

export async function providerContractSha256(root, provider) {
  const paths = providerContractFiles[provider];
  if (!paths) throw new PlatformError('E_COMPATIBILITY', 'provider', `未知 provider：${provider}`, 3);
  const hash = createHash('sha256');
  for (const path of paths) {
    hash.update(Buffer.from(path));
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(root, path)));
  }
  return hash.digest('hex');
}

export function assertCompatibilityIdentities(records) {
  const identities = new Map();
  for (const [index, record] of records.entries()) {
    const key = `${record.provider}@${record.providerVersion}`;
    const prior = identities.get(key);
    if (prior && prior !== record.providerContentSha256) {
      throw new PlatformError('E_COMPATIBILITY', `records.${index}.providerContentSha256`, `同一版本 ${key} 出现不同公开契约 hash`, 3);
    }
    identities.set(key, record.providerContentSha256);
  }
}

function assertSortedIds(items, path) {
  const ids = items.map(({ id }) => id);
  if (JSON.stringify(ids) !== JSON.stringify([...ids].sort())) {
    throw new PlatformError('E_SCHEMA', path, '必须按 id 升序', 2);
  }
}

export async function loadAndCheckGovernance(root) {
  const docs = {};
  for (const schemaId of schemaIds) {
    const path = registryFiles[schemaId];
    const doc = await readJson(resolve(root, path));
    const validation = validateDocument(schemaId, doc);
    if (!validation.ok) {
      const d = validation.diagnostics[0];
      throw new PlatformError(d.code, `${path}:${d.path}`, d.message, 2);
    }
    docs[schemaId] = doc;
  }

  const exactCapabilityIds = ['pact-core', 'ui-admin-adapter', 'vima-starter', 'vima-starter-adapter', 'vima-ui-admin'];
  const exactAdapterIds = ['ui-admin-adapter', 'vima-starter-adapter'];
  const exactProfileIds = ['admin-ui', 'business-system', 'generic'];
  const exactUnitIds = ['pact-skills', 'vima-starter', 'vima-ui-admin'];
  for (const [items, expected, path] of [
    [docs.capabilities.capabilities, exactCapabilityIds, 'capabilities'],
    [docs.adapters.adapters, exactAdapterIds, 'adapters'],
    [docs.profiles.profiles, exactProfileIds, 'profiles']
  ]) {
    assertSortedIds(items, path);
    if (JSON.stringify(items.map(({ id }) => id)) !== JSON.stringify(expected)) {
      throw new PlatformError('E_SCHEMA', path, '稳定 ID 集合不完整', 2);
    }
  }
  if (JSON.stringify(docs['release-units'].units.map(({ id }) => id).sort()) !== JSON.stringify(exactUnitIds)) {
    throw new PlatformError('E_SCHEMA', 'units', '稳定 ID 集合不完整', 2);
  }

  const evidenceOwners = [
    ...docs.capabilities.capabilities,
    ...docs.adapters.adapters,
    ...docs.compatibility.records
  ];
  for (const owner of evidenceOwners) {
    for (const evidence of owner.evidence) {
      const actual = await fileSha256(root, evidence.path);
      if (actual !== evidence.sha256) {
        throw new PlatformError('E_SCHEMA', evidence.path, '证据 hash 与当前文件不匹配', 2);
      }
    }
  }

  const capabilityById = new Map(docs.capabilities.capabilities.map((item) => [item.id, item]));
  for (const adapter of docs.adapters.adapters) {
    if (capabilityById.get(adapter.id)?.readiness !== adapter.readiness) {
      throw new PlatformError('E_SCHEMA', adapter.id, 'adapter 与 capability readiness 不一致', 2);
    }
  }

  const checks = new Set(docs['release-units'].units.flatMap((unit) => unit.verify.map(({ id }) => id)));
  for (const profile of docs.profiles.profiles) {
    for (const check of profile.requiredChecks) {
      if (!checks.has(check)) throw new PlatformError('E_SCHEMA', `${profile.id}.requiredChecks`, `未知 check：${check}`, 2);
    }
  }

  const requiredLimitations = [
    'backend-business-permission-enforcement-missing',
    'backend-test-baseline-missing',
    'production-secret-migration-hardening-missing'
  ];
  const starter = capabilityById.get('vima-starter');
  const starterAdapter = capabilityById.get('vima-starter-adapter');
  if (starter.readiness !== 'partial' || starterAdapter.readiness !== 'blocked' ||
      !requiredLimitations.every((id) => starter.limitations.includes(id) && starterAdapter.limitations.includes(id)) ||
      !starterAdapter.limitations.includes('full-stack-spec-adapter-not-implemented')) {
    throw new PlatformError('E_SCHEMA', 'capabilities.vima-starter', 'Starter 限制或 readiness 被虚报', 2);
  }

  assertCompatibilityIdentities(docs.compatibility.records);
  for (const [index, record] of docs.compatibility.records.entries()) {
    const actual = await providerContractSha256(root, record.provider);
    if (actual !== record.providerContentSha256) {
      throw new PlatformError('E_COMPATIBILITY', `records.${index}.providerContentSha256`, 'provider 公开契约 hash 已变化', 3);
    }
  }

  for (const unit of docs['release-units'].units) {
    await readFile(resolve(root, unit.versionSource));
  }
  return docs;
}
