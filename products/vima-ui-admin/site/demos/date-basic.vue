<script setup lang="ts">
import { ref } from 'vue';

const day = ref('2026-08-10');
</script>

<template>
  <div class="stack">
    <v-date-picker v-model="day" placeholder="选择日期" allow-clear />
    <p class="hint">当前值：{{ day || '（空）' }}</p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 300px;
}

.hint {
  margin: 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}
</style>
