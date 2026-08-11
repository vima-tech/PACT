/**
 * 模板系统几何计算的单测。
 *
 * 拖拽和缩放的手感全靠这层算法，而算错了在界面上往往只表现为「有点怪」，
 * 很难靠肉眼定位——所以这里把每条规则都钉成断言。
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_CANVAS,
  applyResizeDelta,
  clamp,
  clampGeometry,
  colWidth,
  collides,
  compactGrid,
  findCollisions,
  gridHeight,
  gridToPixel,
  pickBreakpoint,
  pixelToGridDelta,
  resolveCanvas,
  resolveGridCollisions,
  resolveGridGeometry,
  snapPosition,
  snapResize
} from '../dist/index.js';

const rect = (id, x, y, w, h, extra = {}) => ({ id, x, y, w, h, ...extra });

// ==================== 碰撞 ====================

test('相邻不算碰撞，重叠才算', () => {
  const a = rect('a', 0, 0, 6, 2);
  // 紧挨着右侧：x 从 6 开始，与 a 的右边界重合
  assert.equal(collides(a, rect('b', 6, 0, 6, 2)), false, '边挨边不该判成碰撞');
  // 紧挨着下方
  assert.equal(collides(a, rect('c', 0, 2, 6, 2)), false, '上下相接不该判成碰撞');
  // 真重叠
  assert.equal(collides(a, rect('d', 5, 1, 6, 2)), true);
  // 自己和自己不算
  assert.equal(collides(a, { ...a }), false);
});

test('findCollisions 列出全部相交项', () => {
  const items = [rect('b', 0, 0, 12, 2), rect('c', 12, 0, 12, 2), rect('d', 0, 2, 24, 2)];
  const hits = findCollisions(rect('m', 6, 1, 12, 2), items);
  assert.deepEqual(hits.map((h) => h.id).sort(), ['b', 'c', 'd']);
});

// ==================== 碰撞消解 ====================

test('被拖动的节点不动，冲突者下推', () => {
  const items = [rect('moved', 0, 0, 12, 2), rect('other', 0, 0, 12, 2)];
  const out = resolveGridCollisions(items, 'moved');
  const moved = out.find((i) => i.id === 'moved');
  const other = out.find((i) => i.id === 'other');
  assert.deepEqual({ x: moved.x, y: moved.y }, { x: 0, y: 0 }, '拖动的那个必须留在原地');
  assert.equal(other.y, 2, '被压住的要落到下沿之下');
});

test('链式推挤能收敛且最终无重叠', () => {
  const items = [
    rect('moved', 0, 0, 24, 2),
    rect('a', 0, 0, 8, 2),
    rect('b', 0, 1, 8, 2),
    rect('c', 0, 2, 8, 2)
  ];
  const out = resolveGridCollisions(items, 'moved');
  for (const one of out) {
    for (const two of out) {
      assert.equal(collides(one, two), false, `${one.id} 与 ${two.id} 仍然重叠`);
    }
  }
});

test('static 节点不被推走，其他节点绕开它', () => {
  const items = [
    rect('moved', 0, 0, 12, 2),
    rect('fixed', 0, 0, 12, 2, { static: true })
  ];
  const out = resolveGridCollisions(items, 'moved');
  assert.equal(out.find((i) => i.id === 'fixed').y, 0, 'static 不该被推动');
});

// ==================== 压实 ====================

test('compactGrid 上浮填掉空行，且不制造重叠', () => {
  const items = [rect('a', 0, 0, 12, 2), rect('b', 0, 5, 12, 2), rect('c', 12, 9, 12, 2)];
  const out = compactGrid(items);
  assert.equal(out.find((i) => i.id === 'a').y, 0);
  assert.equal(out.find((i) => i.id === 'b').y, 2, 'b 应上浮到贴着 a');
  assert.equal(out.find((i) => i.id === 'c').y, 0, 'c 在另一列，可以浮到顶');
});

test('compactGrid 不移动 static', () => {
  const out = compactGrid([rect('pin', 0, 6, 12, 2, { static: true })]);
  assert.equal(out[0].y, 6);
});

test('gridHeight 取最深的下沿', () => {
  assert.equal(gridHeight([rect('a', 0, 0, 6, 2), rect('b', 6, 3, 6, 4)]), 7);
});

// ==================== 夹取 ====================

test('clamp 只在给了边界时才夹', () => {
  assert.equal(clamp(5), 5);
  assert.equal(clamp(5, 8), 8);
  assert.equal(clamp(5, undefined, 3), 3);
});

test('clampGeometry 先夹尺寸再夹位置，贴边组件不被推出画布', () => {
  // 画布 24 格，组件贴着右缘且 minW 比当前宽度大
  const out = clampGeometry(rect('a', 20, 0, 2, 2, { minW: 8 }), { maxX: 24, maxY: 20 });
  assert.equal(out.w, 8, '尺寸是硬约束，必须先满足');
  assert.equal(out.x, 16, 'x 让步，保证右边界正好落在画布内');
});

test('clampGeometry 宽高不会小于 1', () => {
  const out = clampGeometry(rect('a', 0, 0, 0, -3));
  assert.equal(out.w, 1);
  assert.equal(out.h, 1);
});

test('clampGeometry 尊重 maxW / maxH', () => {
  const out = clampGeometry(rect('a', 0, 0, 30, 30, { maxW: 12, maxH: 6 }));
  assert.equal(out.w, 12);
  assert.equal(out.h, 6);
});

// ==================== 断点 ====================

test('pickBreakpoint 按宽度落档', () => {
  assert.equal(pickBreakpoint(1440), 'lg');
  assert.equal(pickBreakpoint(1100), 'lg');
  assert.equal(pickBreakpoint(1099), 'md');
  assert.equal(pickBreakpoint(768), 'md');
  assert.equal(pickBreakpoint(767), 'sm');
  assert.equal(pickBreakpoint(0), 'sm');
});

test('断点覆盖只盖写了的字段，其余沿用基准值', () => {
  const layout = {
    grid: { x: 0, y: 0, w: 6, h: 2, minW: 3 },
    breakpoints: { sm: { w: 24 } }
  };
  assert.deepEqual(resolveGridGeometry(layout, 'lg'), { x: 0, y: 0, w: 6, h: 2, minW: 3 });
  const sm = resolveGridGeometry(layout, 'sm');
  assert.equal(sm.w, 24, 'sm 覆盖了宽度');
  assert.equal(sm.h, 2, '没写的高度沿用基准');
  assert.equal(sm.minW, 3, '约束也沿用基准');
});

test('没有 grid 几何时返回 undefined（flow 模板不受影响）', () => {
  assert.equal(resolveGridGeometry(undefined), undefined);
  assert.equal(resolveGridGeometry({}), undefined);
});

// ==================== 像素换算 ====================

test('单格宽要先扣掉全部间距', () => {
  // 24 格、间距 12：23 条间距共 276px
  const cw = colWidth(1200, 24, 12);
  assert.equal(cw, (1200 - 276) / 24);
  // 反过来验证：24 格铺满正好等于容器宽
  assert.ok(Math.abs(cw * 24 + 12 * 23 - 1200) < 1e-9, '铺满 24 格应正好等于容器宽');
});

test('gridToPixel：n 格宽 = n 个单格 + n-1 条间距', () => {
  const canvas = resolveCanvas();
  const box = gridToPixel({ x: 0, y: 0, w: 24, h: 1 }, 1200, canvas);
  assert.ok(Math.abs(box.width - 1200) < 1e-9, '满宽组件应正好等于容器宽');
  assert.equal(box.left, 0);
  assert.equal(box.top, 0);
});

test('gridToPixel：第二格的左偏移含一条间距', () => {
  const canvas = resolveCanvas();
  const cw = colWidth(1200, canvas.cols, canvas.gap);
  const box = gridToPixel({ x: 1, y: 2, w: 6, h: 3 }, 1200, canvas);
  assert.ok(Math.abs(box.left - (cw + canvas.gap)) < 1e-9);
  assert.equal(box.top, 2 * (canvas.rowHeight + canvas.gap));
  assert.equal(box.height, 3 * canvas.rowHeight + 2 * canvas.gap);
});

test('pixelToGridDelta 四舍五入到最近一格', () => {
  const canvas = resolveCanvas();
  const step = colWidth(1200, canvas.cols, canvas.gap) + canvas.gap;
  assert.deepEqual(pixelToGridDelta(step * 2 + 1, 0, 1200, canvas), { dx: 2, dy: 0 });
  assert.deepEqual(pixelToGridDelta(step * 0.4, 0, 1200, canvas), { dx: 0, dy: 0 }, '不足半格不动');
});

// ==================== 绝对定位吸附 ====================

test('snapPosition 贴到另一个矩形的左边', () => {
  const canvas = resolveCanvas();
  const moving = rect('m', 103, 40, 100, 40);
  const out = snapPosition(moving, [rect('a', 100, 200, 100, 40)], canvas);
  assert.equal(out.x, 100, '3px 之差在阈值内，应吸到 100');
  assert.ok(out.guides.some((g) => g.axis === 'x' && g.position === 100));
});

test('snapPosition 能吸到画布中线', () => {
  const canvas = resolveCanvas();
  // 画布宽 1440，中线 720；矩形宽 100，中心贴到 720 时 x=670
  const out = snapPosition(rect('m', 668, 0, 100, 40), [], canvas);
  assert.equal(out.x, 670);
  assert.ok(out.guides.some((g) => g.source === 'canvas' && g.position === 720));
});

test('超出阈值就不吸附', () => {
  const canvas = resolveCanvas();
  const out = snapPosition(rect('m', 140, 40, 100, 40), [rect('a', 100, 200, 100, 40)], canvas);
  assert.equal(out.x, 140);
  assert.equal(out.guides.filter((g) => g.axis === 'x' && g.source === 'node').length, 0);
});

test('阈值设 0 等于关闭吸附', () => {
  const canvas = { ...resolveCanvas(), snapThreshold: 0 };
  const out = snapPosition(rect('m', 101, 40, 100, 40), [rect('a', 100, 200, 100, 40)], canvas);
  assert.deepEqual({ x: out.x, y: out.y, guides: out.guides }, { x: 101, y: 40, guides: [] });
});

// ==================== 缩放 ====================

test('applyResizeDelta：拉右边只改宽，拉左边同时改 x 与宽', () => {
  const base = { x: 100, y: 100, w: 200, h: 100 };
  assert.deepEqual(applyResizeDelta(base, 'e', 50, 0), { x: 100, y: 100, w: 250, h: 100 });
  assert.deepEqual(applyResizeDelta(base, 'w', 50, 0), { x: 150, y: 100, w: 150, h: 100 });
  assert.deepEqual(applyResizeDelta(base, 'n', 0, 20), { x: 100, y: 120, w: 200, h: 80 });
});

test('从左边缩放到最小宽度后，右边界钉死不翻转', () => {
  const canvas = resolveCanvas();
  // 右边界在 300；minW=80，所以左边最多推到 220
  const shrunk = applyResizeDelta({ x: 100, y: 100, w: 200, h: 100, minW: 80 }, 'w', 500, 0);
  const out = snapResize({ id: 'm', ...shrunk }, 'w', [], { ...canvas, snapThreshold: 0 });
  assert.equal(out.w, 80, '宽度被 minW 夹住');
  assert.equal(out.x + out.w, 300, '右边界必须钉在原处，不能翻过去');
});

test('缩放时另一条边不动（拉右边不改 x）', () => {
  const canvas = { ...resolveCanvas(), snapThreshold: 0 };
  const out = snapResize({ id: 'm', x: 100, y: 100, w: 200, h: 100 }, 'e', [], canvas);
  assert.equal(out.x, 100);
  assert.equal(out.y, 100);
});

test('缩放结果被画布边界夹住', () => {
  const canvas = { ...resolveCanvas(), snapThreshold: 0 };
  const huge = applyResizeDelta({ x: 1300, y: 100, w: 100, h: 100 }, 'e', 5000, 0);
  const out = snapResize({ id: 'm', ...huge }, 'e', [], canvas);
  assert.ok(out.x + out.w <= canvas.width, '不能超出画布右缘');
});

test('DEFAULT_CANVAS 列数与组件库栅格同源', () => {
  assert.equal(DEFAULT_CANVAS.cols, 24);
});

// ==================== 像素 → 栅格（模式互转用） ====================

test('pixelToGrid 是 gridToPixel 的逆运算', async () => {
  const { pixelToGrid } = await import('../dist/index.js');
  const canvas = resolveCanvas();
  for (const geo of [
    { x: 0, y: 0, w: 6, h: 1 },
    { x: 6, y: 2, w: 12, h: 3 },
    { x: 18, y: 5, w: 6, h: 2 }
  ]) {
    const box = gridToPixel(geo, canvas.width, canvas);
    const back = pixelToGrid({ x: box.left, y: box.top, w: box.width, h: box.height }, canvas.width, canvas);
    assert.deepEqual(
      { x: back.x, y: back.y, w: back.w, h: back.h },
      geo,
      `${JSON.stringify(geo)} 往返之后不一致`
    );
  }
});

test('pixelToGrid 宽度换算要把少掉的那条间距补回来', async () => {
  const { pixelToGrid } = await import('../dist/index.js');
  const canvas = resolveCanvas();
  const cw = colWidth(canvas.width, canvas.cols, canvas.gap);
  // 2 格宽 = 2*cw + 1*gap；若漏掉那条 gap 会被算成 1 格
  const back = pixelToGrid({ x: 0, y: 0, w: 2 * cw + canvas.gap, h: 40 }, canvas.width, canvas);
  assert.equal(back.w, 2);
});
