<template>
  <div class="demo-template">
    <v-card title="可视化模板编辑器">
      <template #extra>
        <v-button size="sm" @click="showJSON = !showJSON">
          {{ showJSON ? '隐藏JSON' : '查看JSON' }}
        </v-button>
      </template>
      
      <div class="demo-desc">
        <p>
          随包发布的 <code>VTemplateEditor</code>：拖拽摆放、八向缩放、尺寸约束、对齐吸附、
          撤销重做、多选与复制粘贴，栅格模式还能按 LG / MD / SM 分别调布局。保存后持久化到当前浏览器。
        </p>
        <span v-if="saveStatus" class="demo-save-status"><v-icon type="check-circle" /> {{ saveStatus }}</span>
      </div>
      
      <!-- 模板编辑器 -->
      <div class="demo-editor-wrapper">
        <VTemplateEditor
          v-model="template"
          @save="handleSave"
        />
      </div>
      
      <!-- JSON预览 -->
      <div class="demo-json-section" v-if="showJSON">
        <h3>模板JSON配置</h3>
        <pre class="demo-json">{{ JSON.stringify(template, null, 2) }}</pre>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { LocalTemplateStorage, VCard, VButton, VIcon, VTemplateEditor, message } from '@vima-tech/ui-admin'


const showJSON = ref(false)
const saveStatus = ref('')
const storage = new LocalTemplateStorage('vui-template-demo:')

const template = ref({
  id: 'demo-form',
  name: '用户信息表单',
  type: 'form',
  version: '1.0.0',
  root: {
    id: 'root-1',
    type: 'form',
    props: { layout: 'vertical', labelWidth: '100px' },
    children: [
      {
        id: 'item-1',
        type: 'form-item',
        props: { label: '姓名', field: 'name', required: true },
        children: [{ type: 'input', props: { placeholder: '请输入姓名' } }]
      },
      {
        id: 'item-2',
        type: 'form-item',
        props: { label: '邮箱', field: 'email' },
        children: [{ type: 'input', props: { placeholder: '请输入邮箱' } }]
      },
      {
        id: 'item-3',
        type: 'form-item',
        props: { label: '状态', field: 'status' },
        children: [{
          type: 'select',
          props: {
            placeholder: '请选择状态',
            options: [
              { value: 'active', label: '启用' },
              { value: 'disabled', label: '禁用' }
            ]
          }
        }]
      },
      {
        id: 'item-4',
        type: 'form-item',
        props: { label: '备注', field: 'remark' },
        children: [{ type: 'textarea', props: { placeholder: '请输入备注', rows: 3 } }]
      },
      {
        id: 'btn-1',
        type: 'button',
        props: { type: 'primary', text: '提交' }
      },
      {
        id: 'btn-2',
        type: 'button',
        props: { type: 'default', text: '取消' }
      }
    ]
  }
})

const handleSave = async (data) => {
  await storage.save(data)
  saveStatus.value = `已保存于 ${new Date().toLocaleTimeString()}`
  message.success('模板已保存')
}

onMounted(async () => {
  const saved = await storage.load(template.value.id)
  if (saved) {
    template.value = saved
    saveStatus.value = '已恢复上次保存的模板'
  }
})
</script>

<style scoped>
.demo-template {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-desc {
  margin-bottom: 16px;
  color: var(--vui-text-sub);
  line-height: 1.6;
}

.demo-save-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vui-success, #2f845d);
  font-size: 13px;
}

.demo-editor-wrapper {
  height: 700px;
  border: 1px solid var(--vui-border);
  border-radius: 8px;
  overflow: hidden;
}

.demo-json-section {
  margin-top: 16px;
}

.demo-json-section h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--vui-text-sub);
  margin-bottom: 8px;
}

.demo-json {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  max-height: 400px;
}
</style>
