<script setup lang="ts">
import { ref } from 'vue';

const tags = ref(['重点', '在册']);
</script>

<template>
  <div class="stack">
    <v-tag-input v-model="tags" allow-clear />
    <p class="hint">输入后回车追加，点标签上的 × 删除。当前：{{ tags.join('、') || '（空）' }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 400px;
}

.hint {
  margin: 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}
</style>
