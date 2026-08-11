<template>
  <div class="demo-empty">
    <v-card title="默认空状态">
      <v-empty />
    </v-card>
    
    <v-card title="自定义描述">
      <v-empty description="暂无用户数据" />
    </v-card>
    
    <v-card title="带操作按钮">
      <v-empty description="暂无订单记录">
        <template #footer>
          <v-button type="primary">去下单</v-button>
        </template>
      </v-empty>
    </v-card>
  </div>
</template>

<script setup>
import { VCard, VEmpty, VButton } from '@vima-tech/ui-admin'
</script>

<style scoped>
.demo-empty {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
