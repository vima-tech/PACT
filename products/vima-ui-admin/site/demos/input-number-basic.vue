<script setup lang="ts">
import { ref } from 'vue';

const age = ref(18);
</script>

<template>
  <div class="stack">
    <v-input-number v-model="age" :min="0" :max="120" />
    <p class="hint">当前值：{{ age }}（min 0 / max 120，超出会被夹回）</p>
    <v-input-number :model-value="5" disabled />
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
