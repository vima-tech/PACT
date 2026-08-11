# 自定义模板系统

## 概述

自定义模板系统是一个低代码/无代码的UI配置系统，允许用户通过可视化编辑器或JSON配置来定义表单、卡片、列表等UI模板。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    模板系统架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   模板编辑器  │───▶│  模板存储层  │───▶│  模板渲染器  │  │
│  │  (拖拽编辑)   │    │  (JSON/DSL)  │    │  (运行时)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   组件面板   │    │   AI接口层   │    │   数据绑定   │  │
│  │  (可拖拽)    │    │  (读写API)   │    │   事件处理   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 模板数据结构 (types.ts)

定义模板的JSON结构：

```typescript
interface Template {
  id: string              // 模板唯一ID
  name: string            // 模板名称
  type: TemplateType      // 模板类型: form | card | list | page | custom
  version: string         // 模板版本
  root: TemplateNode      // 模板根节点
  formConfig?: FormConfig // 表单配置
  styleConfig?: StyleConfig // 样式配置
}

interface TemplateNode {
  id: string              // 节点ID
  type: ComponentType     // 组件类型
  props?: ComponentProps  // 组件属性
  children?: TemplateNode[] // 子节点
  events?: Record<string, EventHandler> // 事件处理
  condition?: string      // 条件渲染
  loop?: LoopConfig       // 循环渲染
}
```

### 2. 模板渲染器 (renderer.ts)

将模板JSON渲染为Vue组件：

```vue
<template>
  <TemplateRenderer 
    :template="template" 
    v-model="formData"
    @submit="handleSubmit"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TemplateRenderer } from '@vima-tech/ui-admin'

const template = ref({
  id: 'my-form',
  name: '用户表单',
  type: 'form',
  root: {
    type: 'form',
    children: [
      {
        type: 'form-item',
        props: { label: '姓名', field: 'name' },
        children: [{ type: 'input', props: { placeholder: '请输入姓名' } }]
      }
    ]
  }
})

const formData = ref({})
const handleSubmit = (data) => console.log('提交:', data)
</script>
```

### 2.5 布局与几何（layoutMode / layout）

模板节点默认只有树形结构，没有坐标。要做到「长宽可限制、定位够精准」，
在 `Template.layoutMode`（或某个容器节点的 `node.layoutMode`）上声明摆放模式：

| 模式 | 单位 | 能表达什么 | 响应式 | 适合 |
|---|---|---|---|---|
| `flow`（默认） | — | 按树结构自然堆叠 | 跟随内容 | 表单、旧模板 |
| `grid` | 格 / 行 | 「从第 7 列第 3 行起，占 6 格宽 2 行高」 | 支持按断点塌行 | 后台页面、列表 |
| `absolute` | px | 「x=344, y=60, w=310, h=140」 | 不支持，固定画布 | 大屏、报表、打印模板 |

**不写 `layoutMode` 就是 `flow`，旧模板逐像素不变。**

```ts
const template: Template = {
  id: 'demo', name: '演示', type: 'page', version: '1.0.0',
  layoutMode: 'grid',
  canvas: { cols: 24, rowHeight: 40, gap: 12 },
  root: {
    id: 'root', type: 'container', layoutMode: 'grid',
    children: [
      {
        id: 'name', type: 'input',
        layout: {
          grid: { x: 0, y: 0, w: 6, h: 1, minW: 4, maxW: 12 },
          // 断点覆盖只盖写了的字段，其余沿用上面的基准值
          breakpoints: { sm: { w: 24 } }
        }
      }
    ]
  }
}
```

几点容易踩的：

- **grid 模式为什么是 CSS Grid 而不是 VRow/VCol。** `VCol` 只能表达「占几格宽」，
  表达不了「从第 7 列开始」。列起点是精准定位的前提，只有 Grid 给得了。
  栅格词汇（24 格）与塌行断点（1100px）仍与 `styles/ui.css` 同源。
- **min/max 在两种模式里的含义不同。** `absolute` 下单位是 px，会真的输出成 CSS 的
  `min-width` / `max-height` 兜底；`grid` 下单位是「格」，依赖容器宽度，
  没法写成静态 px，因此它是**编辑期约束**——拖拽和缩放时用来夹取。
- **grid 不做自动向上压实。** 压实会改掉你亲手放的 `y`，与「定位精准」互相打架。
  落点重叠时只把被压住的节点下推；要紧凑排列请显式调 `compactGrid()`
  或点编辑器工具栏上的「紧凑排列」。
- **响应式走 CSS 变量 + 媒体查询，没有 ResizeObserver。** 渲染时把 lg/md/sm 三档几何
  一次性写成 `--vui-tpl-col-*`，媒体查询只切换引用哪一档，无运行时开销。
- **节点级 `layoutMode` 可以嵌套。** 模式不向下继承：栅格容器的子节点落在单元格里，
  单元格内部仍是流式，除非那个子节点自己也声明了 `layoutMode`。
  「卡片里嵌一块栅格画布」就是这么写的。

几何计算全部是纯函数，可单独使用（`geometry.ts`）：
`clampGeometry` / `collides` / `resolveGridCollisions` / `compactGrid` /
`snapPosition` / `snapResize` / `gridToPixel` / `pixelToGrid`。

### 2.6 可视化编辑器 (VTemplateEditor)

随包发布，`import` 即用：

```vue
<script setup>
import { ref } from 'vue'
import { VTemplateEditor } from '@vima-tech/ui-admin'

const template = ref(/* 上面那份 Template */)
</script>

<template>
  <!-- 编辑器高度撑满父容器，父容器需要有确定高度 -->
  <div style="height: 700px">
    <VTemplateEditor v-model="template" @save="onSave" />
  </div>
</template>
```

三栏：左组件面板（拖入或双击加入）、中画布、右属性/图层。

| 能力 | 说明 |
|---|---|
| 拖拽摆放 | grid 按格吸附，absolute 按 px 并带对齐参考线 |
| 八向缩放 | 选中后出现 8 个手柄，结果受 min/max 与画布边界夹取 |
| 撤销重做 | 一次拖拽合并成一步历史（不是一帧一步） |
| 多选 | Shift / Ctrl 点选，可整体微调与删除 |
| 剪贴板 | 复制、剪切、粘贴、原地复制一份；粘贴会错开位置并重新生成 id |
| 图层树 | 列出根容器的直接子节点，点击即选中 |
| 属性面板 | 位置尺寸、尺寸限制、锁定、组件属性、事件编排 |
| 断点切换 | LG / MD / SM；**非 LG 时改动只写进该断点，不会动宽屏布局** |

快捷键：`Ctrl+Z` / `Ctrl+Shift+Z`（或 `Ctrl+Y`）撤销重做、`Ctrl+C/X/V/D`、
`Ctrl+A` 全选、`Delete` 删除、方向键微调（absolute 下按住 `Shift` 走 10px）。

编辑器状态机也可以单独用（自己写界面时）：

```ts
import { createTemplateEditor } from '@vima-tech/ui-admin'

const editor = createTemplateEditor(template)
editor.beginBatch()                       // 一次拖拽的开始
editor.updateGeometry('name', { x: 6 })
editor.endBatch()                         // 整段合并成一步历史
editor.undo()
```

### 3. 模板编辑器 (editor.ts)

提供可视化编辑功能：

```typescript
import { 
  createEmptyTemplate, 
  createNode, 
  COMPONENT_CATEGORIES,
  COMPONENT_PROPS_CONFIG 
} from '@vima-tech/ui-admin'

// 创建空模板
const template = createEmptyTemplate('form', '我的表单')

// 添加节点
const inputNode = createNode('input', { placeholder: '请输入' })
template.root.children.push({
  id: 'item-1',
  type: 'form-item',
  props: { label: '姓名', field: 'name' },
  children: [inputNode]
})
```

### 4. 模板存储 (storage.ts)

提供模板的持久化存储：

```typescript
import { LocalTemplateStorage, AITemplateService } from '@vima-tech/ui-admin'

// 本地存储
const storage = new LocalTemplateStorage()
await storage.save(template)
const loaded = await storage.load('template-id')

// AI服务
const aiService = new AITemplateService(storage)
const result = await aiService.handleRequest({
  operation: 'generate',
  prompt: '创建一个用户注册表单'
})
```

## 使用场景

### 1. 表单模板

```json
{
  "id": "user-form",
  "name": "用户信息表单",
  "type": "form",
  "root": {
    "type": "form",
    "props": { "layout": "vertical", "labelWidth": "100px" },
    "children": [
      {
        "type": "form-item",
        "props": { "label": "姓名", "field": "name", "required": true },
        "children": [{ "type": "input", "props": { "placeholder": "请输入姓名" } }]
      },
      {
        "type": "form-item",
        "props": { "label": "邮箱", "field": "email" },
        "children": [{ "type": "input", "props": { "type": "email" } }]
      },
      {
        "type": "form-item",
        "props": { "label": "状态", "field": "status" },
        "children": [{
          "type": "select",
          "props": {
            "options": [
              { "value": "active", "label": "启用" },
              { "value": "disabled", "label": "禁用" }
            ]
          }
        }]
      }
    ]
  }
}
```

### 2. 卡片模板

```json
{
  "id": "user-card",
  "name": "用户卡片",
  "type": "card",
  "root": {
    "type": "card",
    "props": { "title": "用户信息" },
    "children": [
      {
        "type": "descriptions",
        "props": { "column": 2, "border": true },
        "children": [
          { "type": "descriptions-item", "props": { "label": "姓名" } },
          { "type": "descriptions-item", "props": { "label": "邮箱" } }
        ]
      }
    ]
  }
}
```

### 3. 条件渲染

```json
{
  "type": "form-item",
  "props": { "label": "其他信息" },
  "condition": "formData.type === 'other'",
  "children": [{ "type": "textarea" }]
}
```

### 4. 循环渲染

```json
{
  "type": "container",
  "loop": {
    "data": "formData.items",
    "item": "item",
    "index": "idx"
  },
  "children": [
    {
      "type": "form-item",
      "props": { "label": "{{item.label}}" },
      "children": [{ "type": "input" }]
    }
  ]
}
```

### 5. 事件处理

```json
{
  "type": "button",
  "props": { "type": "primary" },
  "events": {
    "click": {
      "type": "click",
      "action": "submit"
    }
  }
}
```

### 6. 校验与数据源

`TemplateRenderer` 暴露 `validate()`、`reset()`、`loadData(id)`、`getFormData()` 与
`setFormData(data)`。`validate()` 会调用根 `VForm` 的真实规则校验，不是固定返回成功。

数据源支持 `static`、`api`、`function` 三种类型；加载结果通过
`dataSources.<id>` 用在属性表达式、条件和循环中：

```typescript
const template = {
  // ...其余模板字段
  dataSources: [
    {
      id: 'departments',
      name: '部门列表',
      type: 'api',
      autoLoad: true,
      api: { url: '/api/departments', method: 'GET' }
    }
  ]
}

// 节点中使用：
// { type: 'select', props: { options: '{{dataSources.departments}}' } }
```

API 请求非 2xx、数据源不存在或函数执行失败时会抛出错误；自动加载错误交给
`config.onError(error, rootNode)`。函数数据源和自定义事件通过 `Function` 执行，模板来源不可信时应在服务端禁用或先做白名单审核。

## AI接口

### 请求格式

```typescript
interface AIRequest {
  operation: 'create' | 'read' | 'update' | 'delete' | 'generate' | 'transform'
  prompt?: string           // 自然语言描述
  templateId?: string       // 模板ID
  template?: Partial<Template> // 模板数据
  target?: string           // 转换目标
}
```

### 示例

```typescript
// AI生成表单
const response = await aiService.handleRequest({
  operation: 'generate',
  prompt: '创建一个包含姓名、邮箱、手机号的用户注册表单'
})

// AI读取模板
const response = await aiService.handleRequest({
  operation: 'read',
  templateId: 'user-form'
})

// AI更新模板
const response = await aiService.handleRequest({
  operation: 'update',
  templateId: 'user-form',
  template: {
    root: {
      // ... 新的模板结构
    }
  }
})
```

## 组件清单

### 布局组件
- `container` - 通用容器
- `row` - 行布局
- `col` - 列布局
- `card` - 卡片容器
- `divider` - 分割线

### 表单组件
- `form` - 表单容器
- `form-item` - 表单项
- `input` - 输入框
- `input-number` - 数字输入
- `select` - 选择器
- `switch` - 开关
- `radio` / `radio-group` - 单选
- `checkbox` / `checkbox-group` - 多选
- `datepicker` - 日期选择
- `timepicker` - 时间选择
- `textarea` - 文本域
- `upload` - 文件上传

### 数据展示
- `table` - 表格
- `tag` - 标签
- `badge` - 徽标
- `progress` - 进度条
- `statistic` - 统计数值
- `descriptions` - 描述列表
- `tree` - 树形控件

### 反馈组件
- `alert` - 警告提示
- `tooltip` - 文字提示
- `popover` - 气泡卡片

### 操作组件
- `button` - 按钮
- `button-group` - 按钮组
- `link` - 链接
- `dropdown` - 下拉菜单

## 最佳实践

1. **模板设计原则**
   - 保持模板结构清晰，层级不宜过深
   - 使用语义化的字段名和标签
   - 合理使用条件渲染和循环渲染

2. **性能优化**
   - 避免在循环中使用复杂表达式
   - 合理使用条件渲染减少DOM节点
   - 大数据列表考虑分页或虚拟滚动

3. **AI友好**
   - 使用完整的字段名和标签
   - 提供清晰的模板描述
   - 合理使用标签分类
