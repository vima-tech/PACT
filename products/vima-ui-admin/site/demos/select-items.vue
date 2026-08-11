<script setup lang="ts">
import { ref } from 'vue';

const value = ref('');
/** 数组数据源：label / value 两个字段，适合从接口直接拿回来的字典 */
const items = Array.from({ length: 12 }, (_, i) => ({
  label: `第 ${i + 1} 派出所`,
  value: String(i + 1)
}));
</script>

<template>
  <v-select v-model="value" :items="items" placeholder="选项多时自动出现检索框" style="max-width: 320px" />
</template>
