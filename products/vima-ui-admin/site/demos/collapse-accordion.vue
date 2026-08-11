<script setup lang="ts">
import { ref } from 'vue';

const open = ref('a');
</script>

<template>
  <v-collapse v-model="open" accordion>
    <v-collapse-item id="a" title="第一节">手风琴模式下同时只展开一节。</v-collapse-item>
    <v-collapse-item id="b" title="第二节">展开这一节，上一节会自动收起。</v-collapse-item>
    <v-collapse-item id="c" title="第三节">第三节内容。</v-collapse-item>
  </v-collapse>
</template>
