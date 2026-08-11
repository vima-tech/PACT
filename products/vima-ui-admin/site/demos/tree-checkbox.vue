<script setup lang="ts">
import { ref } from 'vue';

const checked = ref<unknown[]>([11]);
/** 字段名和组件默认的 id/title/children 不一致时，用 replaceFields 映射 */
const data = [
  {
    key: 1,
    name: '市公安局',
    nodes: [
      { key: 11, name: '刑侦支队' },
      { key: 12, name: '治安大队' }
    ]
  }
];
</script>

<template>
  <div>
    <v-tree
      v-model:checked-keys="checked"
      :data="data"
      show-checkbox
      :replace-fields="{ id: 'key', title: 'name', children: 'nodes' }"
    />
    <p class="hint">已勾选：{{ checked.join('、') || '（空）' }}</p>
  </div>
</template>

<style scoped>
.hint {
  margin: 10px 0 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}
</style>
