<!--
  组件总览 —— 一页放下全部组件。

  它的第一身份是**验收工装**而不是文档：提取脚本重跑、令牌改动、上游同步之后，
  截这一页与 juvenile-guard 管理端并排比对，一眼能看出有没有提坏。
  逐个组件的用法请看左侧各组件页。
-->
<script setup lang="ts">
import { ref } from 'vue';
import { layer } from '@vima-tech/ui-admin';

const form = ref({ name: '张三', dept: '2', age: 18, date: '', tags: ['重点'], online: true, level: 'a' });
const keyword = ref('');
const activeTab = ref('base');
const rows = [
  { id: 1, name: '张三', dept: '刑侦支队', status: '在岗', score: 92 },
  { id: 2, name: '李四', dept: '治安大队', status: '休假', score: 78 },
  { id: 3, name: '王五', dept: '交警一中队', status: '在岗', score: 85 }
];
/** 全量列定义（真源，顺序即默认顺序），交给 VColumnSetting 托管 */
const ALL_COLUMNS = [
  { title: '姓名', key: 'name', width: 120 },
  { title: '所属部门', key: 'dept' },
  { title: '状态', key: 'status', width: 100 },
  { title: '考核分', key: 'score', width: 100 },
  { title: '操作', key: 'operator', width: 160, customSlot: 'operator' }
];
/** 生效列：由 VColumnSetting 写回，页面只管喂给表格 */
const columns = ref([...ALL_COLUMNS]);
const selected = ref<unknown[]>([]);
const tableLoading = ref(false);
const firstLoad = ref(false);
const fullscreen = ref(false);

function refresh() {
  tableLoading.value = true;
  setTimeout(() => (tableLoading.value = false), 1500);
}
function reload() {
  firstLoad.value = true;
  setTimeout(() => (firstLoad.value = false), 1800);
}
function blockAll() {
  fullscreen.value = true;
  setTimeout(() => (fullscreen.value = false), 1200);
}
const tree = [
  { id: 1, title: '市局', children: [{ id: 11, title: '刑侦支队' }, { id: 12, title: '治安大队' }] },
  { id: 2, title: '分局', children: [{ id: 21, title: '城关派出所' }] }
];
const layerOpen = ref(false);
</script>

<template>
  <v-container>
    <h1 class="overview-title">组件总览</h1>
    <p class="overview-lead">
      一页放下全部组件，用于提取后的整体比对；逐个组件的说明与 API 看左侧导航。
    </p>

    <v-card title="按钮 / 标签 / 图标 / 进度">
      <v-button type="primary">主要</v-button>
      <v-button type="normal">常规</v-button>
      <v-button type="warm">警示</v-button>
      <v-button type="danger">危险</v-button>
      <v-button>默认</v-button>
      <v-button size="sm">小号</v-button>
      <v-button disabled>禁用</v-button>
      <v-button type="text">文字按钮</v-button>
      <v-divider content="分割线" />
      <v-tag>默认标签</v-tag>
      <v-tag type="success">成功</v-tag>
      <v-tag type="danger">危险</v-tag>
      <v-icon type="home" />
      <v-icon type="search" />
      <v-icon type="layui-icon-refresh" />
      <v-progress :percent="62" />
    </v-card>

    <v-card title="表单">
      <v-form :model="form" label-width="96px">
        <v-row>
          <v-col :md="8">
            <v-form-item label="姓名" prop="name"><v-input v-model="form.name" placeholder="请输入姓名" /></v-form-item>
          </v-col>
          <v-col :md="8">
            <v-form-item label="部门" prop="dept">
              <v-select v-model="form.dept" placeholder="请选择">
                <v-select-option label="刑侦支队" value="1" />
                <v-select-option label="治安大队" value="2" />
              </v-select>
            </v-form-item>
          </v-col>
          <v-col :md="8">
            <v-form-item label="年龄" prop="age"><v-input-number v-model="form.age" :min="0" :max="99" /></v-form-item>
          </v-col>
          <v-col :md="8">
            <v-form-item label="日期" prop="date"><v-date-picker v-model="form.date" placeholder="选择日期" /></v-form-item>
          </v-col>
          <v-col :md="8">
            <v-form-item label="标签" prop="tags"><v-tag-input v-model="form.tags" /></v-form-item>
          </v-col>
          <v-col :md="8">
            <v-form-item label="在岗" prop="online"><v-switch v-model="form.online" /></v-form-item>
          </v-col>
          <v-col :md="16">
            <v-form-item label="等级" prop="level">
              <v-radio-group v-model="form.level">
                <v-radio value="a">甲</v-radio>
                <v-radio value="b">乙</v-radio>
              </v-radio-group>
            </v-form-item>
          </v-col>
          <v-col :md="24">
            <v-form-item label="备注"><v-textarea placeholder="请输入备注" /></v-form-item>
          </v-col>
        </v-row>
      </v-form>
    </v-card>

    <v-card title="表格 · 列设置 / 加载态">
      <v-input v-model="keyword" placeholder="检索…" style="max-width: 240px" />
      <v-button size="sm" @click="refresh">局部刷新（VLoading）</v-button>
      <v-button size="sm" @click="reload">首屏加载（VSkeleton）</v-button>
      <v-button size="sm" @click="blockAll">全屏遮罩</v-button>
      <v-loading :loading="fullscreen" fullscreen text="正在提交" />
      <v-skeleton :loading="firstLoad" type="table" :rows="3" :columns="5">
      <v-table
        v-model:selected-keys="selected"
        :columns="columns"
        :data-source="rows"
        :loading="tableLoading"
        id="id"
        show-checkbox
        default-toolbar
        :page="{ total: 3, current: 1, limit: 10 }"
      >
        <template #toolbar>
          <v-column-setting v-model="columns" :source="ALL_COLUMNS" storage-key="overview-demo" />
        </template>

        <template #operator>
          <v-button size="sm">编辑</v-button>
          <v-button size="sm" type="danger">删除</v-button>
        </template>
      </v-table>
      </v-skeleton>
    </v-card>

    <v-card title="加载态 · 三种形态">
      <v-row>
        <v-col :md="8">
          <v-loading loading text="正在加载">
            <v-descriptions title="遮罩：内容还在，只是被罩住" :column="1" label-width="72px">
              <v-descriptions-item label="姓名">张三</v-descriptions-item>
              <v-descriptions-item label="部门">刑侦支队</v-descriptions-item>
            </v-descriptions>
          </v-loading>
        </v-col>
        <v-col :md="8"><v-skeleton loading type="text" :rows="4" /></v-col>
        <v-col :md="8"><v-skeleton loading type="card" :rows="3" /></v-col>
      </v-row>
    </v-card>

    <v-card title="数据展示">
      <v-tab v-model="activeTab">
        <v-tab-item id="base" title="基本信息">
          <v-descriptions title="档案" :column="3" label-width="88px">
            <v-descriptions-item label="姓名">张三</v-descriptions-item>
            <v-descriptions-item label="警号">061203</v-descriptions-item>
            <v-descriptions-item label="部门">刑侦支队</v-descriptions-item>
          </v-descriptions>
        </v-tab-item>
        <v-tab-item id="org" title="组织树">
          <v-tree :data="tree" />
        </v-tab-item>
      </v-tab>
      <v-collapse>
        <v-collapse-item title="折叠面板一">内容一</v-collapse-item>
        <v-collapse-item title="折叠面板二">内容二</v-collapse-item>
      </v-collapse>
    </v-card>

    <v-card title="浮层">
      <v-dropdown>
        <v-button>下拉菜单</v-button>
        <template #content>
          <v-dropdown-menu>
            <v-dropdown-menu-item>导出 Excel</v-dropdown-menu-item>
            <v-dropdown-menu-item>打印</v-dropdown-menu-item>
          </v-dropdown-menu>
        </template>
      </v-dropdown>
      <v-button type="primary" @click="layerOpen = true">打开弹窗</v-button>
      <v-button @click="layer.msg('已保存', { icon: 1 })">消息</v-button>
      <v-button @click="layer.notify({ title: '通知', content: '有 3 条待办' })">通知</v-button>
      <v-button @click="layer.confirm('确定删除这条记录吗？')">确认框</v-button>
      <v-layer v-model="layerOpen" title="编辑档案" :area="['520px', 'auto']">
        <div style="padding: 4px 0">弹窗内容</div>
      </v-layer>
    </v-card>
  </v-container>
</template>

<style scoped>
.overview-title {
  margin: 0 0 6px;
  color: var(--vui-text-title);
  font-size: 26px;
}

.overview-lead {
  margin: 0 0 18px;
  color: var(--vui-text-sub);
  font-size: 14px;
  line-height: 1.9;
}
</style>
