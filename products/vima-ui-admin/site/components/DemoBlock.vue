<!--
  示例块：上半是真渲染的组件，下半是这段示例的源码。

  源码不是手抄的——demos/*.vue 同时被当组件和被当文本(?raw)引入，
  因此「文档里的代码」和「上面跑的那个组件」永远是同一份文件，抄不歪。
-->
<script setup lang="ts">
import { computed, ref } from 'vue';

import { highlight } from '../highlight';

const props = defineProps<{ title: string; desc?: string; source: string }>();

const expanded = ref(false);
const copied = ref(false);
const code = computed(() => highlight(props.source.trim()));

async function copy() {
  try {
    await navigator.clipboard.writeText(props.source.trim());
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    // 非安全上下文（http 打开）下 clipboard 不可用，静默失败即可，代码就在下面能手选
  }
}
</script>

<template>
  <section class="demo">
    <header class="demo-head">
      <h3 class="demo-title">{{ title }}</h3>
      <p v-if="desc" class="demo-desc">{{ desc }}</p>
    </header>

    <div class="demo-stage">
      <slot />
    </div>

    <footer class="demo-foot">
      <button type="button" class="demo-act" @click="expanded = !expanded">
        {{ expanded ? '收起代码' : '显示代码' }}
      </button>
      <button type="button" class="demo-act" @click="copy">{{ copied ? '已复制' : '复制' }}</button>
    </footer>

    <pre v-show="expanded" class="demo-code"><code v-html="code" /></pre>
  </section>
</template>

<style scoped>
.demo {
  overflow: hidden;
  margin-bottom: 22px;
  border: 1px solid var(--vui-border);
  border-radius: 14px;
  background: var(--vui-surface);
}

.demo-head {
  padding: 14px 18px 0;
}

.demo-title {
  margin: 0;
  color: var(--vui-text-title);
  font-size: 15px;
  font-weight: 700;
}

.demo-desc {
  margin: 6px 0 0;
  color: var(--vui-text-sub);
  font-size: 13px;
  line-height: 1.7;
}

.demo-stage {
  padding: 18px;
}

.demo-foot {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  padding: 6px 12px;
  border-top: 1px dashed var(--vui-border);
  background: var(--vui-surface-hover);
}

.demo-act {
  padding: 4px 10px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--vui-text-weak);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.demo-act:hover {
  color: var(--vui-primary);
}

.demo-code {
  max-height: 460px;
  margin: 0;
  padding: 16px 18px;
  overflow: auto;
  border-top: 1px solid var(--vui-border);
  background: #0f1f33;
  color: #d6e3f0;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.75;
  tab-size: 2;
}

.demo-code :deep(.tk-comment) {
  color: #6b8199;
  font-style: normal;
}

.demo-code :deep(.tk-string) {
  color: #9ad3a0;
  font-style: normal;
}

.demo-code :deep(.tk-tag) {
  color: #7fb2ef;
  font-style: normal;
}

.demo-code :deep(.tk-keyword) {
  color: #d3a2e8;
  font-style: normal;
}

.demo-code :deep(.tk-attr) {
  color: #e8c07d;
  font-style: normal;
}
</style>
