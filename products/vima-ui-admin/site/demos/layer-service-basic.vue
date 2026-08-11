<script setup lang="ts">
import { layer } from '@vima-tech/ui-admin';

function confirmDelete() {
  layer.confirm('确定删除这条记录吗？', {
    title: '删除确认',
    btn: [
      {
        text: '删除',
        callback: (index) => {
          layer.close(index);
          layer.msg('已删除', { icon: 1 });
        }
      },
      { text: '再想想', callback: (index) => layer.close(index) }
    ]
  });
}

function load() {
  const index = layer.load();
  setTimeout(() => layer.close(index), 1200);
}
</script>

<template>
  <div>
    <v-button @click="layer.msg('已保存', { icon: 1 })">消息</v-button>
    <v-button @click="layer.msg('请先选择数据', { icon: 2 })">警告消息</v-button>
    <v-button @click="layer.notify({ title: '待办提醒', content: '有 3 条待办等待处理' })">通知</v-button>
    <v-button @click="confirmDelete">确认框</v-button>
    <v-button @click="load">加载中</v-button>
  </div>
</template>
