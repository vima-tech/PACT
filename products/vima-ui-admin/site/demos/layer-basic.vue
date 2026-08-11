<script setup lang="ts">
import { ref } from 'vue';

const open = ref(false);
</script>

<template>
  <div>
    <v-button type="primary" @click="open = true">打开弹窗</v-button>
    <v-layer v-model="open" title="人员详情" :area="['520px', 'auto']">
      <p>弹窗正文。Esc 可以关闭。</p>
    </v-layer>
  </div>
</template>
