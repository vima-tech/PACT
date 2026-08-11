<template>
  <div class="link-demo">
    <v-link href="#/install" type="primary">安装指南</v-link>
    <v-link href="#/showcase" underline>带下划线</v-link>
    <v-link type="success">成功操作</v-link>
    <v-link type="warning">谨慎操作</v-link>
    <v-link type="danger">危险操作</v-link>
    <v-link href="https://example.com" target="_blank">新窗口打开</v-link>
    <v-link disabled>禁用链接</v-link>
  </div>
</template>

<style scoped>
.link-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}
</style>
