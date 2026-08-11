<template>
  <!--
    VLayout 默认纵向排列，直接子元素里出现 VSide 时自动转横向。
    所以顶栏放进 VBody、与内容区同列，侧栏才能通高。
    整页使用时给最外层加 vui-layout-fill，让它撑满已确定高度的父容器。
  -->
  <VLayout class="shell">
    <VSide class="shell-side">侧边栏</VSide>
    <VBody>
      <VHeader class="shell-header">顶栏</VHeader>
      <div class="shell-main">内容区（高度由 VBody 分配，不用写 100vh）</div>
    </VBody>
  </VLayout>
</template>

<style scoped>
.shell {
  height: 180px;
  overflow: hidden;
  border: 1px solid var(--vui-border);
  border-radius: 12px;
  font-size: 13px;
}

.shell-side {
  width: 160px;
  padding: 12px 16px;
  background: var(--vui-surface-hover);
  color: var(--vui-text-sub);
}

.shell-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--vui-primary);
  color: #fff;
}

/* VBody 已经是纵向 flex 且 min-height:0，这里只需声明谁吃掉剩余高度 */
.shell-main {
  flex: 1;
  min-height: 0;
  padding: 12px 16px;
  overflow: auto;
  color: var(--vui-text-sub);
}
</style>
