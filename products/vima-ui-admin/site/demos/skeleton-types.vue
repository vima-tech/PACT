<template>
  <v-row>
    <v-col :md="8"><v-skeleton loading type="text" :rows="4" /></v-col>
    <v-col :md="8"><v-skeleton loading type="card" :rows="3" /></v-col>
    <v-col :md="8"><v-skeleton loading type="table" :rows="3" :columns="3" /></v-col>
  </v-row>
</template>
