<template>
  <div class="demo-avatar">
    <div class="demo-row">
      <v-avatar text="张" />
      <v-avatar text="李" color="#52c41a" />
      <v-avatar text="王" color="#722ed1" />
      <v-avatar icon="username" />
    </div>
    <div class="demo-row">
      <v-avatar text="小" size="xs" />
      <v-avatar text="中" size="sm" />
      <v-avatar text="大" size="md" />
      <v-avatar text="特" size="lg" />
      <v-avatar text="超" size="xl" />
    </div>
    <div class="demo-row">
      <v-avatar text="圆" shape="circle" />
      <v-avatar text="方" shape="square" />
    </div>
    <div class="demo-row">
      <v-avatar-group :max="3">
        <v-avatar text="张三" />
        <v-avatar text="李四" color="#52c41a" />
        <v-avatar text="王五" color="#722ed1" />
        <v-avatar text="赵六" color="#faad14" />
        <v-avatar text="钱七" color="#f5222d" />
      </v-avatar-group>
    </div>
  </div>
</template>

<script setup>
import { VAvatar, VAvatarGroup } from '@vima-tech/ui-admin'
</script>

<style scoped>
.demo-avatar {
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
