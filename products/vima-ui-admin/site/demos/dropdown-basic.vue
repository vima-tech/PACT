<script setup lang="ts">
import { layer } from '@vima-tech/ui-admin';
</script>

<template>
  <v-dropdown>
    <v-button>更多操作</v-button>
    <template #content>
      <v-dropdown-menu>
        <v-dropdown-menu-item @click="layer.msg('导出 Excel')">导出 Excel</v-dropdown-menu-item>
        <v-dropdown-menu-item @click="layer.msg('打印')">打印</v-dropdown-menu-item>
        <v-dropdown-menu-item disabled>归档（禁用）</v-dropdown-menu-item>
      </v-dropdown-menu>
    </template>
  </v-dropdown>
</template>
