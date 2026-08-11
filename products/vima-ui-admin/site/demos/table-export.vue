<template>
  <div class="demo-table-export">
    <v-card title="导出功能演示">
      <v-table
        :columns="columns"
        :data-source="dataSource"
        :page="page"
        :default-toolbar="true"
        :export-all-data="allData"
        @change="handleChange"
      />
    </v-card>
    
    <v-card title="异步获取全量数据">
      <v-table
        :columns="columns"
        :data-source="dataSource"
        :page="page2"
        :default-toolbar="true"
        :fetch-all-data="fetchAllData"
        @change="handleChange2"
      />
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VTable, VCard } from '@vima-tech/ui-admin'

const ALL_COLUMNS = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 120 },
  { key: 'age', title: '年龄', width: 80 },
  { key: 'email', title: '邮箱', width: 200 },
  { key: 'address', title: '地址', width: 300 },
  { key: 'status', title: '状态', width: 100 }
]

const columns = ref([...ALL_COLUMNS])

// 模拟全量数据（通常从服务端获取）
const allData = ref([
  { id: 1, name: '张三', age: 28, email: 'zhangsan@example.com', address: '北京市朝阳区', status: '在职' },
  { id: 2, name: '李四', age: 32, email: 'lisi@example.com', address: '上海市浦东新区', status: '离职' },
  { id: 3, name: '王五', age: 25, email: 'wangwu@example.com', address: '广州市天河区', status: '在职' },
  { id: 4, name: '赵六', age: 35, email: 'zhaoliu@example.com', address: '深圳市南山区', status: '在职' },
  { id: 5, name: '钱七', age: 29, email: 'qianqi@example.com', address: '杭州市西湖区', status: '在职' },
  { id: 6, name: '孙八', age: 31, email: 'sunba@example.com', address: '成都市高新区', status: '离职' },
  { id: 7, name: '周九', age: 27, email: 'zhoujiu@example.com', address: '武汉市江汉区', status: '在职' },
  { id: 8, name: '吴十', age: 33, email: 'wushi@example.com', address: '南京市鼓楼区', status: '在职' }
])

// 当前页数据（模拟分页）
const dataSource = ref(allData.value.slice(0, 5))
const page = ref({ current: 1, limit: 5, total: allData.value.length })

const handleChange = (newPage) => {
  page.value = newPage
  const start = (newPage.current - 1) * newPage.limit
  dataSource.value = allData.value.slice(start, start + newPage.limit)
}

// 异步获取全量数据的示例
const dataSource2 = ref(allData.value.slice(0, 3))
const page2 = ref({ current: 1, limit: 3, total: allData.value.length })

const fetchAllData = async () => {
  // 模拟异步请求
  await new Promise(resolve => setTimeout(resolve, 500))
  return allData.value
}

const handleChange2 = (newPage) => {
  page2.value = newPage
  const start = (newPage.current - 1) * newPage.limit
  dataSource2.value = allData.value.slice(start, start + newPage.limit)
}
</script>

<style scoped>
.demo-table-export {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
