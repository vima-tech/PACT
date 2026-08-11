<!--
  主题与令牌。

  表格直接解析 src/styles/tokens.css 的原文（?raw 引入），不复制一份值到文档里——
  复制的那一刻就开始漂移，而且颜色漂移肉眼看不出来，只有换肤时才炸。
  分组与说明也取自那个文件里的注释，所以改令牌 = 改文档。
-->
<script setup lang="ts">
import { computed } from 'vue';

import tokensCss from '../../src/styles/tokens.css?raw';
import { highlight } from '../highlight';

const overrideSample = `/* 宿主的 app.css，在 @vima-tech/ui-admin/style.css 之后加载 */
:root {
  --vui-primary: #1f6f4a;
  --vui-primary-strong: #175639;
}`;

type Token = { name: string; value: string; desc: string };
type Group = { title: string; tokens: Token[] };

const groups = computed<Group[]>(() => {
  const body = tokensCss.slice(tokensCss.indexOf(':root'));
  const out: Group[] = [];
  let current: Group = { title: '其他', tokens: [] };
  let desc = '';
  for (const line of body.split('\n')) {
    const section = line.match(/\/\* -+ (.+?) -+ \*\//);
    if (section) {
      if (current.tokens.length) out.push(current);
      current = { title: section[1], tokens: [] };
      continue;
    }
    const doc = line.match(/\/\*\*\s*(.+?)\s*\*\//);
    if (doc) {
      desc = doc[1];
      continue;
    }
    const token = line.match(/^\s*(--vui-[\w-]+):\s*(.+?);/);
    if (token) {
      current.tokens.push({ name: token[1], value: token[2], desc });
      desc = '';
    }
  }
  if (current.tokens.length) out.push(current);
  return out;
});

const total = computed(() => groups.value.reduce((n, g) => n + g.tokens.length, 0));

/** 只有像颜色的值才配色块，阴影/尺寸给个「—」比给一块糊掉的色块诚实 */
function isColor(value: string) {
  return /^(#|rgb|var\(--vui-(primary|surface|border|text))/.test(value.trim());
}
</script>

<template>
  <article class="doc">
    <h1>主题与令牌</h1>
    <p class="lead">
      组件样式里没有一处写死的颜色，全部取 <code>var(--vui-*)</code>。
      换品牌色 = 在宿主样式里重定义同名变量（后加载即覆盖），不需要改本包任何文件：
    </p>
    <pre class="code"><code v-html="highlight(overrideSample)" /></pre>
    <p class="lead">
      共 {{ total }} 个令牌。下表直接解析自 <code>src/styles/tokens.css</code>，
      改了那个文件这里就跟着变。
    </p>

    <section v-for="group in groups" :key="group.title" class="group">
      <h2>{{ group.title }}</h2>
      <table class="tokens">
        <thead>
          <tr>
            <th style="width: 54px"></th>
            <th style="width: 30%">令牌</th>
            <th style="width: 28%">默认值</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in group.tokens" :key="token.name">
            <td>
              <span v-if="isColor(token.value)" class="swatch" :style="{ background: token.value }" />
              <span v-else class="swatch is-empty">—</span>
            </td>
            <td><code>{{ token.name }}</code></td>
            <td class="value">{{ token.value }}</td>
            <td>{{ token.desc || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="group">
      <h2>关于「冻结值」</h2>
      <p class="lead">
        这些取值 1:1 冻结自 juvenile-guard 管理端的 v3 企业蓝主题，因此本库渲染出来的界面
        与那个系统像素一致。之所以是手写而不是算法生成：本库刚从宿主里摘出来，第一优先级是
        「证明提取没提坏」；等在真实项目里跑过一轮，再换成按 OKLab 色阶生成的版本
        （已实测可行，最大感知偏差 0.031，细节见仓库 README）。
      </p>
    </section>
  </article>
</template>

<style scoped>
.doc {
  max-width: 940px;
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

.group {
  margin-top: 28px;
}

.group h2 {
  margin: 0 0 12px;
  color: var(--vui-text-title);
  font-size: 17px;
}

.tokens {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--vui-border);
  background: var(--vui-surface);
  font-size: 13px;
}

.tokens th,
.tokens td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--vui-border);
  text-align: left;
}

.tokens th {
  background: var(--vui-surface-hover);
  color: var(--vui-text-title);
}

.tokens tbody tr:last-child td {
  border-bottom: 0;
}

.swatch {
  display: block;
  width: 28px;
  height: 20px;
  border: 1px solid var(--vui-border);
  border-radius: 5px;
}

.swatch.is-empty {
  border: 0;
  color: var(--vui-text-faint);
  text-align: center;
}

.value {
  color: var(--vui-text-sub);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.code {
  margin: 0 0 16px;
  padding: 16px 18px;
  overflow: auto;
  border-radius: 12px;
  background: #0f1f33;
  color: #d6e3f0;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.75;
}

/* 代码块里的 code 不该套用内联代码的浅底色，否则每行都拖着一条色带 */
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
</style>
