<template>
  <div class="demo-steps">
    <v-steps :active="activeStep" @change="activeStep = $event">
      <v-step title="步骤一" description="填写基本信息" />
      <v-step title="步骤二" description="上传资料" />
      <v-step title="步骤三" description="提交审核" />
      <v-step title="步骤四" description="完成" />
    </v-steps>
    
    <div class="demo-row">
      <v-button :disabled="activeStep <= 0" @click="activeStep--">上一步</v-button>
      <v-button type="primary" :disabled="activeStep >= 3" @click="activeStep++">下一步</v-button>
    </div>
    
    <v-divider />
    
    <h4>垂直步骤条</h4>
    <v-steps :active="activeStep" direction="vertical" style="height: 200px;">
      <v-step title="步骤一" description="填写基本信息" />
      <v-step title="步骤二" description="上传资料" />
      <v-step title="步骤三" description="提交审核" />
    </v-steps>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VSteps, VStep, VButton, VDivider } from '@vima-tech/ui-admin'

const activeStep = ref(0)
</script>

<style scoped>
.demo-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.demo-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
