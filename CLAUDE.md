# PACT Platform Engineering Instructions

<!-- @pact R001,R017,R026,R028,R041 -->

## 最高准则：以真实业务交付为终点

PACT 的终极目标是：**让用户使用 Claude Code、Codex 等 AI Agent 工具，配合 PACT，快速把真实需求落地为规范、准确实现、真正可用、可稳定运行且可持续演进的业务操作系统。**

这里的“业务操作系统”是承载企业业务流程、数据、权限、审计与运维的应用系统，不是通用计算机操作系统。PACT 不替代 Agent：Agent 负责理解、推理、编码与修复；PACT 负责固定目标、约束、变更协议和完成证据。

任何产品、架构、契约、测试、文档和发行决策，都必须优先服务下列四个判断标准：

1. 规范：需求、契约、代码和验收可追溯；
2. 准确：实现与冻结业务意图一致；
3. 可用：系统可构建、可启动、已集成并完成真实业务闭环；
4. 稳定：可部署、可恢复、可观测，并有可重放的稳定性证据。

完成度必须按 `implemented → buildable → startable → integrated → business-closed-loop → accepted → deployable → stable` 逐级表达。低层状态不得冒充高层交付；冲突时，本节是本仓库的最高判断标准。

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
