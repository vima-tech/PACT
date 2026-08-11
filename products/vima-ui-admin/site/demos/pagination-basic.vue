<template>
  <div class="demo-pagination">
    <v-pagination
      v-model:current="currentPage"
      :total="100"
      :page-size="10"
      layout="prev, pager, next, jumper, total"
    />
    
    <v-pagination
      v-model:current="currentPage2"
      :total="200"
      :page-size="20"
      layout="prev, pager, next, total"
      background
    />
    
    <v-pagination
      v-model:current="currentPage3"
      :total="500"
      :page-size="10"
      layout="prev, pager, next, sizes, jumper, total"
      :page-sizes="[10, 20, 50, 100]"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VPagination } from '@vima-tech/ui-admin'

const currentPage = ref(1)
const currentPage2 = ref(1)
const currentPage3 = ref(1)
</script>

<style scoped>
.demo-pagination {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
