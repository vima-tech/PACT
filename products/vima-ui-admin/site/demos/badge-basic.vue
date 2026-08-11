<template>
  <div class="demo-badge">
    <v-card title="徽标位置演示">
      <div class="demo-section">
        <h4>数字徽标</h4>
        <div class="demo-row">
          <v-badge :value="12">
            <v-button>消息</v-button>
          </v-badge>
          <v-badge :value="200" :max="99">
            <v-button>通知</v-button>
          </v-badge>
          <v-badge :value="5" type="primary">
            <v-button>Primary</v-button>
          </v-badge>
        </div>
      </div>
      
      <div class="demo-section">
        <h4>圆点徽标</h4>
        <div class="demo-row">
          <v-badge dot>
            <v-button>新功能</v-button>
          </v-badge>
          <v-badge dot type="success">
            <v-button>成功</v-button>
          </v-badge>
          <v-badge dot type="warning">
            <v-button>警告</v-button>
          </v-badge>
        </div>
      </div>
      
      <div class="demo-section">
        <h4>自定义内容</h4>
        <div class="demo-row">
          <v-badge value="NEW" type="primary">
            <v-button>自定义文案</v-button>
          </v-badge>
          <v-badge value="HOT" type="danger">
            <v-button>热门</v-button>
          </v-badge>
          <v-badge :value="0" show-zero>
            <v-button>显示0</v-button>
          </v-badge>
        </div>
      </div>
      
      <div class="demo-section">
        <h4>不同容器</h4>
        <div class="demo-row">
          <v-badge :value="3" type="danger">
            <div class="demo-box">方块</div>
          </v-badge>
          <v-badge dot type="success">
            <div class="demo-circle">圆</div>
          </v-badge>
          <v-badge :value="8">
            <span class="demo-text">文字</span>
          </v-badge>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { VBadge, VButton, VCard } from '@vima-tech/ui-admin'
</script>

<style scoped>
.demo-badge {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-section {
  margin-bottom: 24px;
}

.demo-section h4 {
  font-size: 14px;
  font-weight: 500;
  color: var(--vui-text-sub);
  margin-bottom: 12px;
}

.demo-row {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  flex-wrap: wrap;
}

.demo-box {
  width: 60px;
  height: 60px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #1890ff;
  border-radius: 4px;
}

.demo-circle {
  width: 60px;
  height: 60px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #52c41a;
  border-radius: 50%;
}

.demo-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--vui-text-body);
  padding: 8px;
}
</style>
