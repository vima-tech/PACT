<template>
  <v-row class="grid-demo" :gutter="20">
    <v-col :span="24"><div class="cell">span = 24</div></v-col>
    <v-col :span="12"><div class="cell">span = 12</div></v-col>
    <v-col :span="12"><div class="cell">span = 12</div></v-col>
    <v-col :span="8"><div class="cell">span = 8</div></v-col>
    <v-col :span="8"><div class="cell">span = 8</div></v-col>
    <v-col :span="6" :offset="2"><div class="cell">span = 6 / offset = 2</div></v-col>
  </v-row>
</template>

<style scoped>
.grid-demo .cell {
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 9px;
  background: var(--vui-surface-hover);
  color: var(--vui-text-sub);
  font-size: 13px;
  text-align: center;
}
</style>
