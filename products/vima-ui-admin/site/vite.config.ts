import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * 文档站构建。
 *
 * base 用相对路径，产物可以直接扔进任意子目录托管。
 *
 * 别名把包名指回源码：示例文件里写 `from '@vima-tech/ui-admin'`，
 * 展示出来的代码就与使用者真实写法一字不差——写成 `from '../../src'`
 * 等于文档里放了一行没人能照抄的代码。
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@vima-tech/ui-admin/style.css',
        replacement: fileURLToPath(new URL('../src/styles/index.css', import.meta.url))
      },
      {
        find: '@vima-tech/ui-admin',
        replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url))
      }
    ]
  },
  build: { outDir: '../dist-site', emptyOutDir: true }
});
