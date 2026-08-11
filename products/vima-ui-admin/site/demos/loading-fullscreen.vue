<script setup lang="ts">
import { ref } from 'vue';

const busy = ref(false);

function submit() {
  busy.value = true;
  setTimeout(() => (busy.value = false), 1200);
}
</script>

<template>
  <div>
    <v-button type="primary" @click="submit">提交（1.2 秒全屏遮罩）</v-button>
    <v-loading :loading="busy" fullscreen text="正在提交" />
  </div>
</template>
