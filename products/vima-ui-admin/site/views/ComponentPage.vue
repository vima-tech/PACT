<!--
  组件页模板：28 个组件页共用这一个，内容全部来自 pages.ts 的配置。

  示例组件与示例源码来自同一批文件：
    demos/*.vue 被 glob 引入两次，一次当组件渲染，一次带 ?raw 当源码展示。
  所以文档里的代码永远等于上面跑的那个东西——手抄代码块迟早会和实现对不上。
-->
<script setup lang="ts">
import { computed } from 'vue';

import ApiTable from '../components/ApiTable.vue';
import DemoBlock from '../components/DemoBlock.vue';
import type { PageConfig } from '../pages';

const props = defineProps<{ page: PageConfig }>();

const modules = import.meta.glob('../demos/*.vue', { eager: true }) as Record<
  string,
  { default: unknown }
>;
const sources = import.meta.glob('../demos/*.vue', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

const demos = computed(() =>
  props.page.demos.map((demo) => ({
    ...demo,
    component: modules[`../demos/${demo.file}.vue`]?.default,
    source: sources[`../demos/${demo.file}.vue`] ?? '// 示例文件缺失：' + demo.file
  }))
);
</script>

<template>
  <article class="page">
    <header class="page-head">
      <h1>{{ page.title }}</h1>
      <p class="page-desc">{{ page.desc }}</p>
      <ul v-if="page.notes?.length" class="page-notes">
        <li v-for="note in page.notes" :key="note">{{ note }}</li>
      </ul>
    </header>

    <DemoBlock
      v-for="demo in demos"
      :key="demo.file"
      :title="demo.title"
      :desc="demo.desc"
      :source="demo.source"
    >
      <component :is="demo.component" v-if="demo.component" />
      <p v-else class="missing">示例组件未找到：demos/{{ demo.file }}.vue</p>
    </DemoBlock>

    <section v-if="page.api.length" class="api-section">
      <h2>API</h2>
      <ApiTable :names="page.api" />
    </section>
  </article>
</template>

<style scoped>
.page {
  max-width: 1000px;
}

.page-head {
  margin-bottom: 24px;
}

.page-head h1 {
  margin: 0;
  color: var(--vui-text-title);
  font-size: 26px;
  font-weight: 700;
}

.page-desc {
  margin: 10px 0 0;
  color: var(--vui-text-sub);
  font-size: 14px;
  line-height: 1.8;
}

.page-notes {
  margin: 14px 0 0;
  padding: 12px 16px 12px 32px;
  border-left: 3px solid var(--vui-primary);
  border-radius: 0 10px 10px 0;
  background: var(--vui-surface-hover);
  color: var(--vui-text-sub);
  font-size: 13px;
  line-height: 1.9;
}

.api-section h2 {
  margin: 34px 0 16px;
  color: var(--vui-text-title);
  font-size: 20px;
}

.missing {
  color: #c0392b;
  font-size: 13px;
}
</style>
