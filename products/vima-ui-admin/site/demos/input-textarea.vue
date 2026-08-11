<script setup lang="ts">
import { ref } from 'vue';

const fixed = ref('');
const grow = ref('输入多行文字，这个文本域会自己长高。\n第二行\n第三行');
</script>

<template>
  <div class="stack">
    <v-textarea v-model="fixed" placeholder="固定 3 行" :rows="3" />
    <v-textarea v-model="grow" autosize placeholder="autosize：随内容长高" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 460px;
}
</style>
