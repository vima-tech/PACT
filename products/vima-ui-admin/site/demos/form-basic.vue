<script setup lang="ts">
import { ref } from 'vue';
import { layer } from '@vima-tech/ui-admin';

const model = ref({ name: '', dept: '', online: true });
const rules = {
  name: [{ required: true, message: '请填写姓名' }],
  dept: [{ required: true, message: '请选择部门' }]
};
</script>

<template>
  <v-form :model="model" :rules="rules" label-width="88px">
    <v-form-item label="姓名" prop="name" required>
      <v-input v-model="model.name" placeholder="请输入姓名" />
    </v-form-item>
    <v-form-item label="部门" prop="dept" required>
      <v-select v-model="model.dept" placeholder="请选择">
        <v-select-option label="刑侦支队" value="1" />
        <v-select-option label="治安大队" value="2" />
      </v-select>
    </v-form-item>
    <v-form-item label="在岗">
      <v-switch v-model="model.online" />
    </v-form-item>
    <v-form-item label=" ">
      <v-button type="primary" @click="layer.msg(JSON.stringify(model), { icon: 1 })">提交</v-button>
    </v-form-item>
  </v-form>
</template>
