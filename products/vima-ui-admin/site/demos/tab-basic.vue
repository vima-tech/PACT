<script setup lang="ts">
import { ref } from 'vue';

const active = ref('base');
</script>

<template>
  <v-tab v-model="active">
    <v-tab-item id="base" title="基本信息">这里是基本信息。</v-tab-item>
    <v-tab-item id="record" title="办案记录">这里是办案记录。</v-tab-item>
    <v-tab-item id="award" title="奖惩">这里是奖惩信息。</v-tab-item>
  </v-tab>
</template>
