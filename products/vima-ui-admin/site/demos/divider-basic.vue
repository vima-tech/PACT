<template>
  <div>
    <p>上半部分内容</p>
    <v-divider />
    <p>无文字分割线</p>
    <v-divider content="带文字的分割线" />
    <v-divider content="靠左文字" content-position="left" />
    <span>文字</span><v-divider direction="vertical" /><span>文字</span>
    <p>下半部分内容</p>
  </div>
</template>
