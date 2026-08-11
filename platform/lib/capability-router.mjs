// @pact R003,R004,R005,R009,R010
import { PlatformError } from './core.mjs';

const ADAPTER_IDS = new Set(['ui-admin-adapter', 'vima-starter-adapter']);
const INPUT_KINDS = new Set(['generic', 'admin-ui', 'business-system', 'unknown']);

function failure(error, profile = null, candidates = []) {
  return { ok: false, profile, selected: [], candidates: [...candidates].sort(), diagnostics: [error.diagnostic()] };
}

export function routeCapability(input, docs) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PlatformError('E_SCHEMA', '$', '输入必须是对象', 2);
    if (input.version !== '1') throw new PlatformError('E_SCHEMA', 'version', '只支持 version=1', 2);
    if (!INPUT_KINDS.has(input.kind)) throw new PlatformError('E_SCHEMA', 'kind', '非法需求类别', 2);
    if (input.kind === 'unknown') {
      throw new PlatformError('E_REQUIREMENT_INCOMPLETE', 'kind', '需求类别不足，不能选择工程模板', 2);
    }
    if (input.constraints !== undefined) {
      if (!input.constraints || typeof input.constraints !== 'object' || Array.isArray(input.constraints)) {
        throw new PlatformError('E_SCHEMA', 'constraints', '必须是对象', 2);
      }
      for (const [key, value] of Object.entries(input.constraints)) {
        if (!['frontend', 'backend'].includes(key)) throw new PlatformError('E_SCHEMA', `constraints.${key}`, '未知约束', 2);
        if (typeof value !== 'string') throw new PlatformError('E_SCHEMA', `constraints.${key}`, '必须是字符串', 2);
      }
    }

    const preferred = input.preferredCapabilities ?? [];
    if (!Array.isArray(preferred)) throw new PlatformError('E_SCHEMA', 'preferredCapabilities', '必须是数组', 2);
    if (new Set(preferred).size !== preferred.length) throw new PlatformError('E_SCHEMA', 'preferredCapabilities', '不得重复', 2);
    for (const [index, id] of preferred.entries()) {
      if (!ADAPTER_IDS.has(id)) throw new PlatformError('E_SCHEMA', `preferredCapabilities.${index}`, '只接受 adapter ID', 2);
    }

    const profile = docs.profiles.profiles.find(({ id }) => id === input.kind);
    const adapters = docs.adapters.adapters.filter(({ applicableKinds }) => applicableKinds.includes(input.kind));
    const applicable = new Set(adapters.map(({ id }) => id));
    for (const id of preferred) {
      if (!applicable.has(id)) {
        throw new PlatformError('E_CAPABILITY_NOT_APPLICABLE', 'preferredCapabilities', `${id} 不适用于 ${input.kind}`, 2);
      }
    }
    const candidates = adapters.map(({ id }) => id).filter((id) => !preferred.includes(id)).sort();
    if (!preferred.length) {
      return { ok: true, profile: profile.id, selected: [...profile.requiredCapabilities].sort(), candidates, diagnostics: [] };
    }

    const compatibility = docs.compatibility.records;
    for (const id of preferred) {
      const adapter = adapters.find((item) => item.id === id);
      const record = compatibility.find(({ consumer }) => consumer === id);
      if (!record || record.status === 'incompatible') {
        return failure(new PlatformError('E_COMPATIBILITY', `preferredCapabilities.${preferred.indexOf(id)}`, `${id} 的契约不兼容`, 3), profile.id, [id, ...candidates]);
      }
      if (adapter.readiness !== 'ready') {
        return failure(new PlatformError('E_CAPABILITY_BLOCKED', `preferredCapabilities.${preferred.indexOf(id)}`, `${id} 当前为 ${adapter.readiness}`, 3), profile.id, [id, ...candidates]);
      }
      if (record.status !== 'compatible') {
        return failure(new PlatformError('E_COMPATIBILITY', `preferredCapabilities.${preferred.indexOf(id)}`, `${id} 需要兼容性复验`, 3), profile.id, [id, ...candidates]);
      }
    }

    const selected = new Set(profile.requiredCapabilities);
    for (const id of preferred) {
      selected.add(id);
      for (const required of adapters.find((item) => item.id === id).requiredCapabilities) selected.add(required);
    }
    return { ok: true, profile: profile.id, selected: [...selected].sort(), candidates, diagnostics: [] };
  } catch (error) {
    if (error instanceof PlatformError) return failure(error);
    throw error;
  }
}
