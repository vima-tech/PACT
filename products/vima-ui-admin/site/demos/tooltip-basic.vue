<template>
  <div class="demo-tooltip">
    <div class="demo-row">
      <v-tooltip content="上方提示" placement="top">
        <v-button>上</v-button>
      </v-tooltip>
      <v-tooltip content="下方提示" placement="bottom">
        <v-button>下</v-button>
      </v-tooltip>
      <v-tooltip content="左侧提示" placement="left">
        <v-button>左</v-button>
      </v-tooltip>
      <v-tooltip content="右侧提示" placement="right">
        <v-button>右</v-button>
      </v-tooltip>
    </div>
    
    <div class="demo-row">
      <v-tooltip content="点击触发" trigger="click">
        <v-button>点击</v-button>
      </v-tooltip>
      <v-tooltip content="明亮风格" effect="light">
        <v-button>明亮</v-button>
      </v-tooltip>
      <v-tooltip content="暗黑风格" effect="dark">
        <v-button>暗黑</v-button>
      </v-tooltip>
    </div>
    
    <div class="demo-row">
      <v-tooltip placement="top">
        <v-button>自定义内容</v-button>
        <template #content>
          <div style="padding: 8px;">
            <strong>提示标题</strong>
            <p style="margin: 4px 0 0;">这是自定义的富文本内容</p>
          </div>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup>
import { VTooltip, VButton } from '@vima-tech/ui-admin'
</script>

<style scoped>
.demo-tooltip {
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
