<script setup lang="ts">
import { ref } from 'vue';

const loading = ref(true);
</script>

<template>
  <div>
    <v-button size="sm" @click="loading = !loading">{{ loading ? '停止' : '开始' }}加载</v-button>
    <v-loading :loading="loading" text="正在加载" style="margin-top: 12px">
      <v-descriptions title="内容还在，只是被罩住" :column="2" label-width="72px">
        <v-descriptions-item label="姓名">张三</v-descriptions-item>
        <v-descriptions-item label="部门">刑侦支队</v-descriptions-item>
        <v-descriptions-item label="警号">061203</v-descriptions-item>
        <v-descriptions-item label="状态">在岗</v-descriptions-item>
      </v-descriptions>
    </v-loading>
  </div>
</template>
