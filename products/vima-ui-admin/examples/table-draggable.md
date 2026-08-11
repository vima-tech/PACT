# VTable 列拖拽和字段自定义示例

## 功能说明

VTable 组件现在支持：
1. **表头列拖拽** - 直接在表头拖拽列来调整顺序
2. **字段自定义选择** - 通过 VColumnSetting 组件选择显示/隐藏列

## 基本用法

```vue
<template>
  <v-table
    :columns="columns"
    :data-source="dataSource"
    :draggable="true"
    @column-order-change="handleColumnOrderChange"
  >
    <template #toolbar>
      <v-column-setting
        v-model="columns"
        :source="ALL_COLUMNS"
        storage-key="demo-table"
      />
    </template>
  </v-table>
</template>

<script setup>
import { ref } from 'vue'
import { VTable, VColumnSetting } from '@vima-tech/ui-admin'

// 全量列定义（顺序即默认顺序）
const ALL_COLUMNS = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 120 },
  { key: 'age', title: '年龄', width: 80 },
  { key: 'email', title: '邮箱', width: 200 },
  { key: 'address', title: '地址', width: 300 },
  { key: 'status', title: '状态', width: 100, sort: true },
  { title: '操作', key: 'operator', customSlot: 'operator' }
]

// 当前生效的列（由 VColumnSetting 管理）
const columns = ref([...ALL_COLUMNS])

// 数据源
const dataSource = ref([
  { id: 1, name: '张三', age: 28, email: 'zhangsan@example.com', address: '北京市朝阳区', status: '在职' },
  { id: 2, name: '李四', age: 32, email: 'lisi@example.com', address: '上海市浦东新区', status: '离职' },
  // ...
])

// 列顺序变化回调
const handleColumnOrderChange = (newColumns, { fromIndex, toIndex }) => {
  columns.value = newColumns
  console.log(`列从位置 ${fromIndex} 移动到 ${toIndex}`)
}
</script>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `draggable` | `boolean` | `false` | 启用表头列拖拽排序 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `columnOrderChange` | `(newColumns, { fromIndex, toIndex })` | 列顺序变化时触发 |

## VColumnSetting Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `source` | `Column[]` | `[]` | 全量列定义，顺序即默认顺序 |
| `modelValue` | `Column[]` | `[]` | v-model：生效的列 |
| `storageKey` | `string` | `''` | 记忆用的键，留空不落盘 |
| `label` | `string` | `'列设置'` | 按钮文案 |
| `disabled` | `boolean` | `false` | 是否禁用 |

## 注意事项

1. **拖拽和设置面板的关系**
   - 表头拖拽会直接修改列顺序
   - VColumnSetting 面板内的拖拽也会修改列顺序
   - 两者可以同时使用，互不影响

2. **持久化**
   - VColumnSetting 的列显隐和顺序会通过 localStorage 持久化（需要设置 storageKey）
   - 表头拖拽的顺序变化不会自动持久化，需要自行处理

3. **固定列**
   - 拖拽功能不会影响固定列的判定（首列和操作列仍然会自动固定）
   - 操作列始终在最后，不可拖拽

4. **键盘支持**
   - VColumnSetting 面板内支持键盘方向键调整顺序
   - 表头拖拽暂不支持键盘操作

## 高级用例

### 禁用某些列的拖拽

```vue
<v-table
  :columns="columns"
  :data-source="dataSource"
  :draggable="true"
  @column-order-change="handleColumnOrderChange"
/>
```

### 自定义拖拽样式

```css
/* 自定义拖拽指示线颜色 */
.vui-table th.is-drag-over {
  border-color: #f5222d;
}

/* 自定义拖拽中的透明度 */
.vui-table th.is-dragging {
  opacity: 0.3;
}

/* 隐藏拖拽手柄 */
.vui-table-drag-handle {
  display: none;
}
```

### 结合排序使用

```vue
<v-table
  :columns="columns"
  :data-source="dataSource"
  :draggable="true"
  @sort-change="handleSortChange"
  @column-order-change="handleColumnOrderChange"
/>
```
