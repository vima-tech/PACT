<script setup lang="ts">
import { ref } from 'vue';

const rows = [
  { id: 1, name: '张三', dept: '刑侦支队', status: '在岗', score: 92 },
  { id: 2, name: '李四', dept: '治安大队', status: '休假', score: 78 },
  { id: 3, name: '王五', dept: '交警一中队', status: '在岗', score: 85 }
];
const columns = [
  { title: '姓名', key: 'name', width: 120 },
  { title: '所属部门', key: 'dept' },
  { title: '考核分', key: 'score', width: 100 }
];
const selected = ref<unknown[]>([1]);
/** 分页对象由表格就地改写 current / limit，并同时抛 change 事件 */
const page = ref({ current: 1, limit: 10, total: 3 });
</script>

<template>
  <div>
    <v-table
      id="id"
      v-model:selected-keys="selected"
      :columns="columns"
      :data-source="rows"
      :page="page"
      show-checkbox
    />
    <p class="hint">已选 id：{{ selected.join('、') || '（空）' }}</p>
  </div>
</template>

<style scoped>
.hint {
  margin: 10px 0 0;
  color: var(--vui-text-weak);
  font-size: 12px;
}
</style>
