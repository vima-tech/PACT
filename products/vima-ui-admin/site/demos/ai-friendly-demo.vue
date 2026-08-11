<template>
  <div class="demo-ai-friendly">
    <v-card title="AI友好型API演示">
      <div class="demo-section">
        <h3>1. 智能默认值推断</h3>
        <p class="demo-desc">根据字段名自动推断配置，AI只需提供字段名即可</p>
        
        <v-form :model="formData">
          <v-form-item label="姓名">
            <v-input v-model="formData.name" v-bind="inferConfig('name', '姓名')" />
          </v-form-item>
          <v-form-item label="邮箱">
            <v-input v-model="formData.email" v-bind="inferConfig('email', '邮箱')" />
          </v-form-item>
          <v-form-item label="手机号">
            <v-input v-model="formData.phone" v-bind="inferConfig('phone', '手机号')" />
          </v-form-item>
          <v-form-item label="年龄">
            <v-input-number v-model="formData.age" v-bind="inferConfig('age', '年龄')" />
          </v-form-item>
        </v-form>
      </div>
      
      <div class="demo-section">
        <h3>2. 代码生成</h3>
        <p class="demo-desc">AI可以自动生成标准化的表单代码</p>
        
        <div class="demo-code">
          <div class="demo-code-header">
            <span>生成的代码</span>
            <v-button size="sm" @click="copyCode">复制</v-button>
          </div>
          <pre><code>{{ generatedCode }}</code></pre>
        </div>
      </div>
      
      <div class="demo-section">
        <h3>3. 错误提示优化</h3>
        <p class="demo-desc">详细的错误信息帮助AI自我纠正</p>
        
        <div class="demo-errors">
          <div v-for="(error, index) in errors" :key="index" class="demo-error-item">
            <span class="demo-error-code">{{ error.code }}</span>
            <span class="demo-error-message">{{ error.message }}</span>
            <span class="demo-error-suggestion">{{ error.suggestion }}</span>
          </div>
        </div>
      </div>
      
      <div class="demo-section">
        <h3>4. 性能监控</h3>
        <p class="demo-desc">组件渲染性能实时监控</p>
        
        <div class="demo-perf">
          <div v-for="(metric, key) in performanceMetrics" :key="key" class="demo-perf-item">
            <span class="demo-perf-key">{{ key }}</span>
            <span class="demo-perf-value">{{ metric.toFixed(2) }}ms</span>
          </div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { 
  VCard, VForm, VFormItem, VInput, VInputNumber, VButton,
  inferFieldConfig, generateFormCode, UIError, 
  measurePerformance, getAveragePerformance
} from '@vima-tech/ui-admin'

const formData = reactive({
  name: '',
  email: '',
  phone: '',
  age: 0
})

// 智能推断配置
const inferConfig = (fieldName, label) => {
  const config = inferFieldConfig(fieldName, label)
  return {
    placeholder: config.placeholder,
    required: config.required,
    type: config.type === 'textarea' ? undefined : config.type
  }
}

// 生成的代码
const generatedCode = ref('')

// 错误示例
const errors = ref([
  new UIError({
    code: 'INVALID_PROP_VALUE',
    component: 'VButton',
    prop: 'mode',
    received: 'invalid',
    expected: ['primary', 'secondary', 'danger', 'text'],
    message: 'VButton的mode属性值"invalid"无效',
    suggestion: '可选值为: primary, secondary, danger, text'
  }),
  new UIError({
    code: 'MISSING_REQUIRED_PROP',
    component: 'VInput',
    prop: 'modelValue',
    received: undefined,
    expected: 'string | number',
    message: 'VInput缺少必需的modelValue属性',
    suggestion: '请添加v-model或:model-value属性'
  })
])

// 性能指标
const performanceMetrics = ref({})

onMounted(() => {
  // 模拟性能测量
  measurePerformance('VTable', 'render', () => {
    // 模拟渲染
    for (let i = 0; i < 1000; i++) {
      Math.random()
    }
  })
  
  measurePerformance('VForm', 'mount', () => {
    // 模拟挂载
    for (let i = 0; i < 500; i++) {
      Math.random()
    }
  })
  
  performanceMetrics.value = getAveragePerformance()
  
  // 生成表单代码
  generatedCode.value = generateFormCode([
    { name: 'name', label: '姓名', type: 'string', required: true },
    { name: 'email', label: '邮箱', type: 'string', required: true },
    { name: 'phone', label: '手机号', type: 'string', required: true },
    { name: 'age', label: '年龄', type: 'number' }
  ])
})

const copyCode = () => {
  navigator.clipboard.writeText(generatedCode.value)
    .then(() => alert('代码已复制'))
    .catch(() => alert('复制失败'))
}
</script>

<style scoped>
.demo-ai-friendly {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-section {
  margin-bottom: 24px;
}

.demo-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--vui-text-title);
  margin-bottom: 8px;
}

.demo-desc {
  font-size: 14px;
  color: var(--vui-text-sub);
  margin-bottom: 16px;
}

.demo-code {
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.demo-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #e8eaed;
  font-size: 13px;
  color: var(--vui-text-sub);
}

.demo-code pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}

.demo-code code {
  color: var(--vui-text-body);
}

.demo-errors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-error-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #fff2f0;
  border-radius: 6px;
  border-left: 3px solid #f5222d;
}

.demo-error-code {
  font-size: 12px;
  font-weight: 600;
  color: #f5222d;
}

.demo-error-message {
  font-size: 14px;
  color: var(--vui-text-body);
}

.demo-error-suggestion {
  font-size: 13px;
  color: var(--vui-text-sub);
  font-style: italic;
}

.demo-perf {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-perf-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f6ffed;
  border-radius: 6px;
}

.demo-perf-key {
  font-size: 13px;
  color: var(--vui-text-sub);
}

.demo-perf-value {
  font-size: 14px;
  font-weight: 600;
  color: #52c41a;
}
</style>
