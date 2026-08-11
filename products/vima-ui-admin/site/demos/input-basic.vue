<script setup lang="ts">
import { ref } from 'vue';

const name = ref('张三');
const keyword = ref('');
const password = ref('');
</script>

<template>
  <div class="stack">
    <v-input v-model="name" placeholder="请输入姓名" />
    <v-input v-model="keyword" placeholder="带前缀图标" prefix-icon="search" />
    <v-input v-model="password" type="password" placeholder="密码" />
    <v-input model-value="只读内容" readonly />
    <v-input model-value="禁用状态" disabled />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 360px;
}
</style>
