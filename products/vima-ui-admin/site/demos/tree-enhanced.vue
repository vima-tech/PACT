<template>
  <div class="demo-tree-enhanced">
    <v-card title="增强树形控件 - 父子级联动">
      <div class="demo-toolbar">
        <v-button size="sm" @click="expandAll">展开全部</v-button>
        <v-button size="sm" @click="collapseAll">折叠全部</v-button>
        <v-button size="sm" @click="getCheckedKeys">获取选中</v-button>
        <span class="demo-info">
          已选中: {{ checkedKeys.length }} 项
        </span>
      </div>
      
      <v-tree
        ref="treeRef"
        :data="treeData"
        v-model:selected-key="selectedKey"
        v-model:checked-keys="checkedKeys"
        v-model:expanded-keys="expandedKeys"
        :show-checkbox="true"
        :show-icon="true"
        :default-expand-all="true"
        @node-click="handleNodeClick"
        @check="handleCheck"
      >
        <template #title="{ node, level, isSelected, checkStatus }">
          <span :class="{ 'is-bold': level === 0 }">
            {{ node.title }}
            <span v-if="checkStatus === 'indeterminate'" class="demo-status">(半选)</span>
          </span>
        </template>
      </v-tree>
    </v-card>
    
    <v-card title="选中的节点">
      <div class="demo-checked-list">
        <div v-if="checkedKeys.length === 0" class="demo-empty">暂无选中节点</div>
        <div v-else class="demo-checked-items">
          <span v-for="key in checkedKeys" :key="key" class="demo-checked-tag">
            {{ getNodeTitle(key) }}
          </span>
        </div>
      </div>
    </v-card>
    
    <v-card title="说明">
      <div class="demo-description">
        <p><strong>功能说明：</strong></p>
        <ul>
          <li><v-icon type="check-circle" /> 选择父节点 → 自动选中所有子节点</li>
          <li><v-icon type="check-circle" /> 取消父节点 → 自动取消所有子节点</li>
          <li><v-icon type="check-circle" /> 部分子节点选中 → 父节点显示半选状态（-）</li>
          <li><v-icon type="check-circle" /> 所有子节点选中 → 父节点自动选中</li>
          <li><v-icon type="check-circle" /> 所有子节点取消 → 父节点自动取消</li>
        </ul>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { VTree, VCard, VButton, VIcon } from '@vima-tech/ui-admin'

const treeRef = ref(null)
const selectedKey = ref('')
const checkedKeys = ref([])
const expandedKeys = ref([])

const treeData = ref([
  {
    id: '1',
    title: '研发中心',
    icon: 'building',
    children: [
      {
        id: '1-1',
        title: '前端开发组',
        icon: 'monitor',
        children: [
          { id: '1-1-1', title: '张三', icon: 'user' },
          { id: '1-1-2', title: '李四', icon: 'user' },
          { id: '1-1-3', title: '王五', icon: 'user' }
        ]
      },
      {
        id: '1-2',
        title: '后端开发组',
        icon: 'settings',
        children: [
          { id: '1-2-1', title: '赵六', icon: 'user' },
          { id: '1-2-2', title: '钱七', icon: 'user' }
        ]
      },
      {
        id: '1-3',
        title: '测试组',
        icon: 'flask',
        children: [
          { id: '1-3-1', title: '孙八', icon: 'user' },
          { id: '1-3-2', title: '周九', icon: 'user' }
        ]
      }
    ]
  },
  {
    id: '2',
    title: '产品部',
    icon: 'package',
    children: [
      { id: '2-1', title: '产品经理', icon: 'user' },
      { id: '2-2', title: 'UI设计师', icon: 'user' }
    ]
  },
  {
    id: '3',
    title: '运营部',
    icon: 'chart-bar',
    children: [
      { id: '3-1', title: '市场推广', icon: 'user' },
      { id: '3-2', title: '用户运营', icon: 'user' }
    ]
  }
])

// 节点标题映射
const nodeTitleMap = computed(() => {
  const map = {}
  const traverse = (nodes) => {
    nodes.forEach(node => {
      map[node.id] = node.title
      if (node.children) traverse(node.children)
    })
  }
  traverse(treeData.value)
  return map
})

const getNodeTitle = (key) => {
  return nodeTitleMap.value[key] || key
}

// 事件处理
const handleNodeClick = (node, context) => {
  console.log('点击节点:', node.title, context)
}

const handleCheck = (keys, info) => {
  console.log('选中变化:', keys, info)
}

// 方法
const expandAll = () => {
  treeRef.value?.expandAll()
}

const collapseAll = () => {
  treeRef.value?.collapseAll()
}

const getCheckedKeys = () => {
  alert(`选中的节点ID: ${checkedKeys.value.join(', ')}`)
}
</script>

<style scoped>
.demo-tree-enhanced {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.demo-info {
  margin-left: 16px;
  color: var(--vui-primary);
  font-weight: 500;
  font-size: 14px;
}

.is-bold {
  font-weight: 500;
}

.demo-status {
  font-size: 12px;
  color: var(--vui-text-weak);
  font-weight: normal;
  margin-left: 4px;
}

.demo-checked-list {
  padding: 8px 0;
}

.demo-empty {
  padding: 16px;
  text-align: center;
  color: var(--vui-text-weak);
}

.demo-checked-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-checked-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: rgba(47, 115, 197, 0.08);
  color: var(--vui-primary);
  border-radius: 4px;
  font-size: 13px;
}

.demo-description {
  font-size: 14px;
  line-height: 1.8;
}

.demo-description ul {
  margin: 8px 0;
  padding-left: 20px;
}

.demo-description li {
  margin-bottom: 4px;
}
</style>
