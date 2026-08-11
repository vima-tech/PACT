<template>
  <div class="demo-breadcrumb">
    <v-breadcrumb>
      <v-breadcrumb-item to="/">首页</v-breadcrumb-item>
      <v-breadcrumb-item to="/user">用户管理</v-breadcrumb-item>
      <v-breadcrumb-item>用户详情</v-breadcrumb-item>
    </v-breadcrumb>
    
    <v-breadcrumb separator=">">
      <v-breadcrumb-item to="/">首页</v-breadcrumb-item>
      <v-breadcrumb-item to="/product">商品管理</v-breadcrumb-item>
      <v-breadcrumb-item to="/product/list">商品列表</v-breadcrumb-item>
      <v-breadcrumb-item>商品详情</v-breadcrumb-item>
    </v-breadcrumb>
    
    <v-breadcrumb separator="→">
      <v-breadcrumb-item to="/">工作台</v-breadcrumb-item>
      <v-breadcrumb-item to="/project">项目管理</v-breadcrumb-item>
      <v-breadcrumb-item to="/project/task">任务列表</v-breadcrumb-item>
      <v-breadcrumb-item>任务详情</v-breadcrumb-item>
    </v-breadcrumb>
  </div>
</template>

<script setup>
import { VBreadcrumb, VBreadcrumbItem } from '@vima-tech/ui-admin'
</script>

<style scoped>
.demo-breadcrumb {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
