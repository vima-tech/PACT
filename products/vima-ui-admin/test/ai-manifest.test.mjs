import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectPublicApi,
  manifestCoverage,
  serializeManifest
} from '../scripts/collect-public-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('公开接口收集覆盖安装入口、模板别名和图标', () => {
  const result = collectPublicApi({ root });

  assert.equal(result.manifest.components.length, 63);
  assert.ok(result.manifest.components.some((item) => item.name === 'VTemplateEditor'));
  assert.ok(result.manifest.icons.some((item) => item.name === 'home'));
  assert.equal(result.manifest.templateComponents.input, 'VInput');
  assert.equal(result.manifest.templateComponents.text, '$intrinsic');
  assert.equal(result.manifest.templateComponents.custom, '$intrinsic');
  assert.deepEqual(result.diagnostics, []);
});

test('P0 语义覆盖达到发布门槛', () => {
  const { manifest } = collectPublicApi({ root });
  const coverage = manifestCoverage(manifest);

  assert.equal(coverage.componentDescriptions, coverage.components);
  assert.equal(coverage.eventPayloads, coverage.events);
  assert.equal(coverage.propDescriptions, coverage.props, JSON.stringify(coverage));
  assert.ok(coverage.slots > 0);
  assert.equal(coverage.slotProps, coverage.slots, JSON.stringify(coverage));
});

test('公开接口收集结果稳定且每个公开组件可被 Agent 识别', () => {
  const first = collectPublicApi({ root });
  const second = collectPublicApi({ root });

  assert.equal(serializeManifest(first.manifest), serializeManifest(second.manifest));
  for (const component of first.manifest.components) {
    assert.ok(component.description, `${component.name} 缺少 description`);
    assert.ok(component.category, `${component.name} 缺少 category`);
    assert.ok(Array.isArray(component.props));
    assert.ok(Array.isArray(component.events));
    assert.ok(Array.isArray(component.slots));
  }
});
