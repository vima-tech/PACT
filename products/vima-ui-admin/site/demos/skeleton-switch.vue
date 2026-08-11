<script setup lang="ts">
import { ref } from 'vue';

const loading = ref(true);
const rows = [
  { id: 1, name: '张三', dept: '刑侦支队' },
  { id: 2, name: '李四', dept: '治安大队' }
];
const columns = [
  { title: '姓名', key: 'name', width: 140 },
  { title: '所属部门', key: 'dept' }
];

function reload() {
  loading.value = true;
  setTimeout(() => (loading.value = false), 1600);
}
</script>

<template>
  <div>
    <v-button size="sm" @click="reload">重新加载</v-button>
    <div style="margin-top: 12px">
      <v-skeleton :loading="loading" type="table" :rows="2" :columns="2">
        <v-table id="id" :columns="columns" :data-source="rows" />
      </v-skeleton>
    </div>
  </div>
</template>
