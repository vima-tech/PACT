# PACT · PACT Platform 三阶段统一迁移

> **PACT = Product · Architecture · Contracts · Tests**
> 本文是本项目的单文件完备规格。此前不了解项目的人或 AI 只读本文即可实施；过程状态见 `action-graph.json`，编码约定见根 `CLAUDE.md`。

| 字段 | 值 |
|---|---|
| 创建日期 | 2026-08-11 |
| 更新日期 | 2026-08-11 |
| 状态 | 已冻结 · 2026-08-11 |
| 完备度档位 | full |
| 负责人 | renmengkai |

## 权威源优先级

| 冲突类型 | 权威源 |
|---|---|
| 需求、边界、完成定义 | 本文件；冻结后只能经 `/pact-change` 修改 |
| 实现与测试进度 | `action-graph.json` |
| 编码、构建、仓库惯例 | 根 `CLAUDE.md`，产品目录内更具体的 `AGENTS.md` 或 `CLAUDE.md` |
| 公开 UI 能力 | 构建生成的 `products/vima-ui-admin/dist/ai-manifest.json` |
| Starter 发布模板内容 | `templates/vima-starter/frontend`、`backend` 为真源，`cli/template` 为同步副本 |
| 本文与 `pact-book/` | 本文；后者只允许生成 |

---

# 第零部分 · Product

<!-- PACT:P1 -->
## P1 · 一句话定义与交付形态

把 PACT skills、`@vima-tech/ui-admin` 和 `create-vima-starter` 迁入同一个 PACT Platform Git 仓库统一治理、验证和发布编排，同时保持三者逻辑解耦与独立发布身份。交付形态是本地 Git monorepo 内的 skills、npm 组件库、全栈脚手架、JSON 治理契约及 Node/Shell CLI；由框架维护者在 Linux/macOS 开发机或 CI 部署，不新增常驻服务。

<!-- PACT:P2 -->
## P2 · 背景与问题

PACT 已能约束 Product、Architecture、Contracts、Tests 与施工闭环，但不知道有哪些工程创建能力；UI 框架只负责前端组件和受信 Builder；Starter 才持有 Vue + Spring Boot 业务系统宿主。三者分散导致版本兼容、选择条件、验证与发布没有单一真源，AI 容易在没有业务契约时生成看似完整的空壳。现在需要把“工程创建工具”统一管理，但若简单合成一个包，会让 PACT Core 硬依赖 Vima、破坏独立发布，并把 Starter 尚未具备的权限和测试能力虚报为可靠。本迁移因此同时完成治理层、物理 workspace 和发布编排三阶段。

<!-- PACT:P3 -->
## P3 · 用户与角色

| 角色 | 是谁 | 主要目标 | 数据可见范围 | 可执行的写操作 |
|---|---|---|---|---|
| 框架维护者 | 修改 PACT、adapter、产品源码的人 | 在统一仓库开发并验证 | 整个仓库及本地来源快照 | 修改源码与治理数据，不默认外部发布 |
| 发布维护者 | 决定版本和执行发布的人 | 得到准确 changed plan 与独立包 | release units、变更和验证报告 | 显式执行 pack；真实 publish 仍需人工授权 |
| AI Agent | 使用 PACT 分析并创建工程的代理 | 按需求选择最小能力组合 | 只读 capability/profile/compatibility 与项目物料 | 默认仅生成 plan；写入受路径与 overwrite 策略限制 |
| 生成项目维护者 | 接手 Starter 或 UI 产物的人 | 获得可构建、可追溯的工程 | 自己的生成项目 | 在生成项目内开发；不依赖 PACT 运行时 |

权限基调：仓库工具只操作当前仓库或显式输出目录；不持有 registry 凭据；真实发布不是自动流程。

<!-- PACT:P4 -->
## P4 · 核心场景

### S1 · 判断需求并选择工程能力
- **流程**：能力检查 `$ npm run platform:inspect` --读取结构化报告--> 治理验证 `$ npm run governance:check` --通过--> ✓ 得到 Delivery Profile 与 adapter 选择
- **回头路**：治理验证 --schema、兼容性或信息不足--> 能力检查
- **样本**：来源于用户本轮要求：只有分析到“业务系统开发”时才使用 Vima Starter；Vima UI Admin 也不是必选项
- **完成态**：同一输入得到确定、可解释、可机检的 profile 和候选能力，不会默认选 Starter

#### 能力检查 `$ npm run platform:inspect`
> 框架维护者或 Agent 在这里输入需求类别并读取选择理由。

- 能做什么
  - PACT Core 在不导入任何 Vima 源码的情况下读取能力注册表。 `R001`
  - 注册表分别描述 PACT、UI Admin、Starter 和两个 adapter 的能力、限制、版本与 readiness。 `R002`
  - Router 对通用规格工作选择 `generic`，对纯管理端界面选择 `admin-ui`，仅对完整业务系统选择 `business-system`。 `R003`
  - `admin-ui` 与 `business-system` profile 都把 Vima 能力视为可选依赖。 `R004`
- 什么情况会被拦住
  - 未知需求类别、schema 非法或能力未 ready 时返回结构化诊断且不生成工程。 `R005`
- 谁看得到什么
  - 所有角色都能看到能力与限制；只有维护者决定是否把 readiness 从 blocked 提升。 `R006`

#### 治理验证 `$ npm run governance:check`
> CI 和维护者在这里验证声明是否有证据、版本是否兼容。

- 能做什么
  - Schema 校验 capabilities、delivery profiles、adapter descriptors、compatibility、provenance 和 release units 六类治理 JSON。 `R007`
  - 兼容性使用包版本、内容哈希、公开契约版本和发布状态共同判断，不只比较 semver。 `R008`
  - 基准样例覆盖 generic、admin-ui、business-system 以及信息不足四类路由。 `R009`
- 背后自动发生了什么
  - Starter 权限、生产安全、测试与全栈生成尚未达标的事实被记录为限制，不能被输出成 ready 能力。 `R010`

### S2 · 将两个产品迁入统一仓库
- **流程**：导入检查 `$ npm run migration:verify` --哈希一致--> 产品构建 `$ npm run verify:products` --过渡验收后退役旧入口--> ✓ PACT 仓库成为唯一工程入口
- **回头路**：产品构建 --任一哈希或构建失败，保留原目录--> 导入检查
- **样本**：来源目录 `/home/renmk/projects/vima-ui-admin` 与 `/home/renmk/projects/vima-starter` 当前均无独立 `.git`
- **完成态**：产品真实目录仅位于 PACT 仓库，两个旧绝对路径均不存在，包名、CLI 名和产品级约定保持；`.pre-pact-20260811` 快照备份继续保留

#### 导入检查 `$ npm run migration:verify`
> 维护者核对导入来源、排除项和完整性。

- 能做什么
  - UI Admin 迁入 `products/vima-ui-admin`，Starter 迁入 `templates/vima-starter`。 `R011`
  - provenance 记录原绝对路径、导入时间、历史不可用事实、排除目录和规范化内容哈希。 `R012`
  - 导入快照只忽略契约列出的 8 个目录段，排除集合不可由调用方扩大；后续 bootstrap/build 产物不属于导入快照。 `R013`
- 什么情况会被拦住
  - 目标已有非预期内容、来源缺失或导入后哈希不同则失败，不覆盖、不删除来源。 `R014`

#### 产品构建 `$ npm run verify:products`
> 维护者在统一目录中运行各产品原有门禁。

- 能做什么
  - UI Admin 保持 `@vima-tech/ui-admin` 的公开入口和独立 npm 包。 `R015`
  - Starter 保持 `create-vima-starter` CLI、frontend/backend 真源和 `cli/template` 同步规则。 `R016`
  - 根级串行编排调用产品自己的 lockfile 和验证命令，不引入重型 monorepo 构建系统。 `R017`
- 背后自动发生了什么
  - 旧绝对路径先以软链完成过渡验收；在统一路径门禁通过后，精确退役两个软链接并进入不可回滚的 `finalized` 状态，备份仍保留。 `R018`

### S3 · 规划、验证并打包独立发布单元
- **流程**：变更计划 `$ npm run release:plan` --按受影响单元串行验证--> 发布预演 `$ npm run release:pack` --人工审核--> ✓ 得到本地 tarball 与发布命令
- **回头路**：发布预演 --验证或 pack 失败，不生成发布批准--> 变更计划；变更计划 --无变更--> ✓ 输出空计划并结束
- **样本**：修改 UI Agent 公开契约时，UI unit 必须发布新版本，兼容性验证需覆盖 Starter，但 Starter 是否发版由其文件是否变化决定
- **完成态**：只计划发生变化的发布单元，依赖影响可解释，默认不会连接 registry 发布

#### 变更计划 `$ npm run release:plan`
> 发布维护者在这里查看哪些独立单元需要验证、打包或升版。

- 能做什么
  - release unit 注册表分别定义 PACT skills、UI Admin 和 Starter CLI 的路径、版本源、验证与 pack 命令。 `R019`
  - changed-path 规则把 Git 变更稳定映射到直接受影响单元。 `R020`
  - 依赖传播把 UI 公开契约变化加入 Starter 兼容性验证，但不自动宣称 Starter 需要发布。 `R021`
  - 计划以稳定 JSON 和人读摘要输出，重复运行结果一致。 `R022`
- 什么情况会被拦住
  - 工作区基线不可判定、release unit schema 非法或同一文件归属冲突时失败。 `R023`

#### 发布预演 `$ npm run release:pack`
> 发布维护者在本地完成可发布性验证，不接触远程 registry。

- 能做什么
  - UI 执行 check:ai、typecheck、test、verify:publish 并通过 runtime-size 预算。 `R024`
  - Starter 执行 template check、前端 build check、Maven package 和 CLI 本地 pack。 `R025`
  - PACT 执行脚本自测、物料 lint、graph、trace、book check 与 skill pack 检查。 `R026`
- 什么情况会被拦住
  - 默认命令只允许生成本地 tarball；任何真实 publish、push 或凭据读取都必须由人另行显式执行。 `R027`

<!-- PACT:P5 -->
## P5 · 需求清单（R-ID）

| R-ID | 类型 | 描述（可判真假） | 验收标准（可量化） | 优先级 | 依赖 | 来源 | 假设 |
|---|---|---|---|---|---|---|---|
| R001 | 架构 | PACT Core 零 Vima 源码依赖 | Core 路径扫描无 Vima import，Core 自测可独立运行 | P0 | — | 用户+设计 | — |
| R002 | 数据 | 统一声明 3 个产品能力与 2 个 adapter | registry 恰有对应 5 个稳定 ID，均含限制/readiness | P0 | R001 | 设计 | — |
| R003 | 功能 | 按需求类别选择 3 种 profile | 4 个基准输入输出与期望完全一致 | P0 | R002 | 用户 | — |
| R004 | 架构 | Vima 在 profile 中均为可选 | 禁用 Vima 后 generic 仍通过；另两类返回可解释候选 | P0 | R003 | 用户 | — |
| R005 | 边界 | 非法或信息不足时拒绝生成 | 每类错误均返回非零码和稳定 code/path | P0 | R007 | UI 约定 | — |
| R006 | 治理 | readiness 变更必须显式且有证据 | validator 拒绝无 evidence 的 ready | P1 | R007 | 评估 | — |
| R007 | 数据 | 六类治理 JSON 全部有 schema 与校验器 | 合法 fixture 全过、每类非法 fixture 至少 1 个失败 | P0 | — | 设计 | — |
| R008 | 兼容 | 版本+哈希+契约版本+发布状态判兼容 | 同 semver 不同 hash fixture 被识别为冲突 | P0 | R007 | 评估 | — |
| R009 | 测试 | 路由基准覆盖四类输入 | 四类 fixture 全部自动断言 | P0 | R003 | 设计 | — |
| R010 | 真实性 | 不虚报 Starter 未完成能力 | registry 含 C1 固定的 4 个 Starter/adapter 限制 ID | P0 | R002 | 评估 | — |
| R011 | 迁移 | 两产品进入约定目录 | 两目录存在且源码清单与规范化来源一致 | P0 | R012 | 用户 | — |
| R012 | 追溯 | 记录来源与规范化哈希 | provenance schema 通过且字段完整 | P0 | — | 评估 | — |
| R013 | 边界 | 导入快照不包含闭集定义的可再生产目录 | link switch 前的 import manifest 对 8 个目录段零记录，调用方不能追加排除项 | P0 | R011 | 约定 | — |
| R014 | 安全 | 导入冲突时无覆盖无删除 | 冲突 fixture 失败且源/目标 hash 不变 | P0 | R012 | 评估 | — |
| R015 | 兼容 | UI 包身份与公开面保持 | package name 不变，exports 清单测试通过 | P0 | R011 | UI package | — |
| R016 | 兼容 | Starter CLI 身份和模板真源保持 | CLI name 不变且 `check:template` 通过 | P0 | R011 | Starter 约定 | — |
| R017 | 构建 | 根级串行编排各自门禁 | fixture 验证顺序/失败停止；产品迁入后同一命令跑真实门禁 | P0 | R007,R019 | 评估 | **采用轻量 Node 编排，不引入 Nx/Turbo** |
| R018 | 迁移 | 退役两个旧绝对路径入口 | `finalized` 后两路径均不存在（含 dangling symlink），两个 canonical target 与两份备份 hash 一致，统一路径产品门通过 | P0 | R011,R017 | 用户授权 | **只 unlink 已验证指向 canonical target 的两个精确软链接；不删除备份** |
| R019 | 发布 | 三个独立 release unit | registry 恰有 3 个 ID 且命令字段完整 | P0 | R007 | 用户 | — |
| R020 | 功能 | Git 路径映射直接影响单元 | fixture 的 added/modified/deleted 均映射正确 | P0 | R019 | 设计 | — |
| R021 | 兼容 | 依赖影响与发布影响分离 | UI 公开变更触发 Starter verify 但不强制 Starter release | P0 | R020 | 设计 | — |
| R022 | 数据 | release plan 稳定输出 JSON 与摘要 | 同输入两次输出字节一致 | P1 | R020 | 用户 | — |
| R023 | 边界 | 基线未知或归属冲突时失败 | 3 个失败 fixture 均非零退出 | P0 | R019 | 设计 | — |
| R024 | 质量 | UI 全部门禁通过且不抬 size 阈值 | 四命令 exit 0，预算配置未变宽 | P0 | R015 | AGENTS+评估 | — |
| R025 | 质量 | Starter 全部门禁与本地 pack 通过 | 4 类命令 exit 0，生成 CLI tgz 且无远程发布 | P0 | R016 | CLAUDE | — |
| R026 | 质量 | PACT Core 与物料全门禁通过 | self-test/check/review exit 0 | P0 | R001,R017 | PACT 协议 | — |
| R027 | 安全 | 真实外部发布默认不可达 | 根 scripts 无 publish/push/token 读取；仅生成 3 个本地归档 | P0 | R019 | 访谈 | — |

### 横切项检查

- [x] 权限/角色：仓库工具按 P3/C8 仅允许当前仓库与显式输出路径；无业务 RBAC。
- [x] 输入校验：R005、R007、R014、R023。
- [x] 错误处理/回滚/幂等：R014、R022；迁移采用复制验证后切换。
- [x] 破坏性操作二次确认：真实发布仍不可达；旧入口退役只在来源、目标、备份哈希和软链目标全部确认后，精确 unlink 两个软链接。
- [x] 分页/排序/性能：本地小规模 registry，无分页；T2 约束验证时长与确定性。
- [x] 审计/追溯：R008、R012、R022。
- [x] 敏感信息：不读取、不记录 registry token；见 R027。
- [x] 国际化/时区/单位：治理 JSON 使用 UTF-8，时间使用 RFC 3339 UTC，哈希字节单位；CLI 人读文案为中文。

### 覆盖声明

| 输入类别 | 已归类位置 |
|---|---|
| 用户关于可控业务生成、PACT 可选对接和三阶段迁移的指令 | R001–R010,R017–R027，P6 |
| PACT/UI/Starter 的现状代码与局部约定 | R011–R018,R024–R026，P7 |
| ClearWorks 失败复盘与整体设计 | R002–R010，A4，D006/D008，C11 |
| 8 项来源冲突 | D001–D008 |

以上输入已全部归类为 R001–R027、非目标、约束或风险；这是 S8 来源反扫的审计结论，不是运行时代码需要重新推导的条件。

<!-- PACT:P6 -->
## P6 · 非目标（明确不做）

- **不做**把三个发布物合成一个 npm 包——会破坏 PACT 独立性和使用者升级边界。
- **不做**真实 `npm publish`、Git push、PR 或远端发布——没有凭据与外部变更授权；本轮止于可审计 plan、verify 和本地归档。
- **不做**把 UI Admin 或 Starter 设为 PACT 必选依赖——用户明确要求按需求选择。
- **不做**完整 FullStackSpec/StarterAdapter 业务代码生成——本轮完成承载它们的治理与 adapter 边界；readiness 继续标 blocked/partial。
- **不做**在迁移中一次性修复 Starter 的 RBAC、生产 secrets、migration、三份导航真源与全部测试——这些需要独立 PACT 物料，当前只禁止虚报能力。
- **不做**引入 Nx、Turborepo 或常驻 MCP 服务——当前规模用确定性 Node/Shell 工具足够；多个远程客户端出现后再评估薄 MCP。
- **不做**伪造两个来源项目不存在的 Git 历史——使用 provenance 与内容哈希代偿。

<!-- PACT:P7 -->
## P7 · 约束

| 约束 | 类型 | 硬/倾向 | 说明 |
|---|---|---|---|
| PACT Core 不 import Vima | 架构 | 硬 | 依赖方向为 profile/adapter → products/core |
| 包名与 CLI 名保持 | 兼容 | 硬 | `@vima-tech/ui-admin`、`create-vima-starter`、PACT skills |
| UI 产品规则原样生效 | 质量 | 硬 | Manifest、Recipe、VIcon、四个命令，不执行不可信函数/脚本 |
| Starter 模板真源保持 | 质量 | 硬 | frontend/backend → cli/template 单向同步 |
| 两来源无独立 Git 历史 | 存量 | 硬 | 记录 snapshot provenance，不声称保留不存在的 history |
| PACT canonical 路径是唯一工程入口 | 兼容 | 硬 | `products/vima-ui-admin` 与 `templates/vima-starter` 可用；两个旧绝对路径在 finalized 后必须不存在 |
| UI runtime gzip 预算不得放宽 | 性能 | 硬 | 修根因，不修改 baseline 或 growth ratio 迁就实现 |
| 不接触真实发布凭据 | 安全 | 硬 | 根命令只 plan/verify/pack |
| 保留各自 lock/build 工具 | 工程 | 硬 | npm 与 Maven 并存，根级串行调用 |
| 现有用户未跟踪文件不修改 | 存量 | 硬 | `.playwright-mcp/` 与 `before-index.png` 不在本需求范围 |
| 开发连续推进至三阶段全绿 | 资源 | 倾向 | 不承诺外部 registry 上线 |
| 用户已授权冻结与施工 | 流程 | 硬 | 本轮“开始迁移，直到三阶段全部完成”即施工授权；S8 PASS 后直接冻结 |
| 依赖安装为显式 bootstrap | 环境 | 硬 | 导入不携带 node_modules；维护者先运行受信 lockfile 的 `npm run bootstrap`，inspect/plan/MCP 永不隐式安装 |

<!-- PACT:P8 -->
## P8 · 成功定义

- 6 类治理 JSON 均有 schema，合法/非法 fixture 自动测试全绿，Router 真值表零误选。
- 2 个产品真实目录位于 PACT 仓库，2 个旧路径均不存在，canonical target 与保留的来源快照哈希 100% 一致。
- 3 个独立 release unit 可由 changed plan 稳定识别；同输入连续两次 JSON 字节完全一致。
- UI、Starter、PACT 三套既有硬门和根级全量验证全部 exit 0；UI runtime-size 阈值未放宽。
- 本地 pack 产物可列出且无真实 publish/push；`pact-review.sh` 完成度 100%。

---

# 第一部分 · Architecture

<!-- PACT:A1 -->
## A1 · 系统边界与上下文

- **本系统负责**：PACT 规格/施工 Core；Vima 能力声明与选择；两个产品源码的统一承载；跨产品验证；变更到发布单元的确定性计划；本地 pack。
- **本系统不负责**：自然语言模型服务、registry/Git 托管、生成业务系统的运行时、企业业务权限实现、真实发布审批。

| 外部依赖 | 用途 | 凭据 | 失效行为 |
|---|---|---|---|
| Git | changed baseline 与版本管理 | 本地仓库，无远端凭据 | baseline 不可判定则 `E_BASELINE_UNKNOWN` |
| Node.js/npm | UI、CLI、治理脚本构建测试 | 依赖已锁定；publish token 不读取 | 缺失则对应 verify 失败 |
| Java 21/Maven | Starter backend 构建 | 无凭据 | 缺失则 Starter verify 失败 |
| 文件系统 | 产品迁移、软链、报告与 tarball | 当前用户权限 | 越界或冲突则拒绝，不部分写入 |

<!-- PACT:A2 -->
## A2 · 结构与模块职责

```text
pact/
  pact*/                         # PACT Core skills，保持现有发布布局
  platform/
    schemas/                     # governance JSON Schema
    registry/                    # capabilities, profiles, compatibility, release-units
    adapters/                    # ui-admin / vima-starter 描述与选择边界
    benchmarks/                  # router 与 release-plan fixtures
    scripts/                     # inspect/check/plan/verify/pack/migration 工具
    test/                        # 平台契约测试
  products/vima-ui-admin/        # 独立 npm 产品
  templates/vima-starter/        # 独立脚手架产品及发布模板
  .pact/pact-platform-unification/
```

| 目录/模块 | 职责 | 关联 R-ID |
|---|---|---|
| `pact/`、`pact-*` | 通用 PACT Core 与既有命令 | R001,R026 |
| `platform/registry` | 六类治理数据真源 | R002,R004,R006–R008,R019 |
| `platform/scripts/capability-router.mjs` | 确定性 profile 选择 | R003,R005,R009 |
| `platform/scripts/governance-check.mjs` | schema、证据、兼容性校验 | R006–R010 |
| `platform/scripts/release-plan.mjs` | Git paths → verify/release units | R020–R023 |
| `platform/scripts/verify-products.mjs` | 串行全量门禁 | R017,R024–R026 |
| `platform/scripts/migration-verify.mjs` | provenance、排除项、旧路径核验 | R011–R014,R018 |
| `products/vima-ui-admin` | UI 产品、Manifest、Agent Builder | R015,R024 |
| `templates/vima-starter` | 全栈宿主、CLI 与模板 | R016,R025 |

<!-- PACT:A3 -->
## A3 · 关键链路（端到端）

### 链路 1 · 能力选择

```text
kind + constraints → input schema → Capability Router → Delivery Profile
                                              ↓ readiness/compatibility 不满足
                                      diagnostics，不生成 ArtifactPlan
```

- 输入只归一化为受控枚举；Router 不做自然语言解析。
- Router 读取 JSON 注册表，不 import 产品运行时代码。
- 任何 unknown/blocked 都返回稳定 code/path 和非零退出码。

### 链路 2 · 快照迁移

```text
source → 闭集排除 → staging copy → normalized hash → target
                                                       ↓ 全绿
                                          原路径 rename 为备份 → symlink → realpath/verify
                                                       ↓ 统一入口复验
                                             unlink aliases → finalized
```

- 规范化哈希按 C3 的二进制 framing 计算；symlink 记录 link target，不跟随到范围外。
- 只有 staging 与 target hash 相等、产品验证通过后才切换旧路径；linked 过渡态失败可回滚。
- finalized 前必须再次验证 target、backup hash 与两个精确软链；成功后只退役 aliases，备份继续保留且不自动删除。

### 链路 3 · 发布预演

```text
git diff names → direct owners → compatibility propagation → stable plan.json
                                                           → serial verify → three local archives
```

- direct release 与 verification impact 分开计算。
- JSON 对 key 和数组排序；不包含当前时间等非确定字段。
- pack 输出仅进忽略目录 `artifacts/release/`，根脚本不存在 publish/push。

<!-- PACT:A4 -->
## A4 · 设计原则（本项目的硬规矩）

1. **治理与实现分层**：PACT Core 永远不知道 Vima；adapter 只通过版本化契约引用产品。
2. **选择最小能力**：默认 generic；只有证据表明是业务系统才候选 Starter，候选不等于 ready。
3. **声明必须有证据**：capability/readiness/compatibility 都带可机检 evidence path 与 hash。
4. **计划先于写入**：inspect、release plan、migration plan/verify 只读；唯一写入口 `migration:apply` 需显式调用，冲突失败、不猜测、不覆盖。
5. **独立产品，统一门禁**：产品保留包名、版本源、lock 和原生命令；根只串行编排。
6. **确定性**：同一输入与同一工作树产生字节一致 JSON；错误使用稳定 code/path。
7. **安全默认值**：不读取 publish token，不执行外部模板脚本，不允许路径逃逸，不默认安装依赖。
8. **不虚报能力**：现有 Starter 只能标记实际证据支持的能力；缺权限/测试/生产门即 partial/blocked。

<!-- PACT:A5 -->
## A5 · 决策记录（D-ID）

#### D001 · 同仓还是单包
- **选项**：A. 保持三仓 / B. 同仓单包 / C. 同仓独立包
- **结论**：采 C，同一 Git 仓库分层管理，保持三个 release unit。
- **理由**：统一 changed plan 与兼容矩阵需要共享版本视图，但用户仍需独立安装 PACT、UI 或 Starter；单包会把不相关依赖带给所有用户。
- **已否决**：A——继续缺少兼容与发布真源；B——破坏独立升级边界并让 Core 依赖产品。
- **影响**：R001,R015,R016,R019

#### D002 · 没有来源 Git 历史时的导入方式
- **选项**：A. 伪造 subtree 历史 / B. 当前快照加 provenance/hash / C. 阻塞迁移
- **结论**：采 B。
- **理由**：两个来源确实无 `.git`；可验证快照能忠实说明事实并支持完整性检查，伪造提交会制造错误审计结论。
- **已否决**：A——历史不真实；C——用户已授权迁移且当前快照足以继续。
- **影响**：R011–R014

#### D003 · 同版本不同 UI 内容的处理
- **选项**：A. 只看 `0.1.0` / B. 版本加内容哈希、契约版本和发布状态 / C. 删除 Agent 入口
- **结论**：采 B，并把 workspace 内容标为未发布变更，发布计划要求新 semver 后才允许发布。
- **理由**：Starter lock 的 registry 0.1.0 与 workspace 0.1.0 公开面不同；只看版本会产生假兼容，删除新能力又倒退。
- **已否决**：A——已被现状反例证伪；C——违背受控生成方向。
- **影响**：R008,R015,R021,R024

#### D004 · 根级构建编排
- **选项**：A. Nx/Turbo / B. 轻量 Node 串行编排 / C. 文档列手工命令
- **结论**：采 B。
- **理由**：只有三个发布单元且 npm/Maven 混合；Node 足以提供稳定顺序、失败传播和 JSON 报告，不新增大规模缓存与配置面。
- **已否决**：A——当前收益不足以抵消工具迁移；C——无法形成可执行门禁。
- **影响**：R017,R024–R026

#### D005 · 旧路径兼容
- **选项**：A. 立即失效 / B. 永久复制双写 / C. 原路径软链到新真源
- **结论**：迁移过渡期采 C，并保留只读备份；统一入口验收完成后，本决策的“持续兼容”部分已被 D009 取代。
- **理由**：软链让旧工具与新仓共享同一内容，不产生第二真源；用户环境明确是本机路径。
- **已否决**：A——破坏既有工作流；B——必然漂移。
- **影响**：R014,R018

#### D006 · Starter 的选择时机
- **选项**：A. 所有 PACT 项目默认使用 / B. 仅业务系统分析结果候选 / C. 从不自动选择
- **结论**：采 B；必须同时满足 `kind=business-system` 和 readiness/compatibility 条件。
- **理由**：这是用户明确边界，既保留快速创建业务系统的价值，又不让通用规格任务被技术栈绑架。
- **已否决**：A——过度耦合；C——失去能力路由价值。
- **影响**：R003–R005,R010

#### D007 · 发布自动化边界
- **选项**：A. 自动 publish / B. plan+verify+本地归档，人工执行发布 / C. 只写发布文档
- **结论**：采 B。
- **理由**：本轮没有远端凭据授权，但仍可把发布前所有确定性工作自动化并产出可审计命令。
- **已否决**：A——越权且有供应链风险；C——无法验证 tarball 内容。
- **影响**：R019–R027

#### D008 · Starter 深层技术债是否纳入迁移
- **选项**：A. 全部修复 / B. 全部忽略并标 ready / C. 如实登记限制，仅修迁移门阻断
- **结论**：采 C。
- **理由**：RBAC、迁移脚本、生产配置与 FullStackSpec 是独立产品改造；强塞本轮会失控，忽略又会重演不靠谱生成。
- **已否决**：A——范围不可控且没有对应业务规格；B——违反可靠性目标。
- **影响**：R002,R006,R010,R025

#### D009 · 统一入口验收后的旧别名退役
- **选项**：A. 永久保留软链接 / B. 验证 canonical target 与备份后删除软链接 / C. 把产品移回旧路径
- **结论**：采 B；`linked` 是可回滚过渡态，`finalized` 是 canonical-only 完成态。只删除两个精确软链接，`.vima-*.pre-pact-20260811` 快照不在本变更删除范围。
- **理由**：用户已决定直接用 PACT 管理两个工程；永久别名会继续制造工作区身份歧义、工具 cwd 漂移和错误的双入口心智模型。canonical target、产品门和快照 hash 已提供独立完整性证据。
- **已否决**：A——保留长期歧义且违背唯一入口目标；C——逆转已经验收的统一迁移。
- **影响**：R012,R014,R018,R026

<!-- PACT:A6 -->
## A6 · 风险与缓解

| 风险 | 触发信号 | 影响 | 缓解手段 |
|---|---|---|---|
| 迁移覆盖用户文件 | target 非空或 hash 异常 | 数据不可逆丢失 | staging copy、冲突即停、保留来源备份、禁止自动删除 |
| 软链工具兼容差 | realpath 或产品命令失败 | 旧工作流中断 | 双路径 smoke；失败回滚 rename |
| UI 构建并发污染 dist | 并发验证出现随机 size | 假红/假绿 | 根编排强制串行，单产品命令不并发 |
| npm/Maven 网络不可用 | dependency resolution 失败 | 新安装无法验证 | 优先使用现有 lock/cache；报告环境阻断，不跳过门禁 |
| Starter 被误选为可靠全栈生成器 | readiness 与证据不一致 | 再次生成空壳系统 | governance validator 强制 evidence，限制写入 registry |
| release plan 漏传播 | UI public contract 变更只测 UI | Starter 兼容破坏 | direct/verification 两集合 + fixture |

---

# 第二部分 · Contracts

<!-- PACT:C1 -->
## C1 · 数据模型

### 六类治理文档

| 文档 | 固定路径 | 职责 |
|---|---|---|
| capabilities | `platform/registry/capabilities.v1.json` | 产品/Core 能力、限制、readiness |
| delivery profiles | `platform/registry/delivery-profiles.v1.json` | 需求类别与 required/optional 能力 |
| adapters | `platform/registry/adapters.v1.json` | adapter 消费/提供契约及适用类别 |
| compatibility | `platform/registry/compatibility.v1.json` | consumer/provider 兼容关系 |
| provenance | `platform/registry/provenance.v1.json` | 两个导入快照与备份事实 |
| release units | `platform/registry/release-units.v1.json` | 直接发布归属、验证传播与命令 |

### `capabilities.v1.json`
| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `version` | literal `1` | 是 | schema 版本 |
| `capabilities` | array | 是 | 按 `id` 升序，ID 唯一 |
| `capabilities[].id` | enum | 是 | `pact-core`,`vima-ui-admin`,`vima-starter`,`ui-admin-adapter`,`vima-starter-adapter` |
| `kind` | enum | 是 | `core`,`product`,`adapter` |
| `supports` | string[] | 是 | 只允许下述闭集 |
| `limitations` | enum[] | 是 | 只允许下述稳定 ID 闭集；无已知限制写 `none-evidenced` |
| `readiness` | enum | 是 | `ready`,`partial`,`blocked` |
| `evidence` | object[] | 是 | 每项含 repo-relative `path` 与 64-char `sha256`，至少 1 项且匹配 |

`supports` 允许值：`pact-specification`、`action-graph`、`vue3-admin-ui`、`ui-artifact-plan`、`spring-boot-host`、`starter-cli`、`ui-admin-adaptation`、`starter-host-adaptation`。

`limitations` 允许值：`none-evidenced`、`standalone-ui-only`、`business-contracts-not-included`、`no-business-data-adapter`、`backend-business-permission-enforcement-missing`、`production-secret-migration-hardening-missing`、`backend-test-baseline-missing`、`full-stack-spec-adapter-not-implemented`。

### `delivery-profiles.v1.json`
| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `id` | enum | 是 | `generic`,`admin-ui`,`business-system` |
| `matchKind` | 同 ID enum | 是 | 与 `id` 相同 |
| `requiredCapabilities` | ID[] | 是 | 三者均含 `pact-core` |
| `optionalCapabilities` | ID[] | 是 | generic 为空；admin-ui 为 UI product+adapter；business-system 为 UI/Starter products+两个 adapters |
| `requiredChecks` | string[] | 是 | 只能引用 release unit 中存在的 check ID |

### `adapters.v1.json`
| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `id` | enum | 是 | `ui-admin-adapter`,`vima-starter-adapter` |
| `applicableKinds` | enum[] | 是 | UI 仅 admin/business；Starter 仅 business |
| `consumes`,`provides` | support ID[] | 是 | 只能引用 `supports` 允许值闭集；consumes 必须由 required capability 或 Core 提供 |
| `contractVersion` | string | 是 | UI 为 `app-spec.v1`；Starter 为 `full-stack-spec.v1-draft` |
| `readiness` | Readiness | 是 | 与 capability entry 一致 |
| `requiredCapabilities` | ID[] | 是 | 选择 adapter 时一并选择的产品能力 |
| `evidence` | object[] | 是 | 每项含 `path`,`sha256` 且匹配 |

### `compatibility.v1.json`
| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `consumer`,`provider` | capability ID | 是 | 不得相同 |
| `consumerVersion`,`providerVersion` | semver | 是 | 来自各自版本源 |
| `providerContentSha256` | 64-char hex | 是 | 规范化公开契约 hash |
| `contractVersion` | string | 是 | 如 `app-spec.v1` |
| `releaseStatus` | enum | 是 | `published`,`unpublished-changes`,`blocked` |
| `status` | enum | 是 | `compatible`,`verify-required`,`incompatible` |
| `evidence` | object[] | 是 | 每项含 `path`,`sha256` 且匹配 |

### `provenance.v1.json`
| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `originalPath`,`snapshotPath`,`targetPath` | path | 是 | planned 时 snapshot=original；linked/finalized 时 snapshot=backup；target 不可逃逸 repo |
| `phase` | enum | 是 | `planned`、`linked` 或 `finalized` |
| `importedAt` | RFC 3339 UTC/null | 是 | planned 为 null；linked/finalized 为真实时间，不进入确定性 plan |
| `retiredAt` | RFC 3339 UTC/null | 是 | 仅 finalized 为真实时间；planned/linked 为 null |
| `historyAvailable` | boolean | 是 | 两产品均为 false |
| `excludedSegments` | string[] | 是 | 必须恰等于 C3 的 8 项闭集，不能增删 |
| `normalizedSha256` | 64-char hex | 是 | 按 C3 算法 |
| `backupPath` | absolute path | 是 | planned 时为计划值；linked/finalized 时必须存在且等于 snapshotPath |

### `release-units.v1.json`
| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `id` | enum | 是 | `pact-skills`,`vima-ui-admin`,`vima-starter` |
| `paths` | glob[] | 是 | 直接归属不可重叠，shared 规则除外 |
| `versionSource` | path | 是 | 文件存在；PACT 可使用 changelog 版本策略 |
| `verify` | object[] | 是 | 每项有 ID 与 argv 数组，首程序仅 node/npm/bash/mvn |
| `pack` | object[] | 是 | 不得包含 publish/push |
| `verifyDependents` | ID[] | 是 | 可空，必须无环 |

| release unit | `versionSource` | verify check IDs | pack |
|---|---|---|---|
| `pact-skills` | 根 `package.json#version` | `pact-self-test`,`pact-material-check` | deterministic tar.gz |
| `vima-ui-admin` | `products/vima-ui-admin/package.json#version` | `ui-check-ai`,`ui-typecheck`,`ui-test`,`ui-verify-publish` | `npm pack` tgz |
| `vima-starter` | `templates/vima-starter/cli/package.json#version` | `starter-template`,`starter-frontend`,`starter-backend`,`starter-cli-pack` | `npm pack` tgz |

### Router 真值表

输入的 `preferredCapabilities` 缺省为空，表示只返回候选而不自动采用 Vima。

| kind | preferred | adapter 状态/兼容 | selected | candidates | 结果 |
|---|---|---|---|---|---|
| generic | 空 | 任意 | `pact-core` | 空 | ok |
| generic | 任一 Vima | 任意 | 空 | 空 | `E_CAPABILITY_NOT_APPLICABLE` |
| admin-ui | 空 | 任意 | `pact-core` | `ui-admin-adapter` | ok |
| admin-ui | `ui-admin-adapter` | ready+compatible | `pact-core`,`vima-ui-admin`,`ui-admin-adapter` | 空 | ok |
| business-system | 空 | 任意 | `pact-core` | `vima-starter-adapter`,`ui-admin-adapter` | ok |
| business-system | `ui-admin-adapter` | ready+compatible | `pact-core`,`vima-ui-admin`,`ui-admin-adapter` | `vima-starter-adapter` | ok |
| business-system | `vima-starter-adapter` | ready+compatible | `pact-core`,`vima-ui-admin`,`vima-starter`,`vima-starter-adapter` | `ui-admin-adapter` | ok |
| business-system | 两个 adapters | 都 ready+compatible | `pact-core`,`vima-ui-admin`,`vima-starter`,`ui-admin-adapter`,`vima-starter-adapter` | 空 | ok |
| admin/business | 适用 adapter | partial/blocked/incompatible | `pact-core` | 该 adapter | `E_CAPABILITY_BLOCKED` 或 `E_COMPATIBILITY` |
| unknown | 任意 | 任意 | 空 | 空 | `E_REQUIREMENT_INCOMPLETE` |

### 迁移完成时的初始治理值

| capability | readiness | supports | limitations | 固定 evidence path |
|---|---|---|---|---|
| `pact-core` | ready | `pact-specification`,`action-graph` | `none-evidenced` | `pact/SKILL.md` |
| `vima-ui-admin` | ready | `vue3-admin-ui`,`ui-artifact-plan` | `business-contracts-not-included` | `products/vima-ui-admin/package.json`,`products/vima-ui-admin/dist/ai-manifest.json` |
| `vima-starter` | partial | `spring-boot-host`,`starter-cli` | `backend-business-permission-enforcement-missing`,`production-secret-migration-hardening-missing`,`backend-test-baseline-missing` | `templates/vima-starter/package.json`,`templates/vima-starter/backend/src/main/java/com/vima/starter/config/SecurityConfig.java` |
| `ui-admin-adapter` | ready | `ui-admin-adaptation` | `standalone-ui-only`,`no-business-data-adapter` | `products/vima-ui-admin/src/agent/builders.ts` |
| `vima-starter-adapter` | blocked | `starter-host-adaptation` | `full-stack-spec-adapter-not-implemented`,`backend-business-permission-enforcement-missing`,`production-secret-migration-hardening-missing`,`backend-test-baseline-missing` | `platform/adapters/vima-starter-adapter.md` |

| adapter | consumes | provides | requiredCapabilities |
|---|---|---|---|
| `ui-admin-adapter` | `pact-specification`,`ui-artifact-plan` | `ui-admin-adaptation` | `vima-ui-admin` |
| `vima-starter-adapter` | `pact-specification`,`vue3-admin-ui`,`spring-boot-host` | `starter-host-adaptation` | `vima-ui-admin`,`vima-starter` |

| profile | requiredChecks 精确集合 |
|---|---|
| `generic` | `pact-self-test`,`pact-material-check` |
| `admin-ui` | generic 两项 + `ui-check-ai`,`ui-typecheck`,`ui-test`,`ui-verify-publish` |
| `business-system` | admin-ui 六项 + `starter-template`,`starter-frontend`,`starter-backend`,`starter-cli-pack` |

兼容矩阵初始记录固定为：`ui-admin-adapter@1.0.0 → vima-ui-admin@0.1.0` 为 `compatible/unpublished-changes/app-spec.v1`；`vima-starter@1.0.0 → vima-ui-admin@0.1.0` 为 `verify-required/unpublished-changes/app-spec.v1`；`vima-starter-adapter@0.1.0-draft → vima-starter@1.0.0` 为 `incompatible/blocked/full-stack-spec.v1-draft`。所有 hash 在导入后由确定性工具计算并写入，不允许手填占位值。

Router 通用规则：只接受去重后的 adapter ID 作为 preferred；先校验每项属于 profile.optionalCapabilities，再展开其 requiredCapabilities；任一 preferred 不是 ready+compatible 时，`selected` 只保留 profile.requiredCapabilities，失败项留在 candidates 并返回对应错误；全部满足时 selected 为 required + preferred + 展开依赖的字典序集合，candidates 为该 profile 中未 preferred 的适用 adapter。多 preferred 因此不靠额外猜测。

<!-- PACT:C2 -->
## C2 · 枚举与状态机

### `Readiness`
| 值 | 含义 | 进入条件 |
|---|---|---|
| `blocked` | 不允许生成 | 缺硬契约、验证失败或兼容冲突 |
| `partial` | 只能展示/规划，不宣称完整 | 有能力但 limitations 非空且缺交付门 |
| `ready` | 可用于对应 profile | evidence 全存在且 profile requiredChecks 全过 |

### 迁移状态机
| 当前状态 \ 事件 | inspect | copy | verify | switch-links | retire-aliases | rollback |
|---|---|---|---|---|---|---|
| `source` | → inspected | ✗ | ✗ | ✗ | ✗ | ✗ |
| `inspected` | → inspected | → staged | ✗ | ✗ | ✗ | ✗ |
| `staged` | ✗ | → staged | → verified 或 failed | ✗ | ✗ | → source |
| `verified` | ✗ | ✗ | → verified | → linked | ✗ | → source |
| `linked` | ✗ | ✗ | → linked | ✗ | → finalized | → source |
| `finalized` | ✗ | ✗ | → finalized | ✗ | → finalized | ✗ |
| `failed` | ✗ | ✗ | ✗ | ✗ | ✗ | → source |

非法迁移返回 `E_INVALID_TRANSITION`，不改变文件系统。

状态持久化在被 `.gitignore` 排除的 `artifacts/migration/state.v1.json`；每次状态变更先写同目录临时文件、`fsync` 后原子 rename。`migration:plan` 只读并输出计划；`migration:apply` 是唯一迁移写入口，分 staged、linked、finalized 三次显式推进；`migration:verify` 只读复算 hash、入口状态和产品身份。staging 固定为 `artifacts/migration/staging/{vima-ui-admin|vima-starter}`，备份固定为 `/home/renmk/projects/.vima-ui-admin.pre-pact-20260811` 与 `/home/renmk/projects/.vima-starter.pre-pact-20260811`。中断后按 state 处理：`staged/verified` 可重入继续，`linked` 可验证、回滚或 finalize，`finalized` 只允许幂等验证且不得 rollback，`failed` 只能显式 `--rollback`。planned phase 的 `snapshotPath=originalPath`；linked/finalized phase 的 `snapshotPath=backupPath`，snapshot 与 target hash 均须等于 provenance。linked 另要求 `realpath(originalPath)=realpath(targetPath)`；finalized 则要求 originalPath 不存在（`lstat` 也必须 ENOENT）。

分段协议：① `migration:apply --plan artifacts/migration/plan.v1.json --until staged` 复制到固定 staging，生成 import manifest 并校验 hash；目标不存在时再把 staging 原子 rename 为 target（目标已有同 hash 时删除本次空 staging 并复用目标），此刻 `staged` 的精确定义是 target 已就位、staging 不存在、旧入口仍是原目录；不安装依赖、不切旧路径。② 维护者显式运行 `npm run bootstrap`；③ `npm run verify:products -- --report artifacts/migration/product-verification.v1.json` 串行验证并记录 `targetSha256`、固定 check IDs、退出码与 `passed`；④ `migration:apply --plan ... --until linked --verification-report ...` 先确认 report 的 target hash 等于当前 target、全部固定 checks 通过，将状态推进 verified，随后 rename 原目录为 backup 并创建软链，推进 linked。⑤ 重新运行步骤③生成绑定当前 target hash 的报告；`migration:apply --plan ... --until finalized --verification-report ...` 仅接受两个条目均为 linked：在任何 unlink 前一次性验证报告、target/snapshot hash、backup 存在，并要求 `lstat(originalPath).isSymbolicLink()` 且 `readlink(originalPath)` 的字节文本严格等于 plan 的绝对 `targetAbsolute`（不接受相对链接、中间链接或仅 realpath 相等）。全部通过后才按 journal 协议退役两个入口；成功后 `phase=finalized`、写同一 `retiredAt`，两个 old path 均须 lstat ENOENT。缺报告、报告失败、hash 不一致或入口身份不符均失败且不得修改入口。

finalize 的单写与崩溃恢复协议：所有迁移写命令先以 `open(...,'wx')` 独占 `artifacts/migration/write.lock`，锁覆盖最终一次 link identity 复核、unlink、元数据提交和恢复；同工具并发调用稳定返回 `E_INVALID_TRANSITION`。锁存在时不自动猜测 stale；只有显式 `migration:apply --recover-finalize` 可在维护者确认原进程已结束后接管。unlink 前原子写 `finalize-journal.v1.json`，其中固定 plan hash、同一 `retiredAt`、两个 `{id,originalPath,targetAbsolute,linkText}` 和 `status=prepared`；每次 unlink 后原子更新 `removedIds`。若普通异常发生且 provenance 仍 linked，按 journal 为所有 lstat ENOENT 的入口重建绝对软链，写 state=linked，再删除 journal；遇到普通文件、目录或 linkText 不同则 `E_MIGRATION_CONFLICT`，绝不覆盖。若进程崩溃，显式 recover 根据磁盘而非 `removedIds` 复核：provenance 全 linked 时恢复缺失 aliases；provenance 全 finalized 时要求 aliases 全不存在、复核 hash 并补写 state=finalized；混合 provenance、未知入口或 hash 不一致均停住人工审阅。正常提交顺序固定为：unlink 两项 → 复核 aliases 缺失及 target/backup hash → 原子写全部 finalized provenance → 原子写 finalized state → 删除 journal → 释放锁。这样 provenance 是 commit point；其前崩溃回 linked，其后崩溃只补齐 finalized state。

finalize 成功后再以 canonical 路径运行一次全量产品门作为交付证据；该门失败不会改变已提交的迁移 phase，也不得复活旧入口，因为别名退役不改变 target 内容。此时 S10 保持未完成并在 canonical target 上前向修复，直至产品门通过。`migration:verify` 只验证结构与 hash，不把历史产品报告冒充当前构建结果。

目标冲突判定：目标不存在时可 staging copy；目标是目录且规范化 hash 与来源相同则视为幂等已有；其他情况一律 `E_MIGRATION_CONFLICT`。备份路径不存在才允许 link switch；若备份已存在但不等于 provenance 中记录的 source hash，也按冲突处理。

<!-- PACT:C3 -->
## C3 · 不变量与数据铁律

| INV-ID | 断言 | 违反后果 | 对应检查 |
|---|---|---|---|
| INV-1 | PACT Core 源码不 import/reference Vima 产品路径 | Core 失去通用性 | boundary test |
| INV-2 | 同一 capability 身份由 version+hash+contractVersion+releaseStatus 决定 | 假兼容 | compatibility fixture |
| INV-3 | `kind!=business-system` 时 Starter 不得进入 selected | 技术栈误选 | router benchmark |
| INV-4 | target hash 未验证前旧路径不得切换 | 数据丢失 | migration conflict test |
| INV-5 | package/CLI identity 在迁移前后不变 | 下游破坏 | identity test |
| INV-6 | release direct units 与 verify units 分开保存 | 无谓发版或漏测 | release-plan fixture |
| INV-7 | 根级发布命令不含 publish、push、registry token | 越权外部变更 | static command scan |
| INV-8 | UI runtime budget baseline/growth 不因迁移放宽 | 质量门失真 | budget snapshot test |
| INV-9 | finalized 时 canonical target 与 backup hash 一致，两个 old alias 均 lstat 不存在，且不存在未处理 finalize journal | 双入口复活或来源丢失 | finalized migration/recovery test |

### 规范化树哈希算法

1. 排除任意路径段名称恰为：`node_modules`、`dist`、`dist-site`、`target`、`reports`、`.vite`、`.qoder`、`.playwright-mcp`；闭集不可由 CLI 覆盖。
2. 只记录 regular file 与 symlink，目录隐含；相对路径转 POSIX `/`、Unicode NFC，拒绝无法稳定编码的路径、绝对 symlink 或逃逸 symlink；权限位与 mtime 不入 hash。
3. 按规范化路径 UTF-8 字节升序。每条记录为：1 byte 类型（`0x66` file / `0x6c` link）+ 4 byte big-endian 路径字节长度 + 路径 UTF-8 + 8 byte big-endian 内容长度 + 内容。file 内容为原始 bytes；link 内容为 link target 的 UTF-8 bytes。
4. 依次送入 SHA-256，输出小写 64 位 hex。目标的同一算法结果必须与 provenance 相等。

`migration:apply` 在 bootstrap/build 之前生成 `artifacts/migration/import-manifest.v1.json`，逐项记录实际复制的规范化相对路径并断言其中不含上述 8 个目录段。R013 只验该不可变 import manifest 与 link-switch 前 staging；bootstrap 后出现的 `node_modules`、`dist`、`target` 是验证产物，由 `.gitignore` 和清理规则管理，不反向计入导入快照。

<!-- PACT:C4 -->
## C4 · 对外接口契约

### `platform:inspect`

**输入**
```json
{"version":"1","kind":"business-system","constraints":{"frontend":"vue3","backend":"spring-boot"}}
```

| 字段 | 类型 | 必填 | 校验 |
|---|---|---|---|
| `version` | literal `1` | 是 | 其他版本拒绝 |
| `kind` | enum | 是 | `generic`,`admin-ui`,`business-system`,`unknown` |
| `constraints` | object | 否 | 仅允许 `frontend`,`backend` 字符串键，未知键拒绝 |
| `preferredCapabilities` | capability ID[] | 否 | 缺省空；必须符合 C1 Router 真值表 |

**成功输出**
```json
{"ok":true,"profile":"business-system","selected":["pact-core"],"candidates":["ui-admin-adapter","vima-starter-adapter"],"diagnostics":[]}
```

**失败输出**
```json
{"ok":false,"profile":null,"selected":[],"candidates":[],"diagnostics":[{"code":"E_REQUIREMENT_INCOMPLETE","path":"kind","message":"需求类别不足，不能选择工程模板"}]}
```

### `release:plan`

**CLI**：`npm run release:plan -- --base <git-ref> [--json <path>]`

**输出**
```json
{"version":"1","base":"HEAD^","directReleaseUnits":["vima-ui-admin"],"verificationUnits":["vima-ui-admin","vima-starter"],"reasons":{"vima-starter":["verify-dependent:vima-ui-admin"]}}
```

| 错误情形 | 错误码 | 退出码 | 行为 |
|---|---|---:|---|
| 输入 schema 非法 | `E_SCHEMA` | 2 | 输出 diagnostics，不写 plan |
| capability blocked | `E_CAPABILITY_BLOCKED` | 3 | 不生成工程计划 |
| Git baseline 不存在 | `E_BASELINE_UNKNOWN` | 4 | 不猜测全量或空集 |
| 文件归属冲突 | `E_PATH_OWNERSHIP` | 5 | 列出冲突 unit/path |
| 迁移冲突 | `E_MIGRATION_CONFLICT` | 6 | 源/目标均保持原样 |

Git 变更集合固定为四者并集并去重：`git diff --name-status --find-renames <base>...HEAD`、`git diff --cached --name-status --find-renames`、`git diff --name-status --find-renames`、`git ls-files --others --exclude-standard`。rename 的旧/新路径都参与归属，delete 使用旧路径。归属表：`pact/**` 与 `pact-*/**` 直接发布 `pact-skills`；`products/vima-ui-admin/**` 直接发布 UI；`templates/vima-starter/**` 直接发布 Starter；`platform/**`、根 `package*.json`、`README.md`、`CLAUDE.md`、`.gitignore` 不直接发布但验证三单元；`.pact/**` 只验证 PACT；`artifacts/**` 忽略。任一路径命中两个直接规则即 `E_PATH_OWNERSHIP`。

<!-- PACT:C5 -->
## C5 · 内部模块接口

```ts
type Diagnostic = { code: string; path: string; message: string };
type InspectResult = { ok: boolean; profile: string | null; selected: string[]; candidates: string[]; diagnostics: Diagnostic[] };
validateDocument(schemaId: string, input: unknown): { ok: boolean; diagnostics: Diagnostic[] };
routeCapability(input: InspectInput, registry: Registry): InspectResult;
normalizedTreeHash(root: string): string;
planRelease(changedPaths: string[], units: ReleaseUnit[]): ReleasePlan;
runSerial(checks: CommandSpec[]): Promise<CheckReport>;
planMigration(): MigrationPlan;
applyMigration(planPath: string): Promise<MigrationState>;
```

| 接口 | 副作用 | 责任边界 |
|---|---|---|
| `validateDocument` | 无 | validator 负责稳定 code/path，不修输入 |
| `routeCapability` | 无 | router 只选择，不生成文件 |
| `normalizedTreeHash` | 只读 | 不跟随越界 symlink |
| `planRelease` | 无 | caller 提供已排序 paths，函数仍规范化排序 |
| `runSerial` | 执行白名单命令 | 首个失败停止，收集 stdout/stderr 摘要 |
| `planMigration` | 默认无；指定 output 仅写 artifact | 不改变 source/target/link |
| `applyMigration` | staging/target/backup/link-retirement/state | 只接受 repo 内 plan，按 C2 可重入；finalized 不可 rollback |

### 精确命令入口

| 根命令 | 副作用 |
|---|---|
| `npm run bootstrap` | 显式执行 UI `npm ci`、Starter 根 `npm ci`；只信任入库 lock/package scripts，不由 inspect/plan 自动调用 |
| `npm run migration:plan` | 只读，生成 stdout JSON；显式 `--output` 才写 repo 内 plan 文件 |
| `npm run migration:apply -- --plan artifacts/migration/plan.v1.json --until staged` | staging 复制/校验后原子就位 target、写 import manifest 并暂停；不 bootstrap、不切链 |
| `npm run verify:products -- --report artifacts/migration/product-verification.v1.json` | 对 target 串行跑固定 checks 并写绑定 target hash 的报告 |
| `npm run migration:apply -- --plan artifacts/migration/plan.v1.json --until linked --verification-report artifacts/migration/product-verification.v1.json` | 校验报告后才备份原目录并切软链 |
| `npm run migration:apply -- --plan artifacts/migration/plan.v1.json --until finalized --verification-report artifacts/migration/product-verification.v1.json` | 预检新鲜产品报告、两个精确绝对软链、target 与 backup hash 后按 journal 协议退役旧入口；保留备份 |
| `npm run migration:apply -- --recover-finalize` | 仅用于崩溃遗留 lock/journal；按 C2 commit point 恢复 linked 或补齐 finalized，不接受任意路径参数 |
| `npm run migration:verify` | 只读 hash/identity/入口 phase 检查；linked 验 realpath，finalized 验 old path 不存在 |
| `npm run release:pack` | 依次生成 `pact-skills-<version>.tar.gz`、`vima-tech-ui-admin-<version>.tgz`、`create-vima-starter-<version>.tgz` 到 `artifacts/release/` |

PACT 归档用 `tar` 固定排序、mtime=`2026-08-11T00:00:00Z`、uid/gid=0；UI 与 Starter 分别执行 `npm pack --pack-destination <absolute artifacts/release>`，生成真实 tgz 而非 dry-run。pack 可以读取本地依赖和 npm 配置，但禁止任何 registry publish、Git push 或远端状态写操作。

<!-- PACT:C6 -->
## C6 · 错误码与错误语义

| 错误码 | 含义 | 用户文案 | 调用方动作 |
|---|---|---|---|
| `E_SCHEMA` | JSON 不符合 schema | 治理文件格式错误 | 按 path 修复，不继续 |
| `E_REQUIREMENT_INCOMPLETE` | 需求类别不足 | 需求信息不足，不能选择工程模板 | 回 PACT 访谈补白 |
| `E_CAPABILITY_BLOCKED` | 候选能力未 ready | 当前能力未达到交付门 | 展示 limitations，不生成 |
| `E_COMPATIBILITY` | 版本/哈希/契约冲突 | 能力版本不兼容 | 先升级或重验 |
| `E_BASELINE_UNKNOWN` | Git baseline 无法解析 | 无法确定变更基线 | 显式提供有效 ref |
| `E_PATH_OWNERSHIP` | release path 归属冲突 | 发布单元路径配置冲突 | 修 registry |
| `E_MIGRATION_CONFLICT` | 来源、目标或哈希冲突 | 迁移冲突，未修改原文件 | 人工审阅冲突 |
| `E_COMMAND_FAILED` | 子门禁失败 | 验证失败 | 保留命令和退出码，停止后续 |
| `E_INVALID_TRANSITION` | 非法迁移状态 | 当前迁移状态不允许此操作 | 回到 inspect 或 rollback |

<!-- PACT:C7 -->
## C7 · 配置与环境变量

| 配置项 | 单一来源 | 类型 | 默认值 | 敏感 | 说明 |
|---|---|---|---|---|---|
| capabilities | `platform/registry/capabilities.v1.json` | JSON | 入库文件 | 否 | 能力真源 |
| profiles | `platform/registry/delivery-profiles.v1.json` | JSON | 入库文件 | 否 | 选择规则 |
| compatibility | `platform/registry/compatibility.v1.json` | JSON | 入库文件 | 否 | 版本/哈希关系 |
| release units | `platform/registry/release-units.v1.json` | JSON | 入库文件 | 否 | 发布/验证命令真源 |
| provenance | `platform/registry/provenance.v1.json` | JSON | 入库文件 | 否 | 来源快照事实 |
| release output | CLI `--output` | repo-relative path | `artifacts/release` | 否 | 必须在 repo 内且被 gitignore |
| Git base | CLI `--base` | git ref | 无 | 否 | 不提供则失败，不猜测 |
| npm token | 禁止配置 | secret | 不读取 | 是 | 本项目不实现真实 publish |

外部产品契约防漂移：provenance 锁定两个完整规范化产品树；compatibility 另锁定 UI `package.json` exports、`dist/ai-manifest.json` 与 Agent schema 的组合 hash。产品源码变化必须更新对应 evidence/hash 并触发 governance check，不允许只改产品文件而保持声明不变。

<!-- PACT:C8 -->
## C8 · 权限与安全边界

| 操作 | AI Agent | 框架维护者 | 发布维护者 | 强制边界 |
|---|---|---|---|---|
| inspect/check/plan | 允许 | 允许 | 允许 | 只读当前 repo |
| 写治理/源码 | 仅显式任务 | 允许 | 允许 | 目标 realpath 必须在 repo 内，overwrite deny 默认 |
| migration link/finalize/recover | 不默认 | 显式迁移任务允许 | 允许 | 独占迁移锁；已 verified、路径精确、保留备份；finalize 仅 unlink 精确绝对软链 |
| local pack | 不默认 | 允许 | 允许 | 输出仅在 repo 忽略目录 |
| npm publish/git push | 禁止 | 根工具不提供 | 根工具不提供 | 必须脱离本自动化另行人工执行 |

- 不可信 template、handler、script 不进入治理执行路径。
- 命令白名单首程序仅允许 `node`、`npm`、`bash`、`mvn`；参数由入库 registry 固定，不接受用户拼接 shell。
- 日志不读取或输出 `NPM_TOKEN`、registry auth、SSH key；测试扫描相关键名。

<!-- PACT:C9 -->
## C9 · 观测与日志契约

| 事件 | 级别 | 记录字段 | 必须脱敏/禁止字段 |
|---|---|---|---|
| capability inspection | INFO | kind, profile, selected, candidate, diagnostic codes | 原始自由文本需求不记录 |
| governance check | INFO | schema id, file, pass/fail, code/path | 文件内容不整份输出 |
| migration verify | INFO | sourcePath, targetPath, hash, excluded count, phase/state | 文件内容、凭据不记录 |
| release plan | INFO | base, direct units, verify units, reasons | 环境变量、token 不记录 |
| command failure | ERROR | unit, command id, exit code, 最后 40 行摘要 | auth 配置行脱敏 |

结构化命令 stdout 只输出 JSON；人读摘要写 stderr。确定性 JSON 不含 timestamp、绝对临时目录或随机 ID。

<!-- PACT:C10 -->
## C10 · 交互与呈现契约

N/A（本项目交付 CLI、JSON 和 Markdown，不新增 Web UI。UI 产品迁移必须保持既有视觉与 Manifest/VIcon 规则，本轮不设计新页面。）

<!-- PACT:C11 -->
## C11 · AI / Prompt 契约

本项目不内置模型调用；AI Agent 通过 skill 读取治理资源，所有输出仍需确定性工具验证。

| 项 | 契约 |
|---|---|
| 自然语言判断 | 由 PACT 访谈先收敛为 `kind` 枚举；Router 不解析自由文本 |
| AI 输入 | `PACT.md`、capability/profile/compatibility JSON、Manifest/Recipe（仅已选择 UI 时） |
| AI 输出 | 受 schema 校验的 inspect/spec/plan；不得直接执行模板 handler/script |
| 输出失败 | schema 不合法即 `E_SCHEMA`，最多修复两轮；仍失败回访谈或人工审核 |
| Starter 使用门 | 只有 `kind=business-system` 且 adapter readiness 满足时；否则只报告候选/限制 |
| 兜底 | required、permission、危险操作只接受显式需求；缺契约返回诊断，不生成空壳 |

---

# 第三部分 · Tests

<!-- PACT:T1 -->
## T1 · 验收清单

| R-ID | 验收方式（可执行） | 判定标准 | 检查者 |
|---|---|---|---|
| R001 | `npm test -- --test-name-pattern='core boundary'` | Core 扫描零 Vima 引用且自测通过 | 脚本 |
| R002 | governance schema test | 恰有 5 个 capability ID，字段齐全 | 脚本 |
| R003 | router benchmark test | generic/admin/business 三类 profile 正确 | 脚本 |
| R004 | router test 禁用 Vima fixtures | generic 成功，另两类只给候选/诊断 | 脚本 |
| R005 | invalid inspect fixtures | 全部非零退出且 code/path 稳定 | 脚本 |
| R006 | readiness evidence test | 无 evidence 的 ready 被拒绝 | 脚本 |
| R007 | `npm run governance:check` | 六类合法 JSON 全过，每类非法 fixture 全失败 | 脚本 |
| R008 | same-version-different-hash fixture | 返回 `E_COMPATIBILITY` 或 verify-required | 脚本 |
| R009 | benchmark snapshot | 4 类输入全部匹配期望 JSON | 脚本 |
| R010 | Starter registry assertion | C1 的 4 个稳定限制 ID 均存在，Starter 为 partial、adapter 为 blocked | 脚本 |
| R011 | `npm run migration:verify` | 两目标目录存在且 hash 一致 | 脚本 |
| R012 | provenance schema/hash test | 全字段合法、hash 可复算 | 脚本 |
| R013 | import manifest scan（必须早于 bootstrap/build） | manifest 对 C3 的 8 个目录段零记录且附加 exclude 参数被拒 | 脚本 |
| R014 | temp fixture conflict test | 非零退出且两端 hash 不变 | 脚本 |
| R015 | UI identity/export test | name 为 `@vima-tech/ui-admin`，声明 exports 均存在 | 脚本 |
| R016 | Starter identity + `npm --prefix templates/vima-starter run check:template` | CLI name 保持且无模板漂移 | 脚本 |
| R017 | root verify order test | 日志顺序固定，注入失败后后续不运行 | 脚本 |
| R018 | finalized alias retirement | 退役前 2/2 是指向 canonical target 的软链；退役后 `test ! -e && test ! -L`、target/backup hash 与统一路径产品门全部通过 | 脚本 |
| R019 | release unit schema test | 恰有 3 个 unit 且 verify/pack 完整 | 脚本 |
| R020 | changed path fixture | added/modified/deleted 映射 100% 正确 | 脚本 |
| R021 | UI public change fixture | direct 仅 UI，verification 含 UI+Starter | 脚本 |
| R022 | plan deterministic test | 连跑两次 SHA-256 相同 | 脚本 |
| R023 | 3 类 release error fixture | baseline/schema/ownership 均按约定失败 | 脚本 |
| R024 | UI 四命令 + budget snapshot | 全 exit 0，预算基线/比例未增加 | 脚本 |
| R025 | Starter template/frontend/backend/CLI pack | 全 exit 0，生成命名正确 tgz，无 publish | 脚本 |
| R026 | PACT self-test + 当前物料 check/review | 全 exit 0，review 100% | 脚本 |
| R027 | static scripts scan + archive listing | 无 publish/push/token 读取；恰有 3 个本地归档 | 脚本 |

<!-- PACT:T2 -->
## T2 · 指标与阈值

| 指标 | 阈值 | 测量方式 |
|---|---|---|
| Router 正确率 | 4/4 fixtures | `npm test` benchmark |
| 治理 schema 负例检出 | 六类每类至少 1 个，检出率 100% | governance tests |
| 迁移完整性 | 规范化 hash 100% 相等 | `npm run migration:verify` |
| release plan 确定性 | 同输入两次 SHA-256 相同 | deterministic test |
| UI runtime gzip | 不超过既有 `runtime-budget.json` 计算上限 | `npm --prefix products/vima-ui-admin run check:size` |
| 全量验证 | 所有子命令 exit 0，串行 | `npm run verify` |
| canonical-only 入口 | 两个旧路径 2/2 不存在，两个 canonical target 与备份 hash 100% 相等 | migration test |
| PACT 完成度 | 100% | `pact-review.sh` |

<!-- PACT:T3 -->
## T3 · 停工线（出现即停，不得继续施工）

- 来源或用户文件出现未授权的不可逆删除、覆盖；R018 只允许删除两个已验证软链接且必须保留 target 与快照备份。finalized commit point 之前按 journal 回滚，之后只在 canonical target 前向修复，不得用“先回滚”复活已退役入口。
- PACT Core 引入 Vima 源码依赖，或 generic profile 在无 Vima 时不能工作。
- Router 在非 `business-system` 输入中选择 Starter。
- 为通过门禁而抬高 UI runtime budget、跳过现有产品测试或把失败标记为 ready。
- 根脚本执行真实 `npm publish`、Git push、读取 registry token 或运行不可信模板脚本。
- package/CLI identity 被无规格变更地合并或重命名。
- 测试为迁就实现而放宽断言；任何 C3 不变量被破坏。

命中后立即停止，记录 `needs input:` 与证据；先回滚到可验证状态，再走 `/pact-change`。

<!-- PACT:T4 -->
## T4 · 交付前置（Definition of Done）

- [ ] `npm run governance:check`、`npm test`、`npm run migration:verify` 通过。
- [ ] UI 的 `check:ai`、`typecheck`、`test`、`verify:publish` 全部通过。
- [ ] 显式 `npm run bootstrap` 成功；此后验证命令不隐式安装依赖。
- [ ] Starter 的 `check:template`、frontend `build:check`、backend `mvn package`、CLI 本地 `npm pack` 全部通过。
- [ ] PACT scripts self-test、`pact-check.sh`、`pact-review.sh` 全部通过。
- [ ] `npm run release:plan -- --base HEAD^` 输出合法稳定计划；`npm run release:pack` 只生成本地 artifacts。
- [ ] 两个旧绝对路径已退役且 lstat 不存在；canonical target 与 provenance 记录的来源备份均可复算且 hash 一致。
- [ ] T1 的 R001–R027 全部有真实执行证据；`action-graph.json` 完成度 100%。
- [ ] 根 `README.md`、`CLAUDE.md`、产品局部约定与实际目录/命令一致。
- [ ] 无临时源文件、无未解释的待办占位、无本需求引入的 secrets；用户既有未跟踪文件保持未修改。

<!-- PACT:T5 -->
## T5 · 施工范围与里程碑

| 里程碑 | 包含 R-ID | 出口条件 | 明确不含 |
|---|---|---|---|
| M0 · 安全前置与工具骨架 | R001,R007,R012,R014 | Core 边界、六类 schema/负例、planned provenance 与迁移冲突 fixture 全绿 | live 产品 evidence、物理目录切换 |
| M1 · 统一 workspace | R011,R013,R015–R019,R024,R025 | import manifest 先验通过；产品迁入、identity/release-unit/串行编排就位，经 linked 过渡验收后进入 canonical-only finalized；bootstrap 与两产品真实门禁全绿 | Starter RBAC/FullStackSpec 深化 |
| M2 · 治理数据与能力选择 | R002–R006,R008–R010 | 基于迁入产品的 evidence/hash 完成 registry、profile、adapter、compatibility 与 Router 真值表 | 新的业务生成 adapter 实现 |
| M3 · changed release 与收尾 | R020–R023,R026,R027 | changed plan/传播/错误 fixtures、3 个本地归档、PACT self-test/check/review 100%，T4 全勾 | 外部 registry/Git 状态变更 |
| M4 · 旧入口退役 CR | R018,R026 | finalized 状态、两个 old alias 不存在、target/backup hash 与全量门禁通过、图谱重新 100% | 删除 `.pre-pact-*` 备份 |

### 降级策略

- **可牺牲（砍宽度）**：人读 release 摘要的排版、额外 benchmark 数量、重型 monorepo 缓存、远程 MCP 外壳。
- **不可牺牲（保深度）**：Core 独立、业务系统才候选 Starter、finalized 前迁移可回滚、canonical-only 入口、备份保留、独立包身份、全部既有硬门、确定性 changed plan、默认不发布、C3 全部不变量。
- **触发条件**：非必要打磨导致核心门连续两轮无进展时，只删除 P2 打磨，不降低任何 P0/P1 验收。
- **决策人**：renmengkai；涉及冻结需求时必须走 `/pact-change`。

判据：宁可不增加更多 adapter 和自动化外壳，也不交付一个会误选 Starter、无法回滚或门禁不绿的统一仓库。
