<script setup lang="ts">
import { ref } from 'vue';

const dept = ref('2');
</script>

<template>
  <div class="stack">
    <v-select v-model="dept" placeholder="请选择部门" clearable>
      <v-select-option label="刑侦支队" value="1" />
      <v-select-option label="治安大队" value="2" />
      <v-select-option label="交警一中队" value="3" />
      <v-select-option label="已撤销单位" value="4" disabled />
    </v-select>
    <v-select model-value="" placeholder="禁用状态" disabled />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 320px;
}
</style>
