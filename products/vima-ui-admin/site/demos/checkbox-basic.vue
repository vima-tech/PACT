<script setup lang="ts">
import { ref } from 'vue';

const agreed = ref(false);
const permissions = ref<Array<string | number | boolean>>(['read']);
const options = [
  { label: '查看', value: 'read' },
  { label: '编辑', value: 'write' },
  { label: '删除（禁用）', value: 'delete', disabled: true }
];
</script>

<template>
  <div class="checkbox-demo">
    <v-checkbox v-model="agreed" label="启用通知" />
    <v-checkbox :model-value="false" indeterminate label="部分选中" />
    <v-checkbox :model-value="true" disabled label="禁用状态" />
    <v-divider />
    <v-checkbox-group v-model="permissions" :options="options" />
    <p>已选：{{ permissions.join('、') || '无' }}</p>
  </div>
</template>

<style scoped>
.checkbox-demo p {
  margin: 10px 0 0;
  color: var(--vui-text-sub);
  font-size: 13px;
}
</style>
