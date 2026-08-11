/**
 * 构建 npm 发布产物。
 *
 * JavaScript 由 Vite 打成单个 ESM 入口，Vue 保持 peer dependency；CSS 保留为独立文件，
 * 让使用者按需引入 style.css / tokens.css / ui.css。类型声明由后续 tsc 命令生成。
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { collectPublicApi, serializeManifest } from './collect-public-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist');

rmSync(outDir, { force: true, recursive: true });

await build({
  configFile: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(root, 'src/index.ts'),
        'agent/index': resolve(root, 'src/agent/index.ts')
      },
      formats: ['es']
    },
    outDir,
    rollupOptions: {
      external: ['vue']
    },
    sourcemap: true
  }
});

mkdirSync(resolve(outDir, 'styles'), { recursive: true });
cpSync(resolve(root, 'src/styles'), resolve(outDir, 'styles'), { recursive: true });
mkdirSync(resolve(outDir, 'agent', 'schema'), { recursive: true });
cpSync(resolve(root, 'src', 'agent', 'schema'), resolve(outDir, 'agent', 'schema'), { recursive: true });
mkdirSync(resolve(outDir, 'agent', 'docs'), { recursive: true });
cpSync(resolve(root, 'docs', 'agent'), resolve(outDir, 'agent', 'docs'), { recursive: true });

const { manifest, diagnostics } = collectPublicApi({ root });
if (diagnostics.length) {
  diagnostics.forEach((diagnostic) => console.error(JSON.stringify(diagnostic)));
  throw new Error(`AI Manifest 生成失败：${diagnostics.length} 项`);
}
writeFileSync(resolve(outDir, 'ai-manifest.json'), serializeManifest(manifest));
