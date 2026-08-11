<script setup lang="ts">
import { ref } from 'vue';

const picked = ref<string[]>(['1', '3']);
const options = [
  { label: '刑侦支队', value: '1' },
  { label: '治安大队', value: '2' },
  { label: '交警一中队', value: '3' },
  { label: '网安大队', value: '4' },
  { label: '禁毒大队', value: '5' }
];
</script>

<template>
  <div class="stack">
    <v-select v-model="picked" :items="options" multiple clearable show-search placeholder="可多选、可检索" />
    <p class="hint">已选：{{ picked.join('、') || '（空）' }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 360px;
}

.hint {
  margin: 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}
</style>
