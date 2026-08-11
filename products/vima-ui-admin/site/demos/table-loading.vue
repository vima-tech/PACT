<script setup lang="ts">
import { ref } from 'vue';

const rows = [
  { id: 1, name: '张三', dept: '刑侦支队', status: '在岗', score: 92 },
  { id: 2, name: '李四', dept: '治安大队', status: '休假', score: 78 },
  { id: 3, name: '王五', dept: '交警一中队', status: '在岗', score: 85 }
];
const columns = [
  { title: '姓名', key: 'name', width: 120 },
  { title: '所属部门', key: 'dept' },
  { title: '考核分', key: 'score', width: 100 }
];
const loading = ref(false);

function refresh() {
  loading.value = true;
  setTimeout(() => (loading.value = false), 1400);
}
</script>

<template>
  <v-table id="id" :columns="columns" :data-source="rows" :loading="loading" default-toolbar>
    <template #toolbar>
      <v-button size="sm" type="primary" @click="refresh">刷新</v-button>
    </template>
  </v-table>
</template>
