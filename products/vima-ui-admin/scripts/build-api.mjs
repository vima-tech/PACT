/**
 * 生成文档站 API 数据。公开接口解析统一由 collect-public-api.mjs 完成，
 * 这里仅保留站点旧数据形状的适配，避免形成第二份解析实现。
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectPublicApi, manifestCoverage } from './collect-public-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'site', 'api.generated.json');
const { manifest, diagnostics } = collectPublicApi({ root });

if (diagnostics.length) {
  diagnostics.forEach((diagnostic) => console.error(JSON.stringify(diagnostic)));
  throw new Error(`公开接口收集失败：${diagnostics.length} 项`);
}

const api = Object.fromEntries(manifest.components.map((component) => [
  component.name,
  {
    name: component.name,
    description: component.description,
    category: component.category,
    props: component.props.map((prop) => ({
      name: prop.name,
      type: prop.type,
      default: Object.hasOwn(prop, 'default') ? String(prop.default) : '—',
      required: prop.required,
      desc: prop.description,
      extractionStatus: prop.extractionStatus
    })),
    emits: component.events.map((event) => event.name),
    events: component.events,
    slots: component.slots.map((slot) => slot.name),
    slotDefinitions: component.slots
  }
]));

writeFileSync(out, `${JSON.stringify(api, null, 2)}\n`);
const coverage = manifestCoverage(manifest);
console.log(
  `已写出 ${out}\n组件 ${coverage.components} 个 · 属性 ${coverage.props} 个 · ` +
  `事件 ${coverage.events} 个 · 插槽 ${coverage.slots} 个 · ` +
  `语义覆盖 Props ${coverage.propDescriptions}/${coverage.props}、Events ${coverage.eventPayloads}/${coverage.events}、Slots ${coverage.slotProps}/${coverage.slots}`
);
