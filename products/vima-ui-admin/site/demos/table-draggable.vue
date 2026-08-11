<template>
  <div class="demo-table-draggable">
    <v-card title="表头列拖拽">
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
            storage-key="draggable-demo"
          />
        </template>
      </v-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VTable, VCard, VColumnSetting } from '@vima-tech/ui-admin'

const ALL_COLUMNS = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 120 },
  { key: 'age', title: '年龄', width: 80 },
  { key: 'email', title: '邮箱', width: 200 },
  { key: 'address', title: '地址', width: 300 },
  { key: 'status', title: '状态', width: 100, sort: true },
  { title: '操作', key: 'operator', customSlot: 'operator' }
]

const columns = ref([...ALL_COLUMNS])

const dataSource = ref([
  { id: 1, name: '张三', age: 28, email: 'zhangsan@example.com', address: '北京市朝阳区', status: '在职' },
  { id: 2, name: '李四', age: 32, email: 'lisi@example.com', address: '上海市浦东新区', status: '离职' },
  { id: 3, name: '王五', age: 25, email: 'wangwu@example.com', address: '广州市天河区', status: '在职' },
  { id: 4, name: '赵六', age: 35, email: 'zhaoliu@example.com', address: '深圳市南山区', status: '在职' },
])

const handleColumnOrderChange = (newColumns, { fromIndex, toIndex }) => {
  columns.value = newColumns
  console.log(`列从位置 ${fromIndex} 移动到 ${toIndex}`)
}
</script>

<style scoped>
.demo-table-draggable {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
