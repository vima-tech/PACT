<!--
  API 表格。数据来自 scripts/build-api.mjs 从组件源码抽出的 api.generated.json，
  不手写——手写表格改一次属性就开始和实现对不上，而且对不上是静默的。
-->
<script setup lang="ts">
import { computed } from 'vue';

import api from '../api.generated.json';

const props = defineProps<{ names: string[] }>();

type Entry = {
  name: string;
  props: Array<{ name: string; type: string; default: string; desc: string }>;
  emits: string[];
  slots: string[];
};

const entries = computed<Entry[]>(() =>
  props.names.map((name) => (api as Record<string, Entry>)[name]).filter(Boolean)
);
</script>

<template>
  <section v-for="entry in entries" :key="entry.name" class="api">
    <h3 class="api-name">{{ entry.name }}</h3>

    <table v-if="entry.props.length" class="api-table">
      <thead>
        <tr>
          <th style="width: 22%">属性</th>
          <th style="width: 30%">类型</th>
          <th style="width: 16%">默认值</th>
          <th>说明</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in entry.props" :key="item.name">
          <td><code>{{ item.name }}</code></td>
          <td class="api-type">{{ item.type }}</td>
          <td class="api-default">{{ item.default }}</td>
          <td>{{ item.desc || '—' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="api-empty">该组件没有属性，只接收插槽内容。</p>

    <p v-if="entry.emits.length" class="api-line">
      <b>事件</b>
      <code v-for="e in entry.emits" :key="e">{{ e }}</code>
    </p>
    <p v-if="entry.slots.length" class="api-line">
      <b>插槽</b>
      <code v-for="s in entry.slots" :key="s">{{ s }}</code>
    </p>
  </section>
</template>

<style scoped>
.api {
  margin-bottom: 26px;
}

.api-name {
  margin: 0 0 10px;
  color: var(--vui-text-title);
  font-size: 15px;
  font-weight: 700;
}

.api-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--vui-border);
  border-radius: 12px;
  font-size: 13px;
}

.api-table th,
.api-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--vui-border);
  text-align: left;
  vertical-align: top;
}

.api-table th {
  background: var(--vui-surface-hover);
  color: var(--vui-text-title);
  font-weight: 700;
}

.api-table tbody tr:last-child td {
  border-bottom: 0;
}

.api-type,
.api-default {
  color: var(--vui-text-sub);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-word;
}

.api-empty,
.api-line {
  margin: 8px 0 0;
  color: var(--vui-text-sub);
  font-size: 13px;
}

.api-line b {
  margin-right: 8px;
  color: var(--vui-text-title);
}

code {
  padding: 1px 6px;
  margin-right: 6px;
  border-radius: 6px;
  background: var(--vui-surface-hover);
  color: var(--vui-primary-strong);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
