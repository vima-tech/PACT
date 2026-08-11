<template>
  <v-descriptions :column="2" border label-width="88px">
    <v-descriptions-item label="单位">市公安局刑侦支队</v-descriptions-item>
    <v-descriptions-item label="联系电话">0311-8888888</v-descriptions-item>
    <v-descriptions-item label="办公地址" :span="2">
      跨两列：span 让一项占满整行，适合地址、备注这类长文本。
    </v-descriptions-item>
  </v-descriptions>
</template>
