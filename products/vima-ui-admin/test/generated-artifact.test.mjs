import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import vue from '@vitejs/plugin-vue';
import { build } from 'vite';

import { createArtifactPlan } from '../dist/agent/index.js';

const spec = {
  version: '1',
  name: '资产管理',
  shell: {
    title: '资产管理',
    navigation: [
      { label: '概览', route: '/overview', icon: 'chart-bar' },
      { label: '资产', route: '/assets', icon: 'package' }
    ]
  },
  pages: [
    {
      id: 'overview',
      type: 'dashboard',
      title: '概览',
      metrics: [{ key: 'total', label: '资产数', value: 12 }]
    },
    {
      id: 'assets',
      type: 'crud',
      title: '资产列表',
      rowKey: 'id',
      fields: [
        { key: 'name', label: '名称', dataType: 'string', required: true },
        { key: 'enabled', label: '启用', dataType: 'boolean' }
      ],
      actions: [{ key: 'create', label: '新增', kind: 'primary', icon: 'plus' }]
    }
  ],
  routes: [
    { path: '/overview', pageId: 'overview' },
    { path: '/assets', pageId: 'assets' }
  ]
};

async function compilePlan(plan) {
  const root = mkdtempSync(join(tmpdir(), 'vima-artifact-'));
  try {
    for (const file of plan.files) {
      const target = join(root, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
    }
    await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [vue()],
      build: {
        emptyOutDir: true,
        lib: { entry: join(root, 'src/main.ts'), formats: ['es'] },
        outDir: join(root, 'dist'),
        rollupOptions: {
          external: (id) => id === 'vue' || id === 'vue-router' || id.startsWith('@vima-tech/ui-admin')
        }
      }
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

test('ArtifactPlan 中的 Vue SFC 和路由可被真实 Vite 编译', async () => {
  const result = createArtifactPlan(spec);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  await compilePlan(result.plan);
});

test('ArtifactPlan 安全编码需求文本和路由，不让标签或 script 逃出', async () => {
  const attack = "</script><script>throw new Error('injected')</script><img src=x onerror=alert(1)>";
  const result = createArtifactPlan({
    version: '1',
    name: attack,
    shell: {
      title: attack,
      navigation: [{ label: attack, route: "/items?quote='&value=\"x\"", icon: 'shield-check' }]
    },
    pages: [{
      id: 'items',
      type: 'detail',
      title: attack,
      fields: [{ key: 'name', label: attack, dataType: 'string' }]
    }],
    routes: [{ path: "/items?quote='&value=\"x\"", pageId: 'items' }]
  });

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.ok(result.plan.files.every((file) => !file.content.includes('</script><script>')));
  assert.ok(result.plan.files.every((file) => !file.content.includes('<img src=x')));
  await compilePlan(result.plan);
});
