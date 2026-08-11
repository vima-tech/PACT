/**
 * @vima-tech/ui-admin · 模板系统几何计算
 *
 * 创建日期: 2026-08-11
 *
 * 这里全是纯函数：输入矩形、输出矩形，不碰 DOM、不碰 Vue、不读全局状态。
 * 拖拽和缩放的手感好不好，九成取决于这些函数算得对不对，
 * 所以它们必须能被单测钉死（见 test/template-geometry.test.mjs）。
 *
 * 两套坐标系共用同一个 Geometry 结构，区别只在单位：
 *   grid     —— x/y/w/h 的单位是「格」与「行」，都是整数
 *   absolute —— 单位是 px，可以是小数（吸附后会取整）
 *
 * 关于「要不要自动压实」：不做。
 * 向上压实会把用户亲手放的 y 改掉，与「定位更精准」这个诉求直接冲突。
 * 落点重叠时只把被压住的节点下推，保证不重叠；想要紧凑排列由编辑器显式调
 * compactGrid()，那是一次用户主动的操作，不是拖拽的副作用。
 */
import type { BreakpointKey, CanvasConfig, Geometry, NodeLayout } from './types'

// ==================== 常量 ====================

/** 画布默认值。列数取 24，与组件库栅格同源 */
export const DEFAULT_CANVAS: Required<CanvasConfig> = {
  cols: 24,
  /* 行高 40 是照着控件高度定的：--vui-control-height 是 38px，
     行高再低一档（比如 32）会让「占 1 行」的输入框被压扁。 */
  rowHeight: 40,
  gap: 12,
  width: 1440,
  height: 900,
  snapThreshold: 6
}

/**
 * 断点下界（px）。与 styles/ui.css 里那条 1100px 栅格塌行断点同源，
 * 改这里就要同步改那边，否则编辑器预览与真实渲染会对不上。
 */
export const BREAKPOINT_MIN_WIDTH: Record<BreakpointKey, number> = {
  lg: 1100,
  md: 768,
  sm: 0
}

/** 断点从宽到窄，遍历时第一个满足的就是当前断点 */
export const BREAKPOINTS_DESC: BreakpointKey[] = ['lg', 'md', 'sm']

// ==================== 基础工具 ====================

/** 合并画布配置与默认值 */
export function resolveCanvas(canvas?: CanvasConfig): Required<CanvasConfig> {
  return { ...DEFAULT_CANVAS, ...canvas }
}

/** 容器宽度落在哪个断点 */
export function pickBreakpoint(width: number): BreakpointKey {
  return BREAKPOINTS_DESC.find((key) => width >= BREAKPOINT_MIN_WIDTH[key]) || 'sm'
}

/**
 * 取某个断点下的实际几何。
 *
 * 基准值（layout.grid）相当于 lg；断点覆盖只覆盖写了的字段，
 * 因此「窄屏只想把宽度改成 24 格、其余不动」写 `{ sm: { w: 24 } }` 就够。
 */
export function resolveGridGeometry(layout: NodeLayout | undefined, bp: BreakpointKey = 'lg'): Geometry | undefined {
  const base = layout?.grid
  if (!base) return undefined
  if (bp === 'lg') return { ...base }
  const override = layout?.breakpoints?.[bp]
  return override ? { ...base, ...override } : { ...base }
}

/** 把值夹在 [min, max] 内。min/max 缺省时该侧不设限 */
export function clamp(value: number, min?: number, max?: number): number {
  let out = value
  if (typeof min === 'number') out = Math.max(out, min)
  if (typeof max === 'number') out = Math.min(out, max)
  return out
}

/**
 * 把几何夹进约束与画布边界。
 *
 * 顺序有讲究：先夹尺寸再夹位置。反过来的话，一个贴着右边缘、
 * 又被 minW 撑大的组件会被推出画布——尺寸是硬约束，位置得让步。
 */
export function clampGeometry(
  geo: Geometry,
  bounds?: { maxX?: number; maxY?: number }
): Geometry {
  let w = Math.max(1, clamp(geo.w, geo.minW, geo.maxW))
  let h = Math.max(1, clamp(geo.h, geo.minH, geo.maxH))

  /*
   * 边界不仅要能挪位置，还要能收尺寸。
   * 只挪 x 的话，一个被拖到 5000px 宽的组件挪到 x=0 依然戳出画布——
   * 必须先把尺寸收进画布，位置才有解（w ≤ maxX ⟹ maxX - w ≥ 0 ⟹ x + w ≤ maxX）。
   * minW/minH 是硬约束，比画布优先：真填不下时宁可溢出，也不要悄悄违反组件的最小尺寸。
   */
  if (typeof bounds?.maxX === 'number') w = Math.max(geo.minW ?? 1, Math.min(w, bounds.maxX))
  if (typeof bounds?.maxY === 'number') h = Math.max(geo.minH ?? 1, Math.min(h, bounds.maxY))

  let x = Math.max(0, geo.x)
  let y = Math.max(0, geo.y)
  if (typeof bounds?.maxX === 'number') x = Math.min(x, Math.max(0, bounds.maxX - w))
  if (typeof bounds?.maxY === 'number') y = Math.min(y, Math.max(0, bounds.maxY - h))
  return { ...geo, x, y, w, h }
}

// ==================== 碰撞 ====================

/** 带 id 的矩形，碰撞与压实都按这个结构算 */
export interface PlacedRect extends Geometry {
  id: string
}

/**
 * 两个矩形是否相交。边挨边不算相交——
 * 栅格里 `x+w == other.x` 是「紧挨着」，判成碰撞的话相邻组件永远排不到一起。
 */
export function collides(a: PlacedRect, b: PlacedRect): boolean {
  if (a.id === b.id) return false
  if (a.x + a.w <= b.x) return false
  if (a.x >= b.x + b.w) return false
  if (a.y + a.h <= b.y) return false
  if (a.y >= b.y + b.h) return false
  return true
}

/** 列出与目标矩形相交的所有矩形 */
export function findCollisions(target: PlacedRect, items: PlacedRect[]): PlacedRect[] {
  return items.filter((item) => collides(target, item))
}

/**
 * 把与 movedId 冲突的矩形往下推，直到全场无重叠。
 *
 * 被拖动的那个绝不移动——它是用户刚刚亲手放下的，一旦被别人挤走，
 * 手感就是「拖不过去」。static 的也不动，其余的让位。
 *
 * 算法是「一次定位一个，定了就不再动」：
 * 被拖的先落位，static 的跟上，其余按 y 序逐个下沉到不与**已落位者**冲突为止。
 *
 * 不要写成「每轮把所有冲突者一起下推」——那样多个矩形会互相追赶：
 * A 躲 B 的同时 B 也在躲 A，位置一轮比一轮深，永远收敛不了，
 * 轮数用完就带着重叠返回。逐个定位则每个矩形只单向下移一次，必然终止。
 */
export function resolveGridCollisions(items: PlacedRect[], movedId: string): PlacedRect[] {
  const working = items.map((item) => ({ ...item }))
  const placed: PlacedRect[] = []

  // 1. 被拖动的那个先占位——它是用户刚亲手放下的，绝不让位
  const moved = working.find((item) => item.id === movedId)
  if (moved) placed.push(moved)
  // 2. static 的也不动
  for (const item of working) {
    if (item.static && item.id !== movedId) placed.push(item)
  }
  // 3. 其余按 y 升序逐个下沉，只跟已落位的比
  const rest = working
    .filter((item) => item.id !== movedId && !item.static)
    .sort((a, b) => a.y - b.y || a.x - b.x)
  for (const item of rest) {
    // 上界兜底：正常情况远到不了，防的是数据异常导致的死循环
    const limit = item.y + working.length * Math.max(1, ...working.map((one) => one.h)) + 1
    while (item.y < limit && placed.some((other) => collides(item, other))) item.y++
    placed.push(item)
  }

  // 按传入顺序返回，调用方的索引不会错位
  return items.map((orig) => working.find((item) => item.id === orig.id) as PlacedRect)
}

/**
 * 向上压实：把每个矩形尽量上移，填掉中间的空行。
 *
 * 这是**显式操作**（编辑器上的「紧凑排列」按钮），不在拖拽里自动触发——
 * 自动压实会改掉用户放的 y，和「精准定位」互相打架。
 */
export function compactGrid(items: PlacedRect[]): PlacedRect[] {
  const sorted = [...items].map((item) => ({ ...item })).sort((a, b) => a.y - b.y || a.x - b.x)
  const placed: PlacedRect[] = []
  for (const item of sorted) {
    if (item.static) {
      placed.push(item)
      continue
    }
    // 一路上浮到再上一格就会撞人（或到顶）
    while (item.y > 0 && !placed.some((other) => collides({ ...item, y: item.y - 1 }, other))) {
      item.y--
    }
    // 起点本身就压着别人时先下沉让开
    while (placed.some((other) => collides(item, other))) {
      item.y++
    }
    placed.push(item)
  }
  return placed
}

/** 一组矩形占了多少行（画布至少要这么高） */
export function gridHeight(items: PlacedRect[]): number {
  return items.reduce((max, item) => Math.max(max, item.y + item.h), 0)
}

// ==================== 像素 ↔ 栅格 ====================

/**
 * 一格的宽度（px）。
 *
 * 栅格是「cols 格 + (cols-1) 条 gap」平分容器宽，所以单格宽要先扣掉全部间距。
 * 用容器宽直接除以 cols 是常见错误，列数越多误差越大，右边缘会飘出去。
 */
export function colWidth(containerWidth: number, cols: number, gap: number): number {
  return (containerWidth - gap * (cols - 1)) / cols
}

/** 栅格坐标 → 像素矩形（供编辑器画选中框、手柄用） */
export function gridToPixel(
  geo: Geometry,
  containerWidth: number,
  canvas: Required<CanvasConfig>
): { left: number; top: number; width: number; height: number } {
  const cw = colWidth(containerWidth, canvas.cols, canvas.gap)
  return {
    left: geo.x * (cw + canvas.gap),
    top: geo.y * (canvas.rowHeight + canvas.gap),
    // n 格的宽 = n 个单格宽 + 中间 n-1 条间距
    width: geo.w * cw + (geo.w - 1) * canvas.gap,
    height: geo.h * canvas.rowHeight + (geo.h - 1) * canvas.gap
  }
}

/**
 * 像素矩形 → 栅格坐标，gridToPixel 的逆运算。
 *
 * 宽度那一步别写成 `w / (cw + gap)`：n 格的宽是 `n*cw + (n-1)*gap`，
 * 少算了一条间距，格子一多就会少一格。补上一个 gap 再除才对得上。
 */
export function pixelToGrid(
  rect: { x: number; y: number; w: number; h: number },
  containerWidth: number,
  canvas: Required<CanvasConfig>
): Geometry {
  const cw = colWidth(containerWidth, canvas.cols, canvas.gap)
  const rowStep = canvas.rowHeight + canvas.gap
  return {
    x: Math.max(0, Math.round(rect.x / (cw + canvas.gap))),
    y: Math.max(0, Math.round(rect.y / rowStep)),
    w: Math.max(1, Math.round((rect.w + canvas.gap) / (cw + canvas.gap))),
    h: Math.max(1, Math.round((rect.h + canvas.gap) / rowStep))
  }
}

/** 像素位移 → 栅格步数（四舍五入到最近一格） */
export function pixelToGridDelta(
  dx: number,
  dy: number,
  containerWidth: number,
  canvas: Required<CanvasConfig>
): { dx: number; dy: number } {
  const cw = colWidth(containerWidth, canvas.cols, canvas.gap)
  return {
    dx: Math.round(dx / (cw + canvas.gap)),
    dy: Math.round(dy / (canvas.rowHeight + canvas.gap))
  }
}

// ==================== 绝对定位吸附 ====================

/** 一条对齐参考线。编辑器据此画出那根虚线 */
export interface SnapGuide {
  axis: 'x' | 'y'
  /** 参考线在画布上的坐标（px） */
  position: number
  /** 触发这条线的来源，用于调试与高亮 */
  source: 'canvas' | 'node'
}

/** 取一个矩形在某轴上的三个吸附锚点：起边、中线、终边 */
function anchorsOf(rect: { x: number; y: number; w: number; h: number }, axis: 'x' | 'y'): number[] {
  return axis === 'x'
    ? [rect.x, rect.x + rect.w / 2, rect.x + rect.w]
    : [rect.y, rect.y + rect.h / 2, rect.y + rect.h]
}

/**
 * 绝对定位下的吸附。
 *
 * 拿被拖动矩形的三个锚点（起边 / 中线 / 终边）去比其他矩形与画布的同类锚点，
 * 差值小于阈值就贴上去，并返回那条参考线让编辑器画出来。
 *
 * 只吸附位置不吸附尺寸：拖动时改 x/y，缩放时另有 snapResize 处理，
 * 混在一起会出现「一拖就变形」的怪手感。
 */
export function snapPosition(
  moving: PlacedRect,
  others: PlacedRect[],
  canvas: Required<CanvasConfig>,
  threshold = canvas.snapThreshold
): { x: number; y: number; guides: SnapGuide[] } {
  if (threshold <= 0) return { x: moving.x, y: moving.y, guides: [] }

  const guides: SnapGuide[] = []
  const result = { x: moving.x, y: moving.y }

  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? moving.w : moving.h
    const extent = axis === 'x' ? canvas.width : canvas.height
    // 画布的左/中/右（或上/中/下）永远可吸
    const targets: Array<{ value: number; source: SnapGuide['source'] }> = [
      { value: 0, source: 'canvas' },
      { value: extent / 2, source: 'canvas' },
      { value: extent, source: 'canvas' }
    ]
    for (const other of others) {
      if (other.id === moving.id) continue
      for (const value of anchorsOf(other, axis)) targets.push({ value, source: 'node' })
    }

    // 被拖矩形的三个锚点相对左上角的偏移
    const offsets = [0, size / 2, size]
    let best: { delta: number; position: number; source: SnapGuide['source'] } | null = null
    for (const offset of offsets) {
      const current = result[axis] + offset
      for (const target of targets) {
        const delta = target.value - current
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, position: target.value, source: target.source }
        }
      }
    }
    if (best) {
      result[axis] += best.delta
      guides.push({ axis, position: best.position, source: best.source })
    }
  }

  return { x: Math.round(result.x), y: Math.round(result.y), guides }
}

/**
 * 缩放时的吸附：只动被拖的那条边，另一条边钉住不许跑。
 *
 * 从左/上边缩放时 x/y 要跟着变，且 minW/maxW 夹取之后必须回头修正 x——
 * 否则拖到最小宽度以后继续往右拖，左边界会越过右边界，矩形整个翻过来。
 */
export function snapResize(
  rect: PlacedRect,
  handle: ResizeHandle,
  others: PlacedRect[],
  canvas: Required<CanvasConfig>,
  threshold = canvas.snapThreshold
): Geometry {
  const right = rect.x + rect.w
  const bottom = rect.y + rect.h
  const next: Geometry = { ...rect }

  const snapEdge = (value: number, axis: 'x' | 'y'): number => {
    if (threshold <= 0) return value
    const extent = axis === 'x' ? canvas.width : canvas.height
    const targets = [0, extent / 2, extent]
    for (const other of others) {
      if (other.id === rect.id) continue
      targets.push(...anchorsOf(other, axis))
    }
    let best: number | null = null
    for (const target of targets) {
      if (Math.abs(target - value) <= threshold && (best === null || Math.abs(target - value) < Math.abs(best - value))) {
        best = target
      }
    }
    return best === null ? value : best
  }

  if (handle.includes('e')) next.w = snapEdge(right, 'x') - rect.x
  if (handle.includes('s')) next.h = snapEdge(bottom, 'y') - rect.y
  if (handle.includes('w')) {
    const left = snapEdge(rect.x, 'x')
    next.x = left
    next.w = right - left
  }
  if (handle.includes('n')) {
    const top = snapEdge(rect.y, 'y')
    next.y = top
    next.h = bottom - top
  }

  // 夹取尺寸，然后把「钉住的那条边」重新对齐回去
  const clamped = clampGeometry(next)
  if (handle.includes('w')) clamped.x = right - clamped.w
  if (handle.includes('n')) clamped.y = bottom - clamped.h
  return clampGeometry(clamped, { maxX: canvas.width, maxY: canvas.height })
}

/** 八个缩放手柄的方位 */
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** 手柄顺时针排列，编辑器按这个顺序渲染 */
export const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/**
 * 按手柄方位把像素位移换算成新的矩形（未吸附、未夹取）。
 * 与 snapResize 分开是为了让「无吸附」场景（按住 Alt）走同一条计算路径。
 */
export function applyResizeDelta(rect: Geometry, handle: ResizeHandle, dx: number, dy: number): Geometry {
  const next = { ...rect }
  if (handle.includes('e')) next.w = rect.w + dx
  if (handle.includes('s')) next.h = rect.h + dy
  if (handle.includes('w')) {
    next.x = rect.x + dx
    next.w = rect.w - dx
  }
  if (handle.includes('n')) {
    next.y = rect.y + dy
    next.h = rect.h - dy
  }
  return next
}
