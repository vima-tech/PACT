<template>
  <div class="demo-alert">
    <v-alert type="info" title="信息提示" description="这是一条信息提示，用于展示一般信息。" show-icon />
    
    <v-alert type="success" title="操作成功" description="数据已成功保存，请继续其他操作。" show-icon />
    
    <v-alert type="warning" title="警告提示" description="请注意，此操作不可撤销，请谨慎操作。" show-icon />
    
    <v-alert type="error" title="错误提示" description="系统发生错误，请稍后重试或联系管理员。" show-icon />
    
    <v-alert type="info" title="可关闭提示" description="这是一条可关闭的提示信息。" @close="handleClose" />
    
    <v-alert type="success" title="无图标提示" description="不显示图标的提示信息。" />
  </div>
</template>

<script setup>
import { VAlert } from '@vima-tech/ui-admin'

const handleClose = () => {
  console.log('提示已关闭')
}
</script>

<style scoped>
.demo-alert {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
