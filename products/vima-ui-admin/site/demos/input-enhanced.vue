<template>
  <div class="demo-input-enhanced">
    <v-card title="前缀和后缀">
      <div class="demo-grid">
        <div class="demo-item">
          <label>文字前缀</label>
          <v-input v-model="value1" prefix="https://" placeholder="请输入网址" />
        </div>
        
        <div class="demo-item">
          <label>文字后缀</label>
          <v-input v-model="value2" suffix="@gmail.com" placeholder="请输入邮箱" />
        </div>
        
        <div class="demo-item">
          <label>前缀+后缀</label>
          <v-input v-model="value3" prefix="¥" suffix="元" placeholder="请输入金额" />
        </div>
        
        <div class="demo-item">
          <label>图标前缀</label>
          <v-input v-model="value4" prefix-icon="search" placeholder="搜索..." />
        </div>
      </div>
    </v-card>
    
    <v-card title="插槽方式">
      <div class="demo-grid">
        <div class="demo-item">
          <label>前缀插槽</label>
          <v-input v-model="value5" placeholder="请输入内容">
            <template #prefix>
              <v-icon type="search" style="color: var(--vui-primary);" />
            </template>
          </v-input>
        </div>
        
        <div class="demo-item">
          <label>后缀插槽</label>
          <v-input v-model="value6" placeholder="请输入内容">
            <template #suffix>
              <v-icon type="paperclip" style="cursor: pointer;" @click="handleSuffixClick" />
            </template>
          </v-input>
        </div>
        
        <div class="demo-item">
          <label>自定义前后缀</label>
          <v-input v-model="value7" placeholder="搜索用户">
            <template #prefix>
              <span style="color: #999;">用户:</span>
            </template>
            <template #suffix>
              <span style="color: var(--vui-primary); cursor: pointer;">搜索</span>
            </template>
          </v-input>
        </div>
      </div>
    </v-card>
    
    <v-card title="可清空功能">
      <div class="demo-grid">
        <div class="demo-item">
          <label>鼠标悬停显示清除按钮</label>
          <v-input v-model="value8" clearable placeholder="输入内容后悬停查看" />
        </div>
        
        <div class="demo-item">
          <label>密码输入框</label>
          <v-input v-model="value9" type="password" show-password placeholder="请输入密码" />
        </div>
        
        <div class="demo-item">
          <label>带清空的前缀输入</label>
          <v-input v-model="value10" prefix="搜索" clearable placeholder="输入关键词" />
        </div>
      </div>
    </v-card>
    
    <v-card title="当前值">
      <div class="demo-values">
        <div v-for="(item, index) in values" :key="index" class="demo-value-item">
          <span class="demo-value-label">{{ item.label }}:</span>
          <span class="demo-value-text">{{ item.value || '(空)' }}</span>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { VInput, VCard, VIcon } from '@vima-tech/ui-admin'

const value1 = ref('')
const value2 = ref('')
const value3 = ref('')
const value4 = ref('')
const value5 = ref('')
const value6 = ref('')
const value7 = ref('')
const value8 = ref('这是一段可以清空的内容')
const value9 = ref('')
const value10 = ref('')

const values = computed(() => [
  { label: '文字前缀', value: value1.value },
  { label: '文字后缀', value: value2.value },
  { label: '前缀+后缀', value: value3.value },
  { label: '图标前缀', value: value4.value },
  { label: '前缀插槽', value: value5.value },
  { label: '后缀插槽', value: value6.value },
  { label: '自定义前后缀', value: value7.value },
  { label: '可清空', value: value8.value },
  { label: '密码输入', value: value9.value ? '******' : '' },
  { label: '带清空的前缀', value: value10.value }
])

const handleSuffixClick = () => {
  alert('点击了后缀图标')
}
</script>

<style scoped>
.demo-input-enhanced {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.demo-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-item label {
  font-size: 14px;
  color: var(--vui-text-sub);
  font-weight: 500;
}

.demo-values {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-value-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vui-surface-hover);
  border-radius: 6px;
}

.demo-value-label {
  font-weight: 500;
  color: var(--vui-text-sub);
  min-width: 100px;
}

.demo-value-text {
  color: var(--vui-text-body);
}
</style>
