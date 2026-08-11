<script setup lang="ts">
import { ref } from 'vue';

const query = ref({ keyword: '', status: '' });
</script>

<template>
  <v-form :model="query" layout="inline">
    <v-form-item label="关键字">
      <v-input v-model="query.keyword" placeholder="姓名/警号" />
    </v-form-item>
    <v-form-item label="状态">
      <v-select v-model="query.status" placeholder="全部" clearable>
        <v-select-option label="在岗" value="on" />
        <v-select-option label="休假" value="off" />
      </v-select>
    </v-form-item>
    <v-form-item>
      <v-button type="primary">查询</v-button>
      <v-button @click="query = { keyword: '', status: '' }">重置</v-button>
    </v-form-item>
  </v-form>
</template>
