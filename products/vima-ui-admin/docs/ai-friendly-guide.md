# AI Agent 使用指南

Vima UI Admin 的 AI-First 能力用于开发阶段的软件构建 Agent。浏览器运行时不负责理解自然语言；Agent 负责把需求转换成 `AppSpec`，框架负责确定性生成和验证。

## 1. 权威入口

| 目的 | 入口 |
|---|---|
| 组件、Props、Events、Slots、模板别名、SVG 图标 | `@vima-tech/ui-admin/ai-manifest.json` |
| AppSpec 类型和页面 Builders | `@vima-tech/ui-admin/agent` |
| AppSpec JSON Schema | `@vima-tech/ui-admin/agent/schema/app-spec.v1.json` |
| Agent 工作流和系统 Recipes | `docs/agent/README.md` |
| Template DSL 和可视化编辑器 | `docs/template-system.md` |

公开接口以组件源码和构建生成的 Manifest 为准。文档示例不得声明源码中不存在的函数。

## 2. 结构化生成

自然语言到 `AppSpec` 的转换由 Agent 完成，框架不提供关键词解析器。

```ts
import { createArtifactPlan, type AppSpec } from '@vima-tech/ui-admin/agent'

const spec: AppSpec = {
  version: '1',
  name: '用户中心',
  shell: {
    title: '用户中心',
    navigation: [
      { label: '用户管理', route: '/users', icon: 'users' }
    ]
  },
  routes: [
    { path: '/users', pageId: 'users' }
  ],
  pages: [
    {
      id: 'users',
      type: 'crud',
      title: '用户管理',
      rowKey: 'id',
      fields: [
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
        }
      ],
      actions: [
        { key: 'create', label: '新增', kind: 'primary', icon: 'plus' }
      ]
    }
  ]
}

const result = createArtifactPlan(spec)
if (!result.ok) {
  throw new Error(JSON.stringify(result.diagnostics))
}

for (const file of result.plan.files) {
  console.log(file.path, file.overwrite)
}
```

Builder 不会猜测业务必填、权限或数据接口。缺少必要契约时返回 `UIDiagnostic[]`。

## 3. 单页 Builders

```ts
import {
  buildCrudPage,
  buildDashboardPage,
  buildDetailPage,
  buildFormPage
} from '@vima-tech/ui-admin/agent'

const form = buildFormPage({
  id: 'create-user',
  type: 'form',
  title: '新增用户',
  fields: [
    { key: 'name', label: '姓名', dataType: 'string', required: true },
    { key: 'birthday', label: '生日', dataType: 'date' }
  ],
  submitLabel: '保存'
})

const crud = buildCrudPage({
  id: 'users',
  type: 'crud',
  title: '用户管理',
  rowKey: 'id',
  fields: [
    { key: 'name', label: '姓名', dataType: 'string' }
  ]
})

const detail = buildDetailPage({
  id: 'user-detail',
  type: 'detail',
  title: '用户详情',
  fields: [
    { key: 'name', label: '姓名', dataType: 'string' }
  ]
})

const dashboard = buildDashboardPage({
  id: 'overview',
  type: 'dashboard',
  title: '经营概览',
  metrics: [
    { key: 'users', label: '用户数', value: 128 }
  ]
})

console.log(form.ok, crud.ok, detail.ok, dashboard.ok)
```

同一输入、同一包版本的 Builder 输出保持一致，便于 Diff、缓存和增量修复。

## 4. 字段建模

不要把数据类型、集合形状和控件格式混在一个枚举中：

```ts
const fields = [
  { key: 'title', label: '标题', dataType: 'string', format: 'text' },
  { key: 'tags', label: '标签', dataType: 'string', cardinality: 'list' },
  { key: 'period', label: '周期', dataType: 'date', cardinality: 'tuple', format: 'date-range' },
  { key: 'attachment', label: '附件', dataType: 'object', format: 'file' }
] as const
```

`required` 必须来自需求、后端契约或明确校验规则，不能根据 `name`、`email` 等字段名自动决定。

## 5. 模板验证与信任级别

```ts
import { validateTemplate } from '@vima-tech/ui-admin'

const result = validateTemplate(template, { trustLevel: 'untrusted' })
if (!result.valid) {
  console.error(JSON.stringify(result.diagnostics, null, 2))
}
```

AI 生成、远程返回和导入文件默认是 `untrusted`，只允许静态值、简单数据路径和白名单动作。以下内容会被拒绝：

- 任意表达式和函数调用；
- 自定义事件函数字符串；
- function 数据源；
- 模板 scripts；
- customCSS；
- 未授权的外部 API 数据源和导航。

只有项目内经过代码审查的模板才能显式使用 `{ trustLevel: 'trusted' }`。

## 6. 正确的表单结构

`label` 和业务校验属于 `VFormItem`，不是 `VInput`：

```vue
<VForm :model="formData" :rules="rules">
  <VFormItem label="姓名" prop="name" required>
    <VInput v-model="formData.name" placeholder="请输入姓名" />
  </VFormItem>
</VForm>
```

组件保留原有公开属性名，例如 `disabled`、`loading`、`type`；不得把规划中的命名规范当成当前接口。

## 7. SVG 图标

```vue
<VButton type="primary">
  <VIcon name="plus" />
  新增
</VButton>
```

图标名必须来自 Manifest 或 `getIconNames()`。功能图标不使用 Emoji；业务自定义图标通过 `registerIcon(name, paths)` 注册统一的 24×24 `currentColor` 描边路径。

## 8. 验证闭环

生成完成后执行：

```bash
npm run check:ai
npm run typecheck
npm test
npm run verify:publish
```

Agent 优先处理 JSON 诊断中的 `code`、`path`、`component` 和 `suggestion`。默认最多修复两轮；仍失败时报告缺失契约或外部阻塞，不删除检查、不改成空壳产物。

## 9. 兼容工具

主入口仍公开 `inferFieldConfig`、`generateFormCode`、`generateTableCode`、`UIError` 和 `validateProp`，用于兼容既有调用。新的 Agent 流程优先使用 `AppSpec`、Builders 和 Template Validator，因为它们具有版本化输入、确定性输出和统一诊断。
