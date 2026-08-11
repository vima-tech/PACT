<!-- 安装与使用。代码块共用 DemoBlock 的着色器，保持全站一致 -->
<script setup lang="ts">
import { highlight } from '../highlight';

const install = `// package.json
"dependencies": {
  "@vima-tech/ui-admin": "workspace:*"   // 将来发包后换成 "^0.1.0"
}`;

const usage = `// main.ts
import { createApp } from 'vue';
import VimaUiAdmin from '@vima-tech/ui-admin';
import '@vima-tech/ui-admin/style.css';   // 令牌 + 组件样式，一并引入
import App from './App.vue';

createApp(App).use(VimaUiAdmin).mount('#app');`;

const partial = `// 不想全量注册时按名引入
import { VTable, VButton, layer } from '@vima-tech/ui-admin';
import '@vima-tech/ui-admin/style.css';`;

const page = `<template>
  <v-card title="人员名单">
    <v-table id="id" :columns="columns" :data-source="rows" />
  </v-card>
</template>`;

const blocks = [
  { title: '1. 安装', desc: '当前以 workspace 形式引用，发包后改成版本号即可，导入说明符不变。', code: install },
  { title: '2. 注册', desc: '插件会注册全部 43 个组件，标签名即组件名的中划线形式（VButton → <v-button>）。', code: usage },
  { title: '3. 或者按名引入', desc: '不装插件时按名引入组件，自己在页面里注册。样式是整包的，两种方式都要引 style.css。', code: partial },
  { title: '4. 写页面', desc: '页面骨架惯例：卡片包内容，表格自带工具栏与分页。', code: page }
];
</script>

<template>
  <article class="doc">
    <h1>安装与使用</h1>
    <p class="lead">
      本包是源码包（exports 指向 <code>src/index.ts</code>），由宿主的构建工具编译，
      不预打包 dist。因此宿主需要能处理 TypeScript 与 Vue 的构建链（Vite 即可）。
    </p>

    <section v-for="block in blocks" :key="block.title" class="block">
      <h2>{{ block.title }}</h2>
      <p>{{ block.desc }}</p>
      <pre class="code"><code v-html="highlight(block.code)" /></pre>
    </section>

    <section class="block">
      <h2>约定与边界</h2>
      <ul>
        <li>标签名统一 <code>v-</code> 前缀，CSS 类名统一 <code>.vui-</code> 前缀，令牌统一 <code>--vui-</code> 前缀。</li>
        <li>组件样式不写死颜色，只取令牌；要换品牌色见<a href="#/theme">主题与令牌</a>。</li>
        <li>包内不读宿主的任何模块与全局配置；<code>VColumnSetting</code> 是唯一会碰 localStorage 的组件，且必须显式给 <code>storageKey</code> 才会碰。</li>
        <li>样式选择器一律收在 <code>.vui-</code> 子树内，不会污染宿主页面（有机检守着）。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.doc {
  max-width: 900px;
}

h1 {
  margin: 0 0 12px;
  color: var(--vui-text-title);
  font-size: 26px;
}

.lead {
  color: var(--vui-text-sub);
  font-size: 14px;
  line-height: 1.9;
}

.block {
  margin-top: 28px;
}

.block h2 {
  margin: 0 0 8px;
  color: var(--vui-text-title);
  font-size: 17px;
}

.block p {
  margin: 0 0 12px;
  color: var(--vui-text-sub);
  font-size: 13.5px;
  line-height: 1.8;
}

.block ul {
  margin: 0;
  padding-left: 20px;
  color: var(--vui-text-sub);
  font-size: 13.5px;
  line-height: 2;
}

.code {
  margin: 0;
  padding: 16px 18px;
  overflow: auto;
  border-radius: 12px;
  background: #0f1f33;
  color: #d6e3f0;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.75;
}

.code code {
  padding: 0;
  background: none;
  color: inherit;
}

.code :deep(i) {
  font-style: normal;
}

.code :deep(.tk-comment) { color: #6b8199; }
.code :deep(.tk-string) { color: #9ad3a0; }
.code :deep(.tk-tag) { color: #7fb2ef; }
.code :deep(.tk-keyword) { color: #d3a2e8; }
.code :deep(.tk-attr) { color: #e8c07d; }

code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--vui-surface-hover);
  color: var(--vui-primary-strong);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12.5px;
}

a {
  color: var(--vui-primary);
}
</style>
