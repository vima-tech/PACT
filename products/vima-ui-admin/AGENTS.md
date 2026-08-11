# Vima UI Admin Agent Instructions

使用本框架生成后台系统前，先读取 `docs/agent/README.md`，再从 `docs/agent/recipes/index.json` 选择相关 Recipe。公开组件、属性和 SVG 图标以构建生成的 `dist/ai-manifest.json` 为准；结构化生成接口位于 `@vima-tech/ui-admin/agent`。

必须运行 `npm run check:ai`、`npm run typecheck`、`npm test` 和 `npm run verify:publish`。不得猜测不存在的公开名称，不得用 Emoji 代替功能图标，不得执行不可信模板中的函数或脚本。

