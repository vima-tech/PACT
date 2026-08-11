# PACT Platform Engineering Instructions

<!-- @pact R001,R017,R026 -->

本仓库同时承载通用 PACT skills、可选 Vima UI 产品和可选 Vima Starter 模板。

## 边界

- `pact/` 与 `pact-*` 是通用 Core，不得 import 或引用 `products/vima-ui-admin`、`templates/vima-starter`。
- Vima 集成只进入 `platform/registry`、`platform/adapters` 与 `platform/scripts`。
- `products/vima-ui-admin` 保持独立 npm 包和目录内 `AGENTS.md` 规则。
- `templates/vima-starter` 保持独立 CLI；frontend/backend 是真源，`cli/template` 只由同步脚本生成。
- 不执行真实 publish/push，不读取 registry token；生成物只写 `artifacts/`。

## 修改与验证

- 平台工具使用 Node.js ESM 和内建模块，错误输出稳定 `code/path`。
- JSON 输出按 key/数组稳定排序；写文件先临时文件再原子 rename。
- 全量验证：`npm run verify`。产品构建必须串行。
- 实现 PACT 需求的源码/测试必须带 `@pact R###` 标记，并同步 action graph 证据。

