<template>
  <div class="demo-drawer">
    <div class="demo-row">
      <v-button @click="openDrawer('right')">右侧打开</v-button>
      <v-button @click="openDrawer('left')">左侧打开</v-button>
      <v-button @click="openDrawer('top')">顶部打开</v-button>
      <v-button @click="openDrawer('bottom')">底部打开</v-button>
    </div>
    
    <v-drawer
      v-model="visible"
      :title="title"
      :direction="direction"
      :size="size"
    >
      <div>
        <p>这是抽屉内容</p>
        <p>支持四个方向：rtl（右）、ltr（左）、ttb（上）、btt（下）</p>
      </div>
      <template #footer>
        <v-button @click="visible = false">取消</v-button>
        <v-button type="primary" @click="visible = false">确定</v-button>
      </template>
    </v-drawer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VDrawer, VButton } from '@vima-tech/ui-admin'

const visible = ref(false)
const title = ref('抽屉标题')
const direction = ref('rtl')
const size = ref('400px')

const openDrawer = (dir) => {
  direction.value = dir
  title.value = `${dir.toUpperCase()} 抽屉`
  size.value = dir === 'rtl' || dir === 'ltr' ? '400px' : '300px'
  visible.value = true
}
</script>

<style scoped>
.demo-drawer {
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
