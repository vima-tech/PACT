<script setup lang="ts">
import { ref } from 'vue';

const percent = ref(42);
</script>

<template>
  <div>
    <v-progress :percent="percent" />
    <v-progress :percent="100" status="success" />
    <div style="margin-top: 12px">
      <v-button size="sm" @click="percent = Math.max(0, percent - 10)">-10</v-button>
      <v-button size="sm" @click="percent = Math.min(100, percent + 10)">+10</v-button>
    </div>
  </div>
</template>
