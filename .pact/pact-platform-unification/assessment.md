# 存量代码八维评估（Brownfield Assessment）

> 创建日期: 2026-08-11
>
> 范围：`pact`、`vima-ui-admin`、`vima-starter` 当前快照。只读评估，不在本阶段修改代码。
> 严重度：**P0**=迁移正确性/安全/既有约定冲突（必修） · **P1**=显著技术债 · **P2**=打磨。

## 实现盘点

| 模块 | 语言/框架 | 规模/形态 | 职责 | 与本次需求的关系 |
|---|---|---|---|---|
| `pact/` 与六个命令 skill | Shell + Node.js + Markdown | 7 个 skill、20+ 检查/生成脚本 | 规格、执行图谱、追溯、施工闭环 | 统一仓库的 Core 与治理真源；不得反向依赖 Vima |
| `vima-ui-admin` | Vue 3 + TypeScript + Node.js | 组件库、Agent Builder、Manifest、7 个测试文件 | 可选 UI 能力与前端确定性生成 | 迁入 `products/`，以可选 adapter 对接 PACT |
| `vima-starter` | Vue 3 + Java 21/Spring Boot + Node CLI | frontend/backend/cli/template 四部分 | 业务系统脚手架与全栈宿主 | 仅 Capability Router 判定为业务系统时选择；迁入 `templates/` |

## 八维评估

| 维度 | 评分 A–D | 现状 | 关键问题 | 证据 `file:line` | 最高严重度 |
|---|---:|---|---|---|---:|
| 1 结构与分层 | C | PACT 是 skill-only 仓库；两个 Vima 产品在仓外且没有独立 Git 历史 | 缺少统一目录、根编排、产品 provenance；若直接搬目录会破坏旧路径与来源可审计性 | `README.md:113-128`；`vima-starter/package.json:6-15`；`vima-starter/scripts/sync-template.mjs:3-15` | P0 |
| 2 **核心不变量** | C | PACT 已定义单文件规格、图谱和完成门；UI 已定义 Manifest/DSL 边界；Starter 是宿主 | 物理统一容易误变成逻辑耦合；现有 UI `AppSpec` 只含 shell/pages/routes，Builder 固定生成新 App 壳，不能冒充全栈 Starter adapter | `README.md:60-99`；`vima-ui-admin/src/agent/types.ts:83-105`；`vima-ui-admin/src/agent/builders.ts:265-301` | P0 |
| 3 既有约定是否被遵守 | D | UI 规定 Manifest 名称、VIcon、无 Emoji、全套门禁；Starter 规定根 frontend/backend 是模板真源 | Starter 路由、侧栏和初始化菜单使用 Emoji，且导航存在三份真源；UI 当前源码与 registry 同为 `0.1.0` 但公开面不同 | `vima-ui-admin/docs/agent/README.md:14-21`；`vima-starter/frontend/src/router/index.ts:18-96`；`vima-starter/frontend/src/components/layout/Sidebar.vue:17-36`；`vima-starter/backend/src/main/java/com/vima/starter/config/DataInitializer.java:50-102`；`vima-starter/frontend/package-lock.json:750-753` | P0 |
| 4 数据正确性铁律 | C | 本次治理数据主要是能力、版本、路径、内容哈希和变更集合 | 当前没有 schema 化 registry/compatibility/provenance；只看 semver 会把同版本不同能力误判兼容；DB 文档/CLI 能力也可能漂移 | `vima-ui-admin/package.json:2-35`；`vima-starter/frontend/package.json:12-17`；`vima-starter/cli/index.js:13-49` | P0 |
| 5 安全与权限 | D | UI 新 Agent 入口明确禁止不可信函数/脚本；Starter 登录后仅要求 authenticated | 统一工具若直接复用旧模板执行能力或默认执行依赖安装，会扩大供应链与路径写入风险；Starter 不能被宣称已具备业务级权限执行 | `vima-ui-admin/docs/agent/README.md:23-29`；`vima-starter/cli/index.js:112-121,132-172`；`vima-starter/backend/src/main/java/com/vima/starter/config/SecurityConfig.java:21-34` | P0 |
| 6 可维护性与技术债 | C | 三个项目各有自己的命令和依赖锁；Starter 有单向模板同步 | 缺少统一目录契约、changed-path 归属、兼容矩阵和根级说明；Starter 导航三真源会持续漂移，但属于后续业务生成能力深化，不应全部塞进迁移 | `README.md:113-128`；`vima-starter/scripts/sync-template.mjs:25-37`；`vima-starter/frontend/src/router/index.ts:17-98` | P1 |
| 7 性能与可扩展 | C | UI 有运行时体积预算，PACT 检查脚本可独立执行 | UI 当前 `check:ai` 因 runtime gzip 超预算而失败；迁入后若统一验证仍红，三阶段不能算完成；根编排必须串行避免已观察到的构建产物竞争 | `vima-ui-admin/scripts/check-runtime-size.mjs:21-39`；`vima-ui-admin/package.json:47-57` | P0 |
| 8 测试与文档 | C | PACT 有 lint/graph/trace/review；UI 有 7 个测试文件与 publish gate；Starter backend 无测试文件 | 没有跨产品 registry/router/release-plan 测试；Starter 无后端测试；根 README 仍只描述 skill 套件 | `README.md:88-100`；`vima-ui-admin/package.json:47-57`；`vima-starter/package.json:10-15` | P1 |

## 关键发现（按严重度）

### P0 · 本次迁移必须修复

1. **迁移必须可回滚且保留旧路径。** 两个源目录无 `.git`，不能伪造历史；必须先复制、记录 provenance/hash、验证，再用精确旧路径软链切换，禁止无校验覆盖。
2. **PACT Core 必须保持 Vima 无关。** Vima 只能从 capability/profile/adapter 层被选择，业务系统分析才允许选择 Starter；`AppSpec` 不能被包装成 FullStackSpec。
3. **版本/能力身份必须消歧。** workspace `@vima-tech/ui-admin@0.1.0` 有 `./agent`，Starter lock 中 registry `0.1.0` 是另一内容；兼容矩阵必须使用版本 + 内容哈希 + 发布状态，并在发布前安排真实 semver 变更。
4. **统一验证必须恢复为绿。** UI 运行时体积门当前失败；不得通过抬高阈值消音，必须减少运行时体积或恢复正确构建边界。
5. **统一工具默认只读/计划。** 发布默认 dry-run；外部 publish、任意目录写入、依赖脚本执行必须显式授权。Starter 的自动 `npm install` 不能成为 PACT/MCP 默认行为。
6. **产品身份和发布边界必须保持。** `@vima-tech/ui-admin`、`create-vima-starter`、PACT skills 仍是独立发布单元，单仓不等于单包。

### P1 · 纳入本轮治理或明确留债

1. 新增根级项目说明、Agent 约定、统一验证和 changed release plan 测试。
2. 能力注册表只能声明有证据的数据库/框架能力；不得把文档愿望当已实现能力。
3. Starter 的权限执行、生产 secrets/migration、导航单一真源、后端测试与全栈生成 adapter 是后续“业务系统稳定生成”深化项；本轮只在 capability readiness 中如实标记，不虚报 ready。

### P2 · 可后续打磨

1. 引入更重的 monorepo 工具、远程 MCP 服务或集中版本工具。
2. 历史 UI 示例视觉一致性与非迁移关键文档重排。

## 回流到 PACT

| 发现 | 回流到哪个锚点 | 已回流 |
|---|---|---|
| Core 不得依赖 Vima；Starter 仅业务系统候选 | `P2/P4/P5` + `A1/A2/A5` | ☑ |
| 无独立 Git 历史、需 provenance/hash 与旧路径兼容 | `P7` + `A2/A5` + `C1/C5` | ☑ |
| 同版本不同内容、发布前需 semver 消歧 | `P5` + `A5` + `C2/C4` + `T5 M0` | ☑ |
| UI runtime-size 门失败 | `P7` + `T2` + `T5 M0` | ☑ |
| 默认 dry-run、路径/命令白名单 | `P3/P5` + `A4` + `C3/C6` | ☑ |
| Starter 权限/测试/导航问题不可虚报 ready | `P6/P7` + capability registry + `T4/T6` | ☑ |

## 结论

可以进入规格编写，但冻结前必须把上述 6 个 P0 全部写入 `T5.M0`，并让每项具备自动验收命令。三阶段的完成定义是“治理契约可机检 + 产品迁入且旧路径兼容 + 发布编排可 dry-run 且所有现有硬门为绿”；不包含真实外部发布，也不把 Starter 尚未具备的全栈业务生成能力虚报为完成。
