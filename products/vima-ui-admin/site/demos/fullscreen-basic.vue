<template>
  <!-- 无渲染组件：自己不产出任何 DOM，只把 toggle / isFullscreen 通过作用域插槽交出来 -->
  <v-fullscreen v-slot="{ toggle, isFullscreen }">
    <div class="board">
      <p>当前：{{ isFullscreen ? '全屏中' : '普通视图' }}</p>
      <v-button type="primary" @click="toggle">{{ isFullscreen ? '退出全屏' : '进入全屏' }}</v-button>
    </div>
  </v-fullscreen>
</template>

<style scoped>
.board {
  padding: 20px;
  border: 1px dashed var(--vui-control-border);
  border-radius: 12px;
  color: var(--vui-text-sub);
  font-size: 13px;
}
</style>
