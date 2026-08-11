<script setup lang="ts">
import { ref } from 'vue';

const level = ref('b');
</script>

<template>
  <div>
    <v-radio-group v-model="level">
      <v-radio value="a">甲等</v-radio>
      <v-radio value="b">乙等</v-radio>
      <v-radio value="c" disabled>丙等（禁用）</v-radio>
    </v-radio-group>
    <p class="hint">当前值：{{ level }}</p>
  </div>
</template>

<style scoped>
.hint {
  margin: 10px 0 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}
</style>
