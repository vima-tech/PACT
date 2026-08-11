<script setup lang="ts">
import { ref } from 'vue';

const workStart = ref('09:00');
const meeting = ref('14:30:00');
</script>

<template>
  <v-row :gutter="16">
    <v-col :span="8">
      <v-time-picker v-model="workStart" min="08:00" max="18:00" />
    </v-col>
    <v-col :span="8">
      <v-time-picker v-model="meeting" :step="1" />
    </v-col>
    <v-col :span="8">
      <v-time-picker model-value="12:00" disabled />
    </v-col>
  </v-row>
</template>
