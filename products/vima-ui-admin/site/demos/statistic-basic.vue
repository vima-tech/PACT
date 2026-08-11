<template>
  <div class="demo-statistic">
    <div class="demo-grid">
      <v-card>
        <v-statistic title="活跃用户" :value="126560" group-separator suffix="人" />
      </v-card>
      
      <v-card>
        <v-statistic title="本月收入" :value="98560.50" :precision="2" prefix="¥" group-separator />
      </v-card>
      
      <v-card>
        <v-statistic title="增长率" :value="12.5" :precision="1" suffix="%" prefix="↑" :value-style="{ color: '#52c41a' }" />
      </v-card>
      
      <v-card>
        <v-countdown :value="countdownTime" title="距离活动开始" @finish="handleFinish" />
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VCard, VStatistic, VCountdown } from '@vima-tech/ui-admin'

// 设置倒计时为24小时后
const countdownTime = ref(Date.now() + 24 * 60 * 60 * 1000)

const handleFinish = () => {
  console.log('倒计时结束')
}
</script>

<style scoped>
.demo-statistic {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
</style>
