<script setup lang="ts">
import { ref } from 'vue';
import { layer } from '@vima-tech/ui-admin';

const open = ref(false);
const saving = ref(false);
const form = ref({ name: '' });

function save() {
  saving.value = true;
  setTimeout(() => {
    saving.value = false;
    open.value = false;
    layer.msg('已保存', { icon: 1 });
  }, 1000);
}
</script>

<template>
  <div>
    <v-button type="primary" @click="open = true">编辑</v-button>
    <v-layer v-model="open" title="编辑人员" :area="['480px', 'auto']" :loading="saving">
      <v-form :model="form" label-width="72px">
        <v-form-item label="姓名">
          <v-input v-model="form.name" placeholder="请输入姓名" />
        </v-form-item>
      </v-form>
      <template #footer>
        <v-button @click="open = false">取消</v-button>
        <v-button type="primary" @click="save">保存</v-button>
      </template>
    </v-layer>
  </div>
</template>
