<script setup lang="ts">
const columns = [
  { title: '单位', key: 'name', width: 220 },
  { title: '负责人', key: 'leader' },
  { title: '编制', key: 'size', width: 100 }
];
const rows = [
  {
    id: 1,
    name: '市局',
    leader: '赵局',
    size: 320,
    children: [
      { id: 11, name: '刑侦支队', leader: '钱队', size: 64 },
      { id: 12, name: '治安大队', leader: '孙队', size: 48 }
    ]
  },
  { id: 2, name: '分局', leader: '李局', size: 150 }
];
</script>

<template>
  <v-table id="id" :columns="columns" :data-source="rows" default-expand-all />
</template>
