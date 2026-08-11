<script setup lang="ts">
import { ref } from 'vue';

const picked = ref<string[]>([]);

/** 组件本身不发请求：拿到 FileList 后要不要传、怎么传，由这里决定 */
function onPick(files: FileList | File[]) {
  picked.value = Array.from(files).map((file) => `${file.name}（${Math.ceil(file.size / 1024)} KB）`);
  return false;
}
</script>

<template>
  <div>
    <v-upload accept=".png,.jpg,.pdf" multiple :before-upload="onPick">选择文件</v-upload>
    <ul class="picked">
      <li v-for="name in picked" :key="name">{{ name }}</li>
      <li v-if="!picked.length" class="muted">尚未选择文件</li>
    </ul>
  </div>
</template>

<style scoped>
.picked {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--vui-text-sub);
  font-size: 13px;
}

.muted {
  color: var(--vui-text-faint);
  list-style: none;
  margin-left: -18px;
}
</style>
