# @vima-tech/ui-admin · 给 AI 的施工须知

生成软件系统时，先读取 `docs/agent/README.md` 与匹配的 `docs/agent/recipes/`；公开接口和 SVG 图标以 `dist/ai-manifest.json` 为准，确定性生成接口从 `@vima-tech/ui-admin/agent` 导入。

政企后台 Vue 3 组件库。这份文件写的是**照抄就不会错的骨架**和**已经踩过的坑**，
先看完再动手，能省掉一整轮"页面为什么滚不动 / 侧栏为什么在上面"的排查。

---

## 一、这个包管什么，不管什么

判据只有一条：**落地时要不要碰 `.vui-*` 子树之外的 DOM。**

| | 归属 | 例子 |
|---|---|---|
| 只在组件自己的子树内 | **本包** | 组件外观、表格内部滚动、栅格塌行、浮层定位 |
| 越过 `.vui-*` 子树 | **宿主工程** | `html/body/#app` 高度、路由出口、业务页面怎么组织 |

`scripts/check-boundary.mjs` 会机检这条边界（第 4 项）——本包里写裸元素选择器或 `*` 选择器**会直接构建失败**，不是风格建议。

---

## 二、布局契约（照抄）

高度是一条**跨越宿主与本包的链子**，断在任何一环，表现都一样：
整页出现滚动条，而表格内部反而滚不动。

```
html/body/#app { height: 100% }   ← 宿主写（本包无权写裸元素选择器）
  └ .vui-layout-fill              ← 从这里开始归本包
      └ .vui-body
          └ .vui-page
              └ .vui-table        ← 自带内部滚动，只等祖先给出确定高度
```

### 整页外壳（每个项目写一次）

```vue
<VLayout class="vui-layout-fill">
  <VSide>侧边栏</VSide>
  <VBody>
    <VHeader>顶栏</VHeader>
    <router-view />   <!-- 业务页面从这里进来 -->
  </VBody>
</VLayout>
```

- `VLayout` 默认纵向；**直接子元素里有 `VSide` 就自动转横向**，不用写方向类。
- 因此**顶栏不要和侧栏平级**，放进 `VBody` 里（侧栏通高、顶栏只压住内容区）。
- `vui-layout-fill` 要显式加。`VLayout` 也会被拿来做页面内的小盒子，无条件撑满会把那些用法撑坏。
- 前提是宿主已经给了 `html/body/#app` 高度，否则 `height:100%` 没有参照物。

### 业务页面（每个页面都这么写）

```vue
<template>
  <div class="vui-page">
    <VCard title="查询条件">…搜索栏…</VCard>

    <VCard title="用户列表">          <!-- 末个卡片会自动撑满剩余高度 -->
      <VTable :columns="columns" :data-source="rows" />
      <VPagination v-model:current="query.pageNum" :total="total" />
    </VCard>
  </div>
</template>
```

`.vui-page` 已经替你做掉四件事，**不要再自己写高度、padding 或 overflow**：

| 规则 | 挡掉的坑 |
|---|---|
| `height:100%` + `min-height:0` | 高度先确定，"滚动"才有边界可言 |
| `> * { flex-shrink: 0 }` | 纵向 flex 子项默认可压缩，内容超高时顶部搜索栏会被压扁甚至裁掉半截 |
| `> :last-child { flex: 1 1 auto }` | 末个块吃掉剩余高度（否则页底留空洞），**同时重新放开收缩**——只写 `flex-grow:1` 会得到 `flex:1 0 auto`，末个块按内容高度长到几千像素，滚动条重新落回页面级 |
| `overflow: auto` | 兜底：内容真放不下时在页面内滚，而不是把整个外壳顶出滚动条 |

末个卡片的高度还会继续往下传给 `.vui-card-body` → `.vui-table`，
所以**表格会自己内部滚动，表头和分页留在原地**。这是自动的，不需要写任何 CSS。

### 禁止事项

- 禁止 `min-height: calc(100vh - 120px)` 这类魔法数——顶栏高度一改就错位，且会造成页面级滚动。
- 禁止给页面根写 `height: 100vh`——它在 `VBody` 里面，不是视口。
- 禁止把 `VCol` 放在 `VRow` 外面。栅格宽度靠 `width`，但直接落进纵向 flex 容器仍然拿不到分栏效果。

---

## 三、别手写这个包已经有的东西

AI 最常见的浪费是重新实现一遍已存在的组件。动手前先查这张表：

| 想做的事 | 用它 | 别这么写 |
|---|---|---|
| 翻页 | `VPagination` | 手写「上一页 / 下一页」按钮 |
| 确认框 | `layer.confirm(内容, { title, btn })` | 原生 `confirm()` |
| 轻提示 | `layer.msg('保存成功')` | 原生 `alert()` |
| 全局 loading | `layer.load()` / `layer.close(index)` | 自己糊遮罩 |
| 对话框 / 抽屉 | `VLayer`、`VDrawer` | 自己写遮罩 + 定位 |
| 空状态 / 骨架屏 | `VEmpty`、`VSkeleton` | 手写占位 div |
| 列显隐 | `VColumnSetting` | 自己维护一份列开关 |

完整导出面见 `src/index.ts` 的 `components` 数组（当前 63 个，数量由门禁动态核对）。
API 逐项说明由 `npm run docs` 起本地文档站查看。

浮层类组件（`VSelect`、`VDatePicker`、`VDropdown`）的面板都 **teleport 到 body 并用 fixed 定位**，
所以放进任何 `overflow: hidden` 的容器都不会被裁——不要为它们特意去改祖先的 `overflow`。

---

## 三点五、模板系统（低代码）

`src/template/` 是一套 JSON → UI 的模板系统，含**随包发布的可视化编辑器**。

```ts
import { VTemplateEditor, TemplateRenderer, createTemplateEditor } from '@vima-tech/ui-admin'
```

### 摆放模式写在 `layoutMode` 上

| 模式 | 单位 | 定位能力 | 响应式 |
|---|---|---|---|
| `flow`（**默认**） | — | 按树结构堆叠 | 跟随内容 |
| `grid` | 格 / 行 | 「从第 7 列第 3 行起，占 6 格 2 行」 | 支持 LG/MD/SM |
| `absolute` | px | 「x=344 y=60 w=310 h=140」+ 参考线吸附 | 不支持 |

不写就是 `flow`，**旧模板逐像素不变**。几何写在 `node.layout.grid` / `node.layout.absolute`，
含 `minW/maxW/minH/maxH`。

### 改这块之前必须知道的四件事

1. **grid 用 CSS Grid，不是 VRow/VCol。** `VCol` 表达不了「从第 7 列开始」，
   而列起点是精准定位的前提。栅格词汇（24 格）和塌行断点（1100px）仍与 `ui.css` 同源。
2. **grid 模式不做自动向上压实。** 压实会改掉用户亲手放的 `y`，与「精准定位」冲突。
   重叠只下推被压住的节点；紧凑排列是工具栏上的显式操作。
3. **min/max 在 grid 下是编辑期约束**（单位是格，依赖容器宽，写不成静态 px），
   在 absolute 下才会输出成真的 CSS `min-width`/`max-height`。
4. **非 LG 断点下编辑，几何只写进 `layout.breakpoints[bp]`**，绝不动基准值——
   否则改窄屏会把宽屏一起改坏，而且当场看不出来。

### 几何与状态机是分开的纯逻辑

- `template/geometry.ts` —— 纯函数：碰撞、压实、夹取、吸附、格 ↔ 像素互转。
  **改拖拽手感先改这里**，它被 `test/template-geometry.test.mjs` 钉着。
- `template/editor-state.ts` —— 撤销重做、多选、剪贴板、几何提交。
  跨事件的拖拽用 `beginBatch()` / `endBatch()` 包起来，否则一次拖动会记几十条历史，
  撤销一次只退回一帧。

## 四、改样式改哪个文件

| 文件 | 能不能手改 |
|---|---|
| `src/styles/ui.css` | 不可手改；**是 `npm run extract` 的产物，手改会被下次提取冲掉** |
| `src/styles/components.css` | 可手写；本库新增的样式一律写这里 |
| `src/styles/tokens.css` | 可手写；唯一的取色取值入口 |

两条硬规矩：

1. 选择器**不出 `.vui-` 子树**（`check-boundary` 第 4 项机检）。
2. 颜色尺寸只取 `var(--vui-*)`，且新变量必须在 `tokens.css` 里给默认值——
   缺省不会报错，只是那条样式**静默失效**（`check-boundary` 第 3 项机检）。

`components.css` 后于 `ui.css` 加载，等权重时后者胜出，所以覆盖 `ui.css` 的规则**不需要 `!important`**。

---

## 五、改完必须跑

```bash
npm run check:boundary   # 边界体检：包外引用 / 宿主残留 / 令牌闭包 / 全局副作用 / 类名闭包 / 文档示例
npm run typecheck
npm test
npm run verify:publish   # 发布前总门禁（含上面几项 + 构建）
```

`check:boundary` 第 6 项会检查**组件挂出去的每个 `vui-*` 类名在样式表里都有规则命中**。
这条挡的是一类静默失效：`VLayout / VHeader / VBody / VSide` 曾整整一版没有任何样式，
`<section>` 按 `display:block` 排，"侧栏 + 内容"渲染成上下堆叠，
宿主一直以为是自己 flex 没写对。新增组件时若确实是纯结构钩子（自身不需要样式），
在 `CLASSLESS_OK` 里登记并写明理由，**不要拿豁免掩盖真的样式缺失**。

---

## 六、生成产物状态

`createArtifactPlan()` 返回的 `readiness` 当前固定为 `scaffold`。生成文件可进入编译验证，但动态数据、提交和业务动作必须逐项关闭 `integrationRequirements` 后，才能宣称已经集成或完成。`ok: true` 仅表示规格与计划有效，不等于业务系统已验收。
