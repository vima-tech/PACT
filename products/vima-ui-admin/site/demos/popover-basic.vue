<template>
  <div class="demo-popover">
    <div class="demo-row">
      <v-popover title="提示标题" content="这是一段提示内容" trigger="click">
        <v-button>点击触发</v-button>
      </v-popover>
      
      <v-popover title="提示标题" content="鼠标悬停触发" trigger="hover">
        <v-button>悬停触发</v-button>
      </v-popover>
    </div>
    
    <div class="demo-row">
      <v-popover placement="top" trigger="click">
        <v-button>自定义内容</v-button>
        <template #title>
          <span style="color: var(--vui-primary);">自定义标题</span>
        </template>
        <template #content>
          <div style="padding: 8px 0;">
            <p>这是自定义的富文本内容</p>
            <v-button type="primary" size="sm" style="margin-top: 8px;">操作按钮</v-button>
          </div>
        </template>
      </v-popover>
    </div>
  </div>
</template>

<script setup>
import { VPopover, VButton } from '@vima-tech/ui-admin'
</script>

<style scoped>
.demo-popover {
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
