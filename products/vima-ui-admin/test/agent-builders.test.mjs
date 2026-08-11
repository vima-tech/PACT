import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCrudPage,
  buildDashboardPage,
  buildDetailPage,
  buildFormPage,
  buildPage,
  createArtifactPlan
} from '../dist/agent/index.js';
import { validateAppSpec, validatePageSpec } from '../dist/agent/index.js';

const fields = [
  { key: 'name', label: '姓名', dataType: 'string', required: true },
  {
    key: 'status',
    label: '状态',
    dataType: 'string',
    format: 'enum',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'disabled' }
    ]
  },
  { key: 'birthday', label: '生日', dataType: 'date' }
];

test('表单 Builder 对同一结构化规格产生相同且可校验的模板', () => {
  const spec = { id: 'user-form', type: 'form', title: '用户表单', fields, submitLabel: '保存' };
  const first = buildFormPage(spec);
  const second = buildFormPage(spec);

  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  assert.equal(first.diagnostics.length, 0);
  assert.equal(first.template.root.type, 'form');
  assert.equal(first.template.root.children[0].props.required, true);
  assert.equal(first.template.root.children[1].children[0].type, 'select');
});

test('表单 Builder 保留显式声明的字段校验契约', () => {
  const result = buildFormPage({
    id: 'account-form',
    type: 'form',
    title: '账号',
    fields: [{
      key: 'username',
      label: '账号',
      dataType: 'string',
      validation: [
        { kind: 'min', value: 3, message: '账号至少 3 个字符' },
        { kind: 'max', value: 20, message: '账号最多 20 个字符' },
        { kind: 'pattern', value: '^[a-z]+$', message: '账号只能使用小写字母' }
      ]
    }]
  });

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.deepEqual(result.template.formConfig?.rules?.username, [
    { min: 3, message: '账号至少 3 个字符' },
    { max: 20, message: '账号最多 20 个字符' },
    { pattern: '^[a-z]+$', message: '账号只能使用小写字母' }
  ]);
});

test('CRUD、详情和仪表盘 Builder 覆盖系统级页面结构', () => {
  const crud = buildCrudPage({
    id: 'users',
    type: 'crud',
    title: '用户管理',
    fields,
    rowKey: 'id',
    actions: [{ key: 'create', label: '新增', kind: 'primary', icon: 'plus' }]
  });
  assert.equal(crud.ok, true);
  const crudTypes = JSON.stringify(crud.template);
  assert.match(crudTypes, /"type":"table"/);
  assert.match(crudTypes, /"type":"pagination"/);
  assert.match(crudTypes, /"type":"alert"/);
  assert.match(crudTypes, /"type":"loading"/);
  assert.match(crudTypes, /"type":"empty"/);

  const detail = buildDetailPage({ id: 'user-detail', type: 'detail', title: '用户详情', fields });
  assert.equal(detail.ok, true);
  assert.match(JSON.stringify(detail.template), /"type":"descriptions"/);

  const dashboard = buildDashboardPage({
    id: 'overview',
    type: 'dashboard',
    title: '经营概览',
    metrics: [{ key: 'users', label: '用户数', value: 128 }]
  });
  assert.equal(dashboard.ok, true);
  assert.match(JSON.stringify(dashboard.template), /"type":"statistic"/);
});

test('ArtifactPlan 生成完整、安全、可直接落盘的应用文件', () => {
  const result = createArtifactPlan({
    version: '1',
    name: '用户中心',
    shell: { title: '用户中心', navigation: [{ label: '用户管理', route: '/users', icon: 'users' }] },
    routes: [{ path: '/users', pageId: 'users' }],
    pages: [{ id: 'users', type: 'crud', title: '用户管理', fields, rowKey: 'id' }]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result, createArtifactPlan(result.spec));
  assert.deepEqual(result.plan.files.map((file) => file.path), [
    'src/App.vue',
    'src/main.ts',
    'src/pages/UsersPage.vue',
    'src/router.ts'
  ]);
  assert.ok(result.plan.files.every((file) => !file.path.includes('..')));
  assert.ok(result.plan.files.every((file) => file.content.trim().length > 0));
  assert.ok(result.plan.dependencies.some((item) => item.name === '@vima-tech/ui-admin'));
  assert.equal(result.plan.readiness, 'scaffold');
  assert.ok(result.plan.integrationRequirements.some((item) => item.id === 'users.data.list'));
  assert.ok(result.plan.verificationCommands.includes('npm run build'));
});

test('AppSpec Schema 与语义校验返回结构化路径', () => {
  const invalidPage = validatePageSpec({ id: '用户', type: 'crud', title: '用户', fields: [], rowKey: 'id' });
  assert.equal(invalidPage.valid, false);
  assert.ok(invalidPage.diagnostics.some((item) => item.code === 'APP_SPEC_PATTERN_MISMATCH'));

  const invalidApp = validateAppSpec({
    version: '1',
    name: '管理端',
    shell: { title: '管理端', navigation: [{ label: '用户', route: '/missing', icon: 'emoji-face' }] },
    pages: [{ id: 'users', type: 'crud', title: '用户', fields, rowKey: 'id' }],
    routes: [{ path: '/users', pageId: 'users' }]
  });
  assert.equal(invalidApp.valid, false);
  assert.ok(invalidApp.diagnostics.some((item) => item.code === 'UNKNOWN_NAVIGATION_ROUTE'));
  assert.ok(invalidApp.diagnostics.some((item) => item.code === 'UNKNOWN_ICON'));
});

test('PageSpec 拒绝会进入原型链的字段 key', () => {
  const result = validatePageSpec({
    id: 'unsafe-field',
    type: 'form',
    title: '危险字段',
    fields: [{ key: 'constructor', label: '保留字段', dataType: 'string' }]
  });

  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((item) => item.code === 'UNSAFE_FIELD_KEY' && item.path === 'fields[0].key'));
});

test('页面 Builder 对非法外部输入返回诊断而不是抛异常', () => {
  assert.doesNotThrow(() => buildFormPage({}));
  const result = buildFormPage({});
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.every((item) => item.code && item.path));
});

test('ArtifactPlan 对非法外部输入返回诊断而不是抛异常', () => {
  assert.doesNotThrow(() => createArtifactPlan({}));
  const result = createArtifactPlan({});
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === 'APP_SPEC_REQUIRED'));
});

test('通用页面 Builder 不把未知 type 当成仪表盘', () => {
  assert.doesNotThrow(() => buildPage({}));
  const result = buildPage({});
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.path === 'type'));
});

test('专用页面 Builders 对非法外部输入统一 fail-closed', () => {
  for (const builder of [buildCrudPage, buildDetailPage, buildDashboardPage]) {
    assert.doesNotThrow(() => builder({}));
    const result = builder({});
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.length > 0);
  }
});

test('字段校验缺少比较值时返回可修复诊断', () => {
  const result = validatePageSpec({
    id: 'invalid-validation',
    type: 'form',
    title: '非法校验',
    fields: [{
      key: 'name',
      label: '名称',
      dataType: 'string',
      validation: [{ kind: 'min', message: '至少三个字符' }]
    }]
  });

  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((item) => item.code === 'MISSING_VALIDATION_VALUE' && item.path === 'fields[0].validation[0].value'));
});

test('非法正则在生成前返回诊断', () => {
  const result = validatePageSpec({
    id: 'invalid-pattern',
    type: 'form',
    title: '非法正则',
    fields: [{
      key: 'code',
      label: '编码',
      dataType: 'string',
      validation: [{ kind: 'pattern', value: '[', message: '编码格式错误' }]
    }]
  });

  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((item) => item.code === 'INVALID_VALIDATION_PATTERN' && item.path === 'fields[0].validation[0].value'));
});

test('min/max 校验只接受有限数值', () => {
  const result = validatePageSpec({
    id: 'invalid-limit',
    type: 'form',
    title: '非法限制',
    fields: [{
      key: 'quota',
      label: '配额',
      dataType: 'number',
      validation: [{ kind: 'max', value: 'many', message: '配额过大' }]
    }]
  });

  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((item) => item.code === 'INVALID_VALIDATION_LIMIT' && item.path === 'fields[0].validation[0].value'));
});
