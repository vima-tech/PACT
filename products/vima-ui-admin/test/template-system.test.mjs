import assert from 'node:assert/strict';
import test from 'node:test';
import { createRenderer, h, nextTick, reactive, ref } from 'vue';

import {
  LocalTemplateStorage,
  TemplateRenderer,
  VButton,
  VCheckboxGroup,
  VDescriptions,
  VForm,
  VFormItem,
  VInput,
  VTimePicker,
  cloneNode,
  components,
  createEmptyTemplate,
  createNode,
  exportTemplate,
  findNode,
  getIconNames,
  hasIcon,
  iconSvgMarkup,
  importTemplate,
  normalizeIconName,
  registerIcon
} from '../dist/index.js';

function createMemoryRenderer() {
  const insert = (child, parent, anchor) => {
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index === -1) parent.children.push(child);
    else parent.children.splice(index, 0, child);
  };
  return createRenderer({
    patchProp: (element, key, _previous, value) => { element.props[key] = value; },
    insert,
    remove: (child) => {
      const index = child.parent?.children.indexOf(child) ?? -1;
      if (index >= 0) child.parent.children.splice(index, 1);
    },
    createElement: (type) => ({ type, props: {}, children: [], parent: null }),
    createText: (text) => ({ type: '#text', text, parent: null }),
    createComment: (text) => ({ type: '#comment', text, parent: null }),
    setText: (node, text) => { node.text = text; },
    setElementText: (element, text) => { element.children = [{ type: '#text', text, parent: element }]; },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
      const siblings = node.parent?.children || [];
      return siblings[siblings.indexOf(node) + 1] || null;
    },
    setScopeId: () => {},
    cloneNode: (node) => ({ ...node, props: { ...node.props }, children: [...node.children] }),
    insertStaticContent: (content, parent, anchor) => {
      const node = { type: '#static', text: content, parent: null };
      insert(node, parent, anchor);
      return [node, node];
    }
  });
}

function findHostNode(node, type) {
  if (node.type === type) return node;
  for (const child of node.children || []) {
    const found = findHostNode(child, type);
    if (found) return found;
  }
  return null;
}

function findHostNodeByClass(node, className) {
  const value = node.props?.class;
  const names = Array.isArray(value) ? value.flat(Infinity) : String(value || '').split(/\s+/);
  if (names.includes(className)) return node;
  for (const child of node.children || []) {
    const found = findHostNodeByClass(child, className);
    if (found) return found;
  }
  return null;
}

class MemoryStorage {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null;
  }

  setItem(key, value) {
    this[key] = String(value);
  }

  removeItem(key) {
    delete this[key];
  }

  clear() {
    Object.keys(this).forEach((key) => delete this[key]);
  }
}

test('模板节点具有唯一 ID、默认属性和可再生的副本 ID', () => {
  const form = createEmptyTemplate('form', '用户表单');
  const first = createNode('form-item', { label: '姓名', field: 'name' });
  const second = cloneNode(first, true);

  assert.ok(form.id);
  assert.equal(form.root.meta.icon, 'form');
  assert.ok(first.id);
  assert.equal(first.children.length, 1);
  assert.equal(first.children[0].type, 'input');
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.children[0].id, second.children[0].id);
});

test('节点查找覆盖普通子节点和具名插槽', () => {
  const slotted = createNode('button');
  const root = createNode('card');
  root.slots = { extra: [slotted] };

  assert.equal(findNode(root, slotted.id), slotted);
});

test('模板 JSON 导入会校验结构并保持可往返', () => {
  const template = createEmptyTemplate('custom', '自定义页');
  assert.equal(exportTemplate(importTemplate(exportTemplate(template))), exportTemplate(template));
  assert.throws(() => importTemplate('{"name":"缺少根节点"}'), /无效的模板格式/);
});

test('本地存储支持保存、筛选、排序、导入和清理', async () => {
  globalThis.localStorage = new MemoryStorage();
  const storage = new LocalTemplateStorage('test-template:');
  const first = createEmptyTemplate('form', '客户登记');
  first.tags = ['客户'];
  const second = createEmptyTemplate('card', '数据概览');
  second.tags = ['报表'];

  await storage.save(first);
  await storage.save(second);
  assert.equal((await storage.load(first.id)).name, '客户登记');
  assert.deepEqual((await storage.list({ keyword: '客户' })).map((item) => item.id), [first.id]);
  assert.deepEqual((await storage.list({ type: 'card' })).map((item) => item.id), [second.id]);

  const imported = await storage.import(exportTemplate(first));
  assert.notEqual(imported.id, first.id);
  assert.equal((await storage.list({ pageSize: 10 })).length, 3);
  assert.ok(storage.getSize() > 0);

  await storage.clear();
  assert.equal((await storage.list()).length, 0);
});

test('模板渲染器把表单字段绑定到实际输入控件', async () => {
  const template = createEmptyTemplate('form', '编辑用户');
  template.root.children.push(createNode('form-item', { label: '姓名', field: 'name' }));
  let emittedModel = { name: '张三' };
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(TemplateRenderer, {
      template,
      modelValue: emittedModel,
      'onUpdate:modelValue': (value) => { emittedModel = value; }
    })
  });

  app.mount(root);
  const input = findHostNode(root, 'input');
  assert.ok(input);
  assert.equal(input.props.value, '张三');

  input.props.onInput({ target: { value: '李四' } });
  await nextTick();
  assert.equal(emittedModel.name, '李四');
  app.unmount();
});

test('SVG 图标由注册表统一管理并兼容旧名称', () => {
  assert.ok(getIconNames().length >= 80);
  assert.equal(normalizeIconName('layui-icon-home'), 'home');
  assert.equal(normalizeIconName('username'), 'user');
  assert.ok(hasIcon('search'));
  assert.ok(hasIcon('shield-check'));
  assert.ok(hasIcon('users'));
  assert.match(iconSvgMarkup('search'), /^<svg/);
  assert.match(iconSvgMarkup('search'), /<path/);

  registerIcon('brand-mark', ['M4 4h16v16H4z']);
  assert.ok(getIconNames().includes('brand-mark'));
  assert.ok(hasIcon('brand-mark'));
});

test('组件清单名称唯一且包含模板 DSL 补齐组件', () => {
  const names = components.map((component) => component.name);
  assert.equal(new Set(names).size, names.length);
  for (const name of ['VCheckbox', 'VCheckboxGroup', 'VTimePicker', 'VLink']) {
    assert.ok(names.includes(name), `${name} 未注册到组件清单`);
  }
});

test('按钮加载态、描述列表边框开关与时间选择器兑现公开属性', () => {
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h('div', null, [
      h(VButton, { loading: true }, () => '提交'),
      h(VDescriptions, { border: false }),
      h(VTimePicker, { modelValue: '09:30' })
    ])
  });

  app.mount(root);
  const button = findHostNode(root, 'button');
  assert.equal(button.props.disabled, true);
  assert.ok(findHostNodeByClass(root, 'vui-button-spinner'));
  const descriptions = findHostNodeByClass(root, 'vui-descriptions');
  assert.ok(!String(descriptions.props.class).includes('is-bordered'));
  const timeInput = findHostNode(root, 'input');
  assert.equal(timeInput.props.value, '09:30');
  app.unmount();
});

test('复选框 options 快捷配置会更新数组模型', async () => {
  let selected = ['read'];
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(VCheckboxGroup, {
      modelValue: selected,
      options: [
        { label: '查看', value: 'read' },
        { label: '编辑', value: 'write' }
      ],
      'onUpdate:modelValue': (value) => { selected = value; }
    })
  });

  app.mount(root);
  const inputs = [];
  const collect = (node) => {
    if (node.type === 'input') inputs.push(node);
    (node.children || []).forEach(collect);
  };
  collect(root);
  assert.equal(inputs.length, 2);
  inputs[1].props.onChange({ target: { checked: true } });
  await nextTick();
  assert.deepEqual(selected, ['read', 'write']);
  app.unmount();
});

test('表单 resetFields 恢复初值，模板 validate 调用真实表单校验', async () => {
  const model = reactive({ name: '初始值' });
  const formRef = ref();
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(VForm, { ref: formRef, model }, {
      default: () => h(VFormItem, { prop: 'name' }, () => h(VInput, {
        modelValue: model.name,
        'onUpdate:modelValue': (value) => { model.name = value; }
      }))
    })
  });

  app.mount(root);
  model.name = '修改值';
  model.extra = '临时值';
  formRef.value.resetFields();
  assert.deepEqual({ ...model }, { name: '初始值' });
  app.unmount();

  const template = createEmptyTemplate('form', '校验表单');
  template.root.children.push(createNode('form-item', { label: '姓名', field: 'name' }));
  template.formConfig = { rules: { name: [{ required: true, message: '请输入姓名' }] } };
  const rendererRef = ref();
  const validationRoot = { type: 'root', props: {}, children: [] };
  const validationApp = renderer.createApp({
    setup: () => () => h(TemplateRenderer, { ref: rendererRef, template })
  });
  validationApp.mount(validationRoot);
  await nextTick();
  await assert.rejects(() => rendererRef.value.validate(), /请输入姓名/);
  validationApp.unmount();
});

test('表单执行 Builder 可序列化的 min 校验规则', async () => {
  const model = reactive({ username: 'ab' });
  const formRef = ref();
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(VForm, {
      ref: formRef,
      model,
      rules: { username: [{ min: 3, message: '账号至少 3 个字符' }] }
    }, {
      default: () => h(VFormItem, { prop: 'username', label: '账号' }, () => h(VInput, {
        modelValue: model.username,
        'onUpdate:modelValue': (value) => { model.username = value; }
      }))
    })
  });

  app.mount(root);
  await assert.rejects(() => formRef.value.validate(), /账号至少 3 个字符/);
  model.username = 'alice';
  await assert.doesNotReject(() => formRef.value.validate());
  app.unmount();
});

test('表单执行 Builder 可序列化的 max 校验规则', async () => {
  const model = reactive({ quota: 11 });
  const formRef = ref();
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(VForm, {
      ref: formRef,
      model,
      rules: { quota: [{ max: 10, message: '配额不能超过 10' }] }
    }, {
      default: () => h(VFormItem, { prop: 'quota', label: '配额' }, () => h('span'))
    })
  });

  app.mount(root);
  await assert.rejects(() => formRef.value.validate(), /配额不能超过 10/);
  model.quota = 10;
  await assert.doesNotReject(() => formRef.value.validate());
  app.unmount();
});

test('表单执行 Builder 可序列化的 pattern 校验规则', async () => {
  const model = reactive({ code: 'A-1' });
  const formRef = ref();
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(VForm, {
      ref: formRef,
      model,
      rules: { code: [{ pattern: '^[a-z]+$', message: '编码只能使用小写字母' }] }
    }, {
      default: () => h(VFormItem, { prop: 'code', label: '编码' }, () => h('span'))
    })
  });

  app.mount(root);
  await assert.rejects(() => formRef.value.validate(), /编码只能使用小写字母/);
  model.code = 'abc';
  await assert.doesNotReject(() => formRef.value.validate());
  app.unmount();
});

test('模板静态数据源可按需加载并暴露结果', async () => {
  const template = createEmptyTemplate('custom', '数据模板');
  template.dataSources = [{ id: 'status', name: '状态', type: 'static', data: [{ label: '启用', value: 1 }] }];
  const rendererRef = ref();
  const root = { type: 'root', props: {}, children: [] };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(TemplateRenderer, { ref: rendererRef, template })
  });

  app.mount(root);
  const result = await rendererRef.value.loadData('status');
  assert.deepEqual(result, [{ label: '启用', value: 1 }]);
  assert.deepEqual(rendererRef.value.dataSources.status, result);
  app.unmount();
});

// ==================== 布局几何渲染 ====================

/** 挂一个模板，返回宿主根节点，测完自己卸载 */
function mountTemplate(template) {
  const root = { type: 'root', props: {}, children: [], parent: null };
  const renderer = createMemoryRenderer();
  const app = renderer.createApp({
    setup: () => () => h(TemplateRenderer, { template })
  });
  app.mount(root);
  return { root, app };
}

const gridTemplate = (extra = {}) => ({
  id: 'geo',
  name: '几何',
  type: 'page',
  version: '1.0.0',
  layoutMode: 'grid',
  root: {
    id: 'root',
    type: 'container',
    children: [
      {
        id: 'a',
        type: 'text',
        props: { text: '甲' },
        layout: { grid: { x: 0, y: 0, w: 6, h: 2 }, ...extra }
      }
    ]
  }
});

test('flow 模式不产生任何几何包裹层（旧模板向后兼容）', () => {
  const template = gridTemplate();
  delete template.layoutMode;
  const { root, app } = mountTemplate(template);
  assert.equal(findHostNodeByClass(root, 'vui-tpl-grid'), null, '不该出现栅格容器');
  assert.equal(findHostNodeByClass(root, 'vui-tpl-cell'), null, '不该出现单元格包裹');
  app.unmount();
});

test('grid 模式：容器挂栅格类名并写入列数/行高变量', () => {
  const { root, app } = mountTemplate(gridTemplate());
  const container = findHostNodeByClass(root, 'vui-tpl-grid');
  assert.ok(container, '容器应挂 .vui-tpl-grid');
  assert.equal(container.props.style['--vui-tpl-cols'], '24');
  assert.equal(container.props.style['--vui-tpl-row-height'], '40px');
  app.unmount();
});

test('grid 模式：单元格把 x/y/w/h 写成 grid-area 变量', () => {
  const { root, app } = mountTemplate(gridTemplate());
  const cell = findHostNodeByClass(root, 'vui-tpl-cell');
  assert.ok(cell);
  // x=0 → 第 1 列起，占 6 格；y=0 → 第 1 行起，占 2 行
  assert.equal(cell.props.style['--vui-tpl-col-lg'], '1 / span 6');
  assert.equal(cell.props.style['--vui-tpl-row-lg'], '1 / span 2');
  assert.equal(cell.props['data-node-id'], 'a');
  app.unmount();
});

test('grid 模式：没写断点覆盖时三档几何相同', () => {
  const { root, app } = mountTemplate(gridTemplate());
  const cell = findHostNodeByClass(root, 'vui-tpl-cell');
  assert.equal(cell.props.style['--vui-tpl-col-sm'], cell.props.style['--vui-tpl-col-lg']);
  app.unmount();
});

test('grid 模式：断点覆盖只改被覆盖的那一档', () => {
  const { root, app } = mountTemplate(gridTemplate({ breakpoints: { sm: { w: 24 } } }));
  const cell = findHostNodeByClass(root, 'vui-tpl-cell');
  assert.equal(cell.props.style['--vui-tpl-col-lg'], '1 / span 6', 'lg 不受影响');
  assert.equal(cell.props.style['--vui-tpl-col-sm'], '1 / span 24', 'sm 变成整行');
  assert.equal(cell.props.style['--vui-tpl-row-sm'], '1 / span 2', '没覆盖的高度沿用基准');
  app.unmount();
});

test('grid 模式：没有几何的子节点退回整行（is-auto）', () => {
  const template = gridTemplate();
  delete template.root.children[0].layout;
  const { root, app } = mountTemplate(template);
  const cell = findHostNodeByClass(root, 'vui-tpl-cell');
  assert.ok(cell, '仍然要有包裹层');
  // Vue 在 createVNode 阶段就把 class 数组规范化成字符串了，两种形态都要认
  const raw = cell.props.class;
  const names = Array.isArray(raw) ? raw.flat(Infinity) : String(raw || '').split(/\s+/);
  assert.ok(names.includes('is-auto'), '没有几何就退回整行');
  app.unmount();
});

test('absolute 模式：输出像素定位与尺寸约束', () => {
  const template = gridTemplate();
  template.layoutMode = 'absolute';
  template.root.children[0].layout = {
    absolute: { x: 24, y: 16, w: 320, h: 38, minW: 200, maxH: 80 }
  };
  const { root, app } = mountTemplate(template);
  const canvas = findHostNodeByClass(root, 'vui-tpl-canvas');
  assert.ok(canvas, '容器应挂 .vui-tpl-canvas');
  assert.equal(canvas.props.style['--vui-tpl-canvas-width'], '1440px');

  const box = findHostNodeByClass(root, 'vui-tpl-abs');
  assert.ok(box);
  assert.equal(box.props.style.left, '24px');
  assert.equal(box.props.style.top, '16px');
  assert.equal(box.props.style.width, '320px');
  assert.equal(box.props.style.height, '38px');
  assert.equal(box.props.style.minWidth, '200px', 'absolute 下 min/max 是真的 CSS 兜底');
  assert.equal(box.props.style.maxHeight, '80px');
  assert.equal(box.props.style.maxWidth, undefined, '没写的约束不该凭空出现');
  app.unmount();
});

test('节点级 layoutMode 可以在流式模板里嵌一块画布', () => {
  const template = {
    id: 'nest',
    name: '嵌套',
    type: 'page',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'container',
      children: [
        {
          id: 'board',
          type: 'card',
          layoutMode: 'grid',
          children: [
            { id: 'x', type: 'text', props: { text: '格' }, layout: { grid: { x: 2, y: 1, w: 4, h: 1 } } }
          ]
        }
      ]
    }
  };
  const { root, app } = mountTemplate(template);
  assert.ok(findHostNodeByClass(root, 'vui-tpl-grid'), '内层卡片应变成栅格容器');
  const cell = findHostNodeByClass(root, 'vui-tpl-cell');
  assert.equal(cell.props.style['--vui-tpl-col-lg'], '3 / span 4', 'x=2 → 第 3 列起');
  app.unmount();
});
