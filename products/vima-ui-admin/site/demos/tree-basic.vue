<script setup lang="ts">
const data = [
  {
    id: 1,
    title: '市公安局',
    children: [
      { id: 11, title: '刑侦支队' },
      { id: 12, title: '治安大队', children: [{ id: 121, title: '城关派出所' }] }
    ]
  },
  { id: 2, title: '交警支队' }
];
</script>

<template>
  <v-tree :data="data" @node-click="() => {}" />
</template>
