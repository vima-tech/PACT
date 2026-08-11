/**
 * 模板编辑器状态机的单测。
 *
 * 这层管的是「连续作业」：撤销要能一次退回一个动作而不是一帧、
 * 调窄屏布局不能把宽屏改坏、粘贴出来的东西不能压在原件底下。
 * 这些都是用起来才会发现、但发现时已经丢了工作成果的问题，所以逐条钉死。
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createNode, createTemplateEditor } from '../dist/index.js';

function gridTemplate() {
  return {
    id: 't',
    name: '测试',
    type: 'page',
    version: '1.0.0',
    layoutMode: 'grid',
    root: {
      id: 'root',
      type: 'container',
      layoutMode: 'grid',
      children: [
        { id: 'a', type: 'text', props: { text: '甲' }, layout: { grid: { x: 0, y: 0, w: 6, h: 1 } } },
        { id: 'b', type: 'text', props: { text: '乙' }, layout: { grid: { x: 6, y: 0, w: 6, h: 1 } } }
      ]
    }
  };
}

const nodeById = (editor, id) => editor.template.value.root.children.find((c) => c.id === id);

// ==================== 历史 ====================

test('撤销重做能还原节点属性', () => {
  const editor = createTemplateEditor(gridTemplate());
  assert.equal(editor.canUndo.value, false, '初始没有可撤销的步骤');

  editor.updateProps('a', { text: '改过了' });
  assert.equal(nodeById(editor, 'a').props.text, '改过了');
  assert.equal(editor.canUndo.value, true);

  editor.undo();
  assert.equal(nodeById(editor, 'a').props.text, '甲', '撤销应还原');
  assert.equal(editor.canRedo.value, true);

  editor.redo();
  assert.equal(nodeById(editor, 'a').props.text, '改过了', '重做应再次应用');
});

test('transaction 把一串改动合并成一步历史', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.transaction(() => {
    // 模拟一次拖拽：连续几十次几何更新
    for (let i = 1; i <= 20; i++) editor.updateGeometry('a', { y: i });
  });
  assert.equal(nodeById(editor, 'a').layout.grid.y, 20);

  editor.undo();
  assert.equal(nodeById(editor, 'a').layout.grid.y, 0, '一次撤销要退回拖拽之前，而不是退一帧');
  assert.equal(editor.canUndo.value, false, '整段拖拽只该留一个历史点');
});

test('新改动会清空重做栈', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.updateProps('a', { text: '一' });
  editor.undo();
  assert.equal(editor.canRedo.value, true);
  editor.updateProps('a', { text: '二' });
  assert.equal(editor.canRedo.value, false, '走了新分支，旧的重做要作废');
});

test('历史栈有上限，不会无限增长', () => {
  const editor = createTemplateEditor(gridTemplate(), { historyLimit: 3 });
  for (let i = 0; i < 10; i++) editor.updateProps('a', { text: `第${i}次` });
  let steps = 0;
  while (editor.canUndo.value) {
    editor.undo();
    steps++;
    assert.ok(steps <= 5, '撤销步数不该超过上限');
  }
  assert.equal(steps, 3, '只保留最近 3 步');
});

test('撤销后失效的选中项会被清掉', () => {
  const editor = createTemplateEditor(gridTemplate());
  const fresh = createNode('text');
  editor.addNode(fresh);
  assert.deepEqual(editor.selection.value, [fresh.id]);
  editor.undo();
  assert.deepEqual(editor.selection.value, [], '节点没了，选中集不该留着幽灵 id');
});

// ==================== 选择 ====================

test('加选可以反选，普通选择是单选', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.select('a');
  assert.deepEqual(editor.selection.value, ['a']);
  editor.select('b', { additive: true });
  assert.deepEqual(editor.selection.value, ['a', 'b']);
  editor.select('a', { additive: true });
  assert.deepEqual(editor.selection.value, ['b'], '再点一次已选中的应取消');
  editor.select('a');
  assert.deepEqual(editor.selection.value, ['a'], '不带 additive 是单选');
});

test('selectAll 选中根容器的全部直接子节点', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.selectAll();
  assert.deepEqual(editor.selection.value.sort(), ['a', 'b']);
});

// ==================== 几何与断点 ====================

test('lg 断点下几何写进基准值', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.updateGeometry('a', { w: 8 });
  assert.equal(nodeById(editor, 'a').layout.grid.w, 8);
});

test('非 lg 断点下只写断点覆盖，绝不动基准值', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.breakpoint.value = 'sm';
  editor.updateGeometry('a', { w: 24 });

  const layout = nodeById(editor, 'a').layout;
  assert.equal(layout.grid.w, 6, '宽屏布局必须原封不动');
  assert.equal(layout.breakpoints.sm.w, 24, '窄屏改动落在断点覆盖里');
});

test('几何被画布列数夹住', () => {
  const editor = createTemplateEditor(gridTemplate());
  // 画布 24 列，从第 20 列起要 12 格宽，放不下
  editor.updateGeometry('a', { x: 20, w: 12 });
  const geo = nodeById(editor, 'a').layout.grid;
  assert.ok(geo.x + geo.w <= 24, `右边界超出画布：x=${geo.x} w=${geo.w}`);
});

test('尺寸约束在 resize 时生效', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.updateGeometry('a', { minW: 4, maxW: 10 });
  editor.updateGeometry('a', { w: 24 });
  assert.equal(nodeById(editor, 'a').layout.grid.w, 10, 'maxW 应夹住');
  editor.updateGeometry('a', { w: 1 });
  assert.equal(nodeById(editor, 'a').layout.grid.w, 4, 'minW 应托住');
});

test('移动造成重叠时，被压住的节点让位，被拖的不动', () => {
  const editor = createTemplateEditor(gridTemplate());
  // 把 a 拖到 b 的位置上
  editor.updateGeometry('a', { x: 6 });
  const a = nodeById(editor, 'a').layout.grid;
  const b = nodeById(editor, 'b').layout.grid;
  assert.deepEqual({ x: a.x, y: a.y }, { x: 6, y: 0 }, '拖动的那个留在落点');
  assert.equal(b.y, 1, '被压住的下移一行');
});

test('方向键微调对多选同时生效', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.selectAll();
  editor.nudgeSelected(0, 2);
  assert.equal(nodeById(editor, 'a').layout.grid.y, 2);
  assert.equal(nodeById(editor, 'b').layout.grid.y, 2);
  editor.undo();
  assert.equal(nodeById(editor, 'a').layout.grid.y, 0, '多选微调也是一步历史');
});

// ==================== 剪贴板 ====================

test('粘贴出来的节点换了新 id 并错开位置', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.select('a');
  editor.copy();
  editor.paste();

  const children = editor.template.value.root.children;
  assert.equal(children.length, 3, '应多出一个节点');
  const pasted = children[children.length - 1];
  assert.notEqual(pasted.id, 'a', 'id 必须重新生成，否则两个节点撞 id');
  assert.notDeepEqual(
    { x: pasted.layout.grid.x, y: pasted.layout.grid.y },
    { x: 0, y: 0 },
    '不能严丝合缝盖在原件上'
  );
});

test('剪切 = 复制 + 删除，且是一步历史', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.select('a');
  editor.cut();
  assert.equal(editor.template.value.root.children.length, 1);
  assert.equal(editor.hasClipboard.value, true);
  editor.paste();
  assert.equal(editor.template.value.root.children.length, 2);
});

test('剪贴板为空时粘贴什么也不做', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.paste();
  assert.equal(editor.template.value.root.children.length, 2);
  assert.equal(editor.canUndo.value, false, '空操作不该留历史');
});

// ==================== 增删 ====================

test('往 grid 画布加节点会自动补几何', () => {
  const editor = createTemplateEditor(gridTemplate());
  const fresh = createNode('input');
  editor.addNode(fresh);
  const added = nodeById(editor, fresh.id);
  assert.ok(added.layout?.grid, '必须有几何，否则它在画布上无处安放');
});

test('多选删除一次撤销全部回来', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.selectAll();
  editor.removeSelected();
  assert.equal(editor.template.value.root.children.length, 0);
  editor.undo();
  assert.equal(editor.template.value.root.children.length, 2, '一次撤销要把两个都还回来');
});

// ==================== 布局模式 ====================

test('compact 只在 grid 模式生效，且能填掉空行', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.updateGeometry('b', { x: 0, y: 8 });
  editor.compact();
  assert.equal(nodeById(editor, 'b').layout.grid.y, 1, 'b 应上浮贴住 a');
});

test('切到 absolute 模式会给节点补像素几何', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.setLayoutMode('absolute');
  assert.equal(editor.layoutMode.value, 'absolute');
  assert.ok(nodeById(editor, 'a').layout.absolute, '切过去要有 px 几何，否则整屏空白');
});

test('flow 模式下几何更新是空操作', () => {
  const template = gridTemplate();
  delete template.layoutMode;
  delete template.root.layoutMode;
  const editor = createTemplateEditor(template);
  editor.updateGeometry('a', { w: 20 });
  assert.equal(nodeById(editor, 'a').layout.grid.w, 6, 'flow 模式不该改几何');
});

test('编辑器持有的是副本，不会改到传进来的模板', () => {
  const original = gridTemplate();
  const editor = createTemplateEditor(original);
  editor.updateProps('a', { text: '改了' });
  assert.equal(original.root.children[0].props.text, '甲', '外部对象必须原封不动');
});

// ==================== 模式互转 ====================

test('切到自由模式会按原栅格布局换算，不把节点堆到一起', () => {
  const editor = createTemplateEditor(gridTemplate());
  editor.setLayoutMode('absolute');
  const a = nodeById(editor, 'a').layout.absolute;
  const b = nodeById(editor, 'b').layout.absolute;
  assert.equal(a.x, 0, 'x=0 的节点换算后应贴左缘');
  assert.ok(b.x > a.x, `b 原本在 a 右边，换算后也该在右边（a.x=${a.x} b.x=${b.x}）`);
  assert.notDeepEqual({ x: a.x, y: a.y }, { x: b.x, y: b.y }, '两个节点不能叠在同一点');
});

test('自由模式改回栅格能换算回接近原值', () => {
  const editor = createTemplateEditor(gridTemplate());
  const before = { ...nodeById(editor, 'b').layout.grid };
  editor.setLayoutMode('absolute');
  // 删掉栅格几何，强制走「从 px 反算」的路径
  editor.transaction(() => {
    for (const child of editor.template.value.root.children) delete child.layout.grid;
  });
  editor.setLayoutMode('grid');
  const after = nodeById(editor, 'b').layout.grid;
  assert.equal(after.x, before.x, 'x 应还原');
  assert.equal(after.w, before.w, '宽度应还原');
});
