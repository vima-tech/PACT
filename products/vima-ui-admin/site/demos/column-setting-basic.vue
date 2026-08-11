<script setup lang="ts">
import { ref } from 'vue';

/** 全量列定义：顺序即默认顺序，组件不会改写它 */
const ALL_COLUMNS = [
  { title: '姓名', key: 'name', width: 120 },
  { title: '所属部门', key: 'dept' },
  { title: '状态', key: 'status', width: 100 },
  { title: '考核分', key: 'score', width: 100 },
  { title: '操作', key: 'operator', width: 150, customSlot: 'operator' }
];
/** 生效列：由 VColumnSetting 写回，页面只管把它喂给表格 */
const columns = ref([...ALL_COLUMNS]);
const rows = [
  { id: 1, name: '张三', dept: '刑侦支队', status: '在岗', score: 92 },
  { id: 2, name: '李四', dept: '治安大队', status: '休假', score: 78 },
  { id: 3, name: '王五', dept: '交警一中队', status: '在岗', score: 85 }
];
</script>

<template>
  <v-table id="id" :columns="columns" :data-source="rows" default-toolbar>
    <template #toolbar>
      <v-column-setting v-model="columns" :source="ALL_COLUMNS" storage-key="docs-demo" />
    </template>
    <template #operator>
      <v-button size="sm">编辑</v-button>
    </template>
  </v-table>
</template>
