<script setup lang="ts">
import { ref } from 'vue';

const online = ref(true);
</script>

<template>
  <div class="row">
    <v-switch v-model="online" />
    <span class="hint">{{ online ? '在岗' : '离岗' }}</span>
    <v-switch :model-value="true" disabled />
    <span class="hint">禁用</span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.hint {
  margin-right: 16px;
  color: var(--vui-text-weak);
  font-size: 13px;
}
</style>
