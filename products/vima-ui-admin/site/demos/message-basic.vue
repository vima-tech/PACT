<template>
  <div class="demo-message">
    <div class="demo-row">
      <v-button @click="showInfo">信息提示</v-button>
      <v-button @click="showSuccess">成功提示</v-button>
      <v-button @click="showWarning">警告提示</v-button>
      <v-button @click="showError">错误提示</v-button>
    </div>
    
    <div class="demo-row">
      <v-button @click="showClosable">可关闭消息</v-button>
      <v-button @click="showDuration">自定义时长</v-button>
      <v-button @click="closeAll">关闭全部</v-button>
    </div>
    
    <div class="demo-row">
      <v-button @click="showConfirm">确认对话框</v-button>
      <v-button @click="showAlert">警告对话框</v-button>
    </div>
  </div>
</template>

<script setup>
import { VButton, message, messageBox } from '@vima-tech/ui-admin'

const showInfo = () => {
  message.info('这是一条信息提示')
}

const showSuccess = () => {
  message.success('操作成功！')
}

const showWarning = () => {
  message.warning('请注意，此操作不可撤销')
}

const showError = () => {
  message.error('系统发生错误，请稍后重试')
}

const showClosable = () => {
  message.info({ content: '这是一条可关闭的消息', duration: 0, closable: true })
}

const showDuration = () => {
  message.success({ content: '这条消息显示5秒', duration: 5000 })
}

const closeAll = () => {
  message.closeAll()
}

const showConfirm = async () => {
  const action = await messageBox.confirm('确定要删除这条数据吗？', '确认删除')
  console.log('用户选择：', action)
}

const showAlert = async () => {
  const action = await messageBox.alert('这是一条警告信息', '警告', { showCancelButton: false })
  console.log('用户选择：', action)
}
</script>

<style scoped>
.demo-message {
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
