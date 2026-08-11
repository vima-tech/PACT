<script setup lang="ts">
import { ref } from 'vue';

const range = ref('');
const moment = ref('');
</script>

<template>
  <div class="stack">
    <v-date-picker v-model="range" range placeholder="开始日期 至 结束日期" />
    <v-date-picker v-model="moment" type="datetime" placeholder="日期 + 时间" />
    <v-date-picker model-value="" placeholder="限定 2026 年内" min="2026-01-01" max="2026-12-31" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 340px;
}
</style>
