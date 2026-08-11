import assert from 'node:assert/strict';
import test from 'node:test';

import { AITemplateService, COMPONENT_PROPS_CONFIG, validateTemplate } from '../dist/index.js';

function template(root, extra = {}) {
  return {
    id: 'test-template',
    name: '测试模板',
    type: 'page',
    version: '1.0.0',
    root,
    ...extra
  };
}

test('静态模板在 untrusted 模式通过结构和安全校验', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'container',
    children: [{ id: 'name', type: 'input', props: { placeholder: '请输入姓名' } }]
  }));

  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});

test('模板校验返回可供 Agent 修复的结构化路径', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'missing-component'
  }));

  assert.equal(result.valid, false);
  assert.equal(result.diagnostics[0].code, 'UNKNOWN_TEMPLATE_COMPONENT');
  assert.equal(result.diagnostics[0].path, 'root.type');
  assert.ok(result.diagnostics[0].suggestion);
});

test('默认从真实 Vue 组件派生 Props、Events 和组合契约', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'container',
    children: [
      { id: 'bad-prop', type: 'input', props: { missing: true, disabled: 'yes' } },
      { id: 'bad-event', type: 'button', events: { missing: { type: 'missing', action: 'submit' } } },
      { id: 'bad-parent', type: 'descriptions-item', props: { label: '姓名', content: '张三' } }
    ]
  }));

  const codes = new Set(result.diagnostics.map((item) => item.code));
  assert.ok(codes.has('UNKNOWN_PROP'));
  assert.ok(codes.has('PROP_TYPE_MISMATCH'));
  assert.ok(codes.has('UNKNOWN_EVENT'));
  assert.ok(codes.has('INVALID_COMPONENT_PARENT'));
});

test('可视化编辑器只暴露真实组件属性', () => {
  const valueFor = (config) => config.defaultValue ?? (config.type === 'boolean' ? false : config.type === 'number' ? 1 : config.type === 'json' ? [] : 'value');
  for (const [type, configs] of Object.entries(COMPONENT_PROPS_CONFIG)) {
    for (const config of configs) {
      const node = { id: 'target', type, props: { [config.name]: valueFor(config) } };
      const root = type === 'form-item'
        ? { id: 'root', type: 'form', children: [node] }
        : type === 'col'
          ? { id: 'root', type: 'row', children: [node] }
          : type === 'descriptions-item'
            ? { id: 'root', type: 'descriptions', children: [node] }
            : node;
      const result = validateTemplate(template(root));
      const contractErrors = result.diagnostics.filter((item) => item.code === 'UNKNOWN_PROP' || item.code === 'PROP_TYPE_MISMATCH');
      assert.deepEqual(contractErrors, [], `${type}.${config.name}: ${JSON.stringify(contractErrors)}`);
    }
  }
});

test('untrusted 模板拒绝所有动态执行入口', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'container',
    condition: { __expression: true, expr: 'formData.enabled && run()' },
    events: {
      click: { type: 'click', action: 'custom', handler: 'return fetch("/secret")' }
    }
  }, {
    dataSources: [{ id: 'source', name: '函数', type: 'function', handler: 'return []' }],
    scripts: [{ id: 'script', name: '脚本', content: 'alert(1)', trigger: 'mounted' }],
    styleConfig: { customCSS: 'body { display: none }' }
  }));

  assert.equal(result.valid, false);
  const codes = new Set(result.diagnostics.map((item) => item.code));
  assert.ok(codes.has('UNSAFE_EXPRESSION'));
  assert.ok(codes.has('UNSAFE_CUSTOM_HANDLER'));
  assert.ok(codes.has('UNSAFE_FUNCTION_DATA_SOURCE'));
  assert.ok(codes.has('UNSAFE_TEMPLATE_SCRIPT'));
  assert.ok(codes.has('UNSAFE_CUSTOM_CSS'));
});

test('untrusted 路径不能访问原型链，事件只允许白名单动作', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'button',
    props: {
      content: { __expression: true, expr: 'formData.__proto__.polluted' }
    },
    events: {
      click: {
        type: 'click',
        action: 'executeAnything',
        params: { value: { __expression: true, expr: 'constructor.prototype' } }
      }
    }
  }));

  const codes = result.diagnostics.map((item) => item.code);
  assert.ok(codes.includes('UNSAFE_EXPRESSION'));
  assert.ok(codes.includes('UNKNOWN_EVENT_ACTION'));
  assert.ok(result.diagnostics.some((item) => item.path.includes('events.click.params')));
});

test('模板拒绝原型链字段与重复数据源 ID', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'form',
    children: [{
      id: 'field',
      type: 'form-item',
      props: { field: '__proto__', label: '危险字段' },
      children: [{ id: 'input', type: 'input' }]
    }]
  }, {
    dataSources: [
      { id: '__proto__', name: '危险数据', type: 'static', data: [] },
      { id: 'records', name: '数据', type: 'static', data: [] },
      { id: 'records', name: '重复数据', type: 'static', data: [] }
    ]
  }));

  assert.ok(result.diagnostics.some((item) => item.code === 'UNSAFE_DATA_KEY' && item.path.endsWith('props.field')));
  assert.ok(result.diagnostics.some((item) => item.code === 'UNSAFE_DATA_SOURCE_ID'));
  assert.ok(result.diagnostics.some((item) => item.code === 'DUPLICATE_DATA_SOURCE_ID'));
});

test('模板拒绝非法事件类型、弹窗状态字段和 API 方法', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'button',
    events: {
      click: {
        type: 'keypress',
        action: 'showModal',
        params: { field: 'constructor' }
      }
    }
  }, {
    dataSources: [{
      id: 'records',
      name: '数据',
      type: 'api',
      api: { url: '/api/records', method: 'TRACE' }
    }]
  }));

  const codes = new Set(result.diagnostics.map((item) => item.code));
  assert.ok(codes.has('UNKNOWN_EVENT_TYPE'));
  assert.ok(codes.has('UNSAFE_DATA_KEY'));
  assert.ok(codes.has('UNKNOWN_API_METHOD'));
});

test('trusted 模板允许经过项目代码审查的高级表达式', () => {
  const result = validateTemplate(template({
    id: 'root',
    type: 'container',
    condition: { __expression: true, expr: 'formData.enabled && formData.count > 0' }
  }), { trustLevel: 'trusted' });

  assert.equal(result.valid, true);
});

test('AI 模板服务不伪造生成和转换结果，并在保存前阻断危险模板', async () => {
  const saved = [];
  const storage = {
    save: async (value) => saved.push(value),
    load: async () => null,
    list: async () => [],
    delete: async () => undefined,
    export: async () => '',
    import: async () => { throw new Error('not used'); }
  };
  const service = new AITemplateService(storage);

  const unavailable = await service.handleRequest({ operation: 'generate', prompt: '用户表单' });
  assert.equal(unavailable.success, false);
  assert.equal(unavailable.code, 'AI_ENDPOINT_NOT_CONFIGURED');

  const unsafe = await service.handleRequest({
    operation: 'create',
    template: template({
      id: 'root',
      type: 'container',
      events: { click: { type: 'click', action: 'custom', handler: 'alert(1)' } }
    })
  });
  assert.equal(unsafe.success, false);
  assert.ok(unsafe.diagnostics.some((item) => item.code === 'UNSAFE_CUSTOM_HANDLER'));
  assert.equal(saved.length, 0);

  const unsupported = await service.handleRequest({ operation: 'transform', templateId: 'id', target: 'react' });
  assert.equal(unsupported.success, false);
  assert.equal(unsupported.code, 'UNSUPPORTED_OPERATION');
});
