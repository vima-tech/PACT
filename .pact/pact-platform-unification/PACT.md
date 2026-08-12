# PACT · PACT Platform 统一治理、完整发行与 Agent 接入

> **PACT = Product · Architecture · Contracts · Tests**
> 本文是本项目的单文件完备规格。此前不了解项目的人或 AI 只读本文即可实施；过程状态见 `action-graph.json`，编码约定见根 `CLAUDE.md`。

| 字段 | 值 |
|---|---|
| 创建日期 | 2026-08-11 |
| 更新日期 | 2026-08-11（完整发行与 Agent 接入 CR） |
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

PACT 是面向 Claude Code、Codex 等 AI Coding Agent 的业务系统交付控制平台：把业务需求转化为可执行规格，约束 Agent 准确实现，并用真实运行与业务闭环证据交付可用、稳定、可持续演进的业务操作系统。当前交付把 PACT skills、`@vima-tech/ui-admin` 和 `create-vima-starter` 放在同一个 Git 仓库统一治理，同时新增可全局安装的 `@vima-tech/pact` 完整发行包；PACT、UI 与 Starter 保持逻辑解耦和独立发布身份。

本文中的“业务操作系统”指承载企业实际业务对象、角色权限、状态流转和日常操作闭环的软件系统，不是操作系统内核。Claude Code、Codex 等 Agent 负责推理和编码，PACT 负责“写什么、哪些规则不能猜、做到什么才算真正完成”；PACT 不绑定单一模型或 Agent 客户端。

<!-- PACT:P2 -->
## P2 · 背景与问题

PACT 已能约束 Product、Architecture、Contracts、Tests 与施工闭环，但还存在两个产品化缺口。第一，系统缺少统一的完整安装入口：`npx skills add vima-tech/pact -g` 只能安装 Agent Skills，不能可靠注册全局 CLI、Runtime 和后续 Adapter 管理能力。第二，生成代码、单测通过或 action graph 100% 都不足以证明业务系统可用；系统必须长期以“生成规范、准确实现、业务闭环真实、运行稳定”为最高判断标准。

UI 框架只负责前端组件和受信 Builder，Starter 持有 Vue + Spring Boot 业务系统宿主；它们与 PACT 分散时，版本兼容、选择条件、验证和发布没有单一真源，AI 容易在没有业务契约时生成看似完整的空壳。统一治理不能退化为把 UI、Starter 强塞进 PACT Core，也不能让 npm 安装阶段静默安装 JDK、数据库或执行不可信网络脚本。本次 CR 在既有三阶段迁移之上增加完整 PACT npm 发行、同版本 Skills 自动注册、可修复安装状态和统一安装文档，为后续端到端业务系统生成建立稳定入口。

<!-- PACT:P3 -->
## P3 · 用户与角色

| 角色 | 是谁 | 主要目标 | 数据可见范围 | 可执行的写操作 |
|---|---|---|---|---|
| 框架维护者 | 修改 PACT、adapter、产品源码的人 | 在统一仓库开发并验证 | 整个仓库及本地来源快照 | 修改源码与治理数据，不默认外部发布 |
| 发布维护者 | 决定版本和执行发布的人 | 得到准确 changed plan 与独立包 | release units、变更和验证报告 | 显式执行 pack；真实 publish 仍需人工授权 |
| AI Agent | 使用 PACT 分析并创建工程的代理 | 按需求选择最小能力组合 | 只读 capability/profile/compatibility 与项目物料 | 默认仅生成 plan；写入受路径与 overwrite 策略限制 |
| 生成项目维护者 | 接手 Starter 或 UI 产物的人 | 获得可构建、可追溯的工程 | 自己的生成项目 | 在生成项目内开发；不依赖 PACT 运行时 |
| 业务负责人 | 提出并裁定真实业务需求的人 | 让需求成为可执行规格并得到可用系统 | PACT、业务流水线、验收和交付证据 | 裁定业务规则、批准计划和验收结果 |
| PACT 使用者 | 在本机安装 PACT 并连接一个或多个 Agent 的开发者 | 一条主命令获得 CLI、Runtime 与 Agent Skills | 自己的用户级安装目录和已检测 Agent | 安装、同步、修复和升级自己拥有的 PACT 文件 |

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

### S4 · 安装完整 PACT 并连接 Agent
- **流程**：`$ npm i -g @vima-tech/pact` --安装 CLI/Runtime/内置 Skills--> 非交互 Agent 检测与同步 --`$ pact doctor`--> ✓ CLI 和已检测 Agent 均可使用同版本 PACT
- **回头路**：Agent 同步 --无 Agent、脚本被禁用、权限或本地修改冲突--> 记录可修复诊断 --`$ pact agent sync`--> 重新验证
- **样本**：用户已装 Codex 时，全局安装后 `pact` 可执行且全部 PACT Skills 出现在 Codex 全局 Skills 目录；未装 Agent 时 npm 安装仍成功
- **完成态**：完整 npm 包可本地 pack/install；CLI、Runtime、Skills 与 manifest 同版本；同步幂等且不覆盖用户修改

#### 完整安装 `$ npm i -g @vima-tech/pact`
> PACT 使用者的主推荐入口，安装 PACT 自身完整能力并尽力连接已存在的 Agent。

- 能做什么
  - npm 包公开身份为 `@vima-tech/pact`，提供 `pact` 与冲突回退命令 `vima-pact`。 `R029`
  - 包内携带 PACT Core、Runtime、Registry、Delivery Profiles、Installer 和全量 Skills。 `R030`
  - 安装后从包内同版本副本向已检测 Agent 注册 Skills，不在生命周期脚本中套娃执行网络版 `npx skills add`。 `R031` `R032`
  - `pact agent list/sync/install/verify` 与 `pact doctor` 可重复检测、补装、校验和修复。 `R033` `R035`
- 什么情况会被拦住
  - 目标 Skill 有本地修改、来源不明或路径越界时不覆盖，返回稳定冲突诊断。 `R034`
  - 没有 Agent、`--ignore-scripts` 或可恢复同步失败不破坏 CLI 安装，状态保持 pending/needs-sync。 `R035`
- 背后自动发生了什么
  - manifest 锁定 CLI、Runtime、Skills 的版本与 hash；升级复用同一同步协议。 `R039`
  - PACT 只清理由自己精确记录且未被用户修改的文件或软链接。 `R040`

#### 轻量与自然语言安装
> 只要 Skills 的用户保留生态原生入口；不知道命令的用户可以让 Agent 按官方文档安装。

- `npx skills add vima-tech/pact -g` 默认全量安装 Skills，不提供模块选择，也不承诺全局 CLI/Runtime。 `R036`
- 用户说“安装完整 PACT”时，Agent 只信任官方版本化文档，执行 npm 主安装、`pact doctor`，必要时运行 `pact agent sync`；网络文档不直接成为自由命令真源。 `R037`
- `/pact-install` 与 `pact install` 用于环境检测、Skills 修复、Adapter/外部能力按需启用和升级，不在 npm 安装期间静默安装 JDK、数据库、浏览器或常驻服务。 `R038`

### S5 · 以 PACT 驱动 Agent 交付业务操作系统
- **流程**：业务需求 --PACT 访谈/领域与流水线规格--> 冻结契约与执行图谱 --Claude Code/Codex 等施工--> 真实启动和业务操作闭环 --证据审查--> ✓ 可用、稳定、可持续演进的业务操作系统
- **回头路**：任何规格缺口、实现偏离、真实运行或业务闭环失败 --回到对应 R-ID/契约/图谱--> 修复后重验
- **样本**：不能把只有页面、演示数据、无 handler 按钮、未接真实 API、只通过单测或无法启动的工程称为完成
- **完成态**：后续所有功能选择都优先提高“生成规范、准确实现、真实可用、运行稳定”四项目标，低层完成态不得冒充高层交付态

#### 北极星判断标准
> 这是 PACT 的长期方向，不表示当前 Starter 已经达到完整业务生成 readiness。

- PACT 保持 Agent 中立，Claude Code、Codex 等只是可替换执行宿主。 `R028`
- 根指令、README、平台设计和安装文档必须一致陈述终极目标，并用它裁决架构与功能优先级。 `R028`
- 交付状态必须区分已实现、可构建、可启动、已集成、业务闭环通过、已验收、可部署和稳定运行。 `R041`
- 完整发行必须有自动测试覆盖 pack 内容、CLI、Agent 同步、冲突、pending/repair 与无外部发布行为。 `R042`

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
| R028 | 产品 | 终极目标与最高判断标准进入五个权威入口 | 根 `CLAUDE.md`、根 README、平台 README、指定设计文档与本 PACT 对目标、Agent/Pact 分工和“业务操作系统”定义一致；安装文档另验安装语义 | P0 | R001 | 用户 | **PACT 是控制平台，不替代 Claude Code/Codex** |
| R029 | 发布 | 提供公开完整包 `@vima-tech/pact` 与两个 CLI 名 | 直接断言 `package.json.name`、`private!==true`、双 bin；`npm pack --dry-run --json` 成功且两命令 help/version smoke 通过 | P0 | R019 | 用户 | — |
| R030 | 交付 | 完整包携带 Core、Runtime、治理资源、Installer 和全量 Skills | tarball 清单包含 9 个 Skill 目录、CLI、platform 核心与 install manifest，且不包含 UI/Starter 源码和 `.pact` 私有物料 | P0 | R001,R029 | 用户 | — |
| R031 | 安装 | npm 安装后自动向已检测 Agent 注册全量 Skills | `PACT_ALLOW_HOME_OVERRIDE=1` + `PACT_USER_HOME=<temp>` 模拟 Codex/Claude，非交互同步后每个目标恰有 manifest 所列 Skills 且验证通过，系统 HOME 不变 | P0 | R030 | 用户 | — |
| R032 | 供应链 | 自动注册只使用包内同版本 Skills | 安装器源码与测试证明不 spawn `npx skills add`、不下载 Skill；manifest 的 version/hash 可复算 | P0 | R030 | 用户 | — |
| R033 | 功能 | CLI 提供 Agent 检测、同步、定向安装与验证 | `pact agent list/sync/install/verify` fixture 输出稳定 JSON/人读状态，重复 sync 无额外变化 | P0 | R031 | 用户 | — |
| R034 | 安全 | Skill 同步路径受控且不覆盖本地修改/未知来源 | 路径逃逸、普通文件占位、本地 hash 改动 fixtures 全部拒绝并保留目标字节不变 | P0 | R033 | 用户 | — |
| R035 | 修复 | `pact doctor` 准确报告 CLI、manifest 和 Agent Skills 状态 | 无 Agent、pending、needs-sync、conflict、ready fixtures 全部判定正确；可恢复问题不破坏 CLI 安装 | P0 | R033,R034 | 用户 | — |
| R036 | 兼容 | 保留 `npx skills add vima-tech/pact -g` 轻量全量 Skill 入口 | README 明确无需模块选择、只装 Skills；以 devDependency 固定的 `skills@1.5.22` 真实 CLI 对本地仓库执行 `add . --list` 并发现九个唯一 Skill | P1 | R030 | 用户 | — |
| R037 | 文档 | 自然语言安装只路由到官方确定性安装流程 | 官方安装文档给出“安装完整 PACT”的 Agent 步骤：npm 主安装→doctor→必要时 sync，不含 `curl|sh` 或任意搜索结果执行 | P1 | R029,R035 | 用户 | — |
| R038 | 边界 | `/pact-install`/`pact install` 负责修复与可选环境/Adapter，不静默装重型依赖 | Skill 与 CLI help 明确职责；默认执行只 inspect/同步，不安装 JDK、数据库、浏览器、Docker、常驻服务 | P0 | R035 | 用户 | — |
| R039 | 版本 | CLI、Runtime、Skills 与 manifest 同版并支持升级后再同步 | package version 与 manifest version 相等；版本/hash 漂移由 doctor 检出，sync 只采用当前包内容 | P0 | R030,R035 | 用户 | — |
| R040 | 生命周期 | 安装状态记录 PACT 精确拥有/观察的目标并支持 adopt/unadopt/remove/uninstall 安全清理 | state 记录 agent/source/target/method/ownership/hash；remove/preuninstall 只删除仍匹配 managed，observed 只解除记录，修改项保留并出冲突报告 | P1 | R034,R039 | 用户 | — |
| R041 | 真实性 | 交付状态不得把低层完成冒充可用稳定业务系统 | 权威文档固定八级状态；Profile schema 与聚合器验证 evidence 记录形状和逐级阻断；本轮不声称已实现真实 Delivery Verifier 或 Starter ready | P0 | R028 | 用户 | **本轮写入标准与聚合，不虚报证据执行器** |
| R042 | 质量 | 完整发行与 Agent 接入有独立自动测试和本地安装验收 | npm test 覆盖 pack/CLI/detect/sync/conflict/pending/repair/version；release pack 仍仅本地产物且全量 verify 通过 | P0 | R029–R041 | 用户 | — |

### 横切项检查

- [x] 权限/角色：仓库工具按 P3/C8 仅允许当前仓库与显式输出路径；无业务 RBAC。
- [x] 输入校验：R005、R007、R014、R023、R033–R035。
- [x] 错误处理/回滚/幂等：R014、R022、R033–R040；迁移采用复制验证后切换，Skill 同步使用受控路径、hash 与状态记录。
- [x] 破坏性操作二次确认：真实发布仍不可达；旧入口退役只在来源、目标、备份哈希和软链目标全部确认后，精确 unlink 两个软链接。
- [x] 分页/排序/性能：本地小规模 registry，无分页；T2 约束验证时长与确定性。
- [x] 审计/追溯：R008、R012、R022、R032、R039、R040。
- [x] 敏感信息：不读取、不记录 registry token；见 R027。
- [x] 国际化/时区/单位：治理 JSON 使用 UTF-8，时间使用 RFC 3339 UTC，哈希字节单位；CLI 人读文案为中文。

### 覆盖声明

| 输入类别 | 已归类位置 |
|---|---|
| 用户关于可控业务生成、PACT 可选对接和三阶段迁移的指令 | R001–R010,R017–R027，P6 |
| PACT/UI/Starter 的现状代码与局部约定 | R011–R018,R024–R026，P7 |
| ClearWorks 失败复盘与整体设计 | R002–R010，A4，D006/D008，C11 |
| 8 项来源冲突 | D001–D008 |
| 用户关于终极目标、PACT/Agent 分工和业务操作系统交付的讨论 | R028,R041，P1/P2/P4/P8，A4，C11 |
| 用户关于三种安装方式、完整 npm 包、Skills 自动同步和 `/pact-install` 新职责的讨论 | R029–R040,R042，P4，A2/A3/A5，C1–C9，T1–T5 |

以上输入已全部归类为 R001–R042、非目标、约束或风险；这是 S8 来源反扫的审计结论，不是运行时代码需要重新推导的条件。

<!-- PACT:P6 -->
## P6 · 非目标（明确不做）

- **不做**把 PACT、UI Admin 与 Starter 三个发布物合成一个 npm 包——`@vima-tech/pact` 只发布 PACT Core/Runtime/Skills，不携带两个可选产品源码。
- **不做**真实 `npm publish`、Git push、PR 或远端发布——没有凭据与外部变更授权；本轮止于可审计 plan、verify 和本地归档。
- **不做**把 UI Admin 或 Starter 设为 PACT 必选依赖——用户明确要求按需求选择。
- **不做**完整 FullStackSpec/StarterAdapter 业务代码生成——本轮完成承载它们的治理与 adapter 边界；readiness 继续标 blocked/partial。
- **不做**在迁移中一次性修复 Starter 的 RBAC、生产 secrets、migration、三份导航真源与全部测试——这些需要独立 PACT 物料，当前只禁止虚报能力。
- **不做**引入 Nx、Turborepo 或常驻 MCP 服务——当前规模用确定性 Node/Shell 工具足够；多个远程客户端出现后再评估薄 MCP。
- **不做**伪造两个来源项目不存在的 Git 历史——使用 provenance 与内容哈希代偿。
- **不做**在 npm 生命周期中联网下载 Skills、运行 `npx skills add`、执行 `curl | sh` 或静默安装 JDK/数据库/浏览器/Docker/常驻服务——外部能力必须由显式 `pact install` 计划启用。
- **不做**在本轮宣称已能稳定生成所有业务操作系统——本轮交付可信安装与最高判断标准；FullStackSpec、真实业务黄金切片和 Starter readiness 仍需后续独立物料。

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
| Agent 中立 | 架构 | 硬 | Claude Code、Codex、Cursor 等是可替换宿主；PACT 真源、图谱和完成标准不进入某一客户端私有实现 |
| npm 完整包不含 Vima 产品源码 | 发布 | 硬 | `@vima-tech/pact` 可独立安装；UI/Starter 继续按 registry 和 Adapter 按需选择 |
| 安装不覆盖用户修改 | 数据安全 | 硬 | 目标 hash 或来源不匹配时诊断并停住；不得为了“自动”静默覆盖 |
| 可恢复问题不破坏 CLI | 可用性 | 硬 | 无 Agent、禁用 scripts 或 Skills pending 时完整包仍可执行 doctor/sync 修复 |
| 当前用户级写入 | 权限 | 硬 | 不要求 sudo；只写 npm 管理目录、已检测 Agent 的当前用户 Skills 目录与 PACT 状态目录 |

<!-- PACT:P8 -->
## P8 · 成功定义

- 6 类治理 JSON 均有 schema，合法/非法 fixture 自动测试全绿，Router 真值表零误选。
- 2 个产品真实目录位于 PACT 仓库，2 个旧路径均不存在，canonical target 与保留的来源快照哈希 100% 一致。
- 3 个独立 release unit 可由 changed plan 稳定识别；同输入连续两次 JSON 字节完全一致。
- UI、Starter、PACT 三套既有硬门和根级全量验证全部 exit 0；UI runtime-size 阈值未放宽。
- 本地 pack 产物可列出且无真实 publish/push；`pact-review.sh` 完成度 100%。
- `npm i -g @vima-tech/pact` 对使用者形成完整主入口：CLI、Runtime、manifest 与全量 Skills 同版本，已检测 Agent 自动同步且可由 doctor/sync 修复。
- `npx skills add vima-tech/pact -g` 继续作为只装全量 Skills 的轻量入口；自然语言安装只组合官方 npm、doctor 与 sync 流程。
- 后续所有能力取舍以“生成规范、准确实现、真实可用、运行稳定”为最高标准；已实现、可构建、可启动、已集成、业务闭环通过、已验收、可部署、稳定运行八级状态不得互相冒充。

---

# 第一部分 · Architecture

<!-- PACT:A1 -->
## A1 · 系统边界与上下文

- **本系统负责**：PACT 规格/施工 Core；完整 npm CLI/Runtime/Skills 发行；Agent Skills 检测、同步、诊断和修复；Vima 能力声明与选择；两个产品源码的统一承载；跨产品验证；变更到发布单元的确定性计划；本地 pack。
- **本系统不负责**：自然语言模型服务、registry/Git 托管、替代 Claude Code/Codex 的通用推理与编码能力、替用户裁定企业业务规则、真实发布审批。本轮也不虚报尚未实现的全栈业务系统生成 readiness。

| 外部依赖 | 用途 | 凭据 | 失效行为 |
|---|---|---|---|
| Git | changed baseline 与版本管理 | 本地仓库，无远端凭据 | baseline 不可判定则 `E_BASELINE_UNKNOWN` |
| Node.js/npm | UI、CLI、治理脚本构建测试 | 依赖已锁定；publish token 不读取 | 缺失则对应 verify 失败 |
| Java 21/Maven | Starter backend 构建 | 无凭据 | 缺失则 Starter verify 失败 |
| 文件系统 | 产品迁移、软链、报告与 tarball | 当前用户权限 | 越界或冲突则拒绝，不部分写入 |
| Claude Code/Codex 等 Agent | 执行访谈、规划、编码与审查 | 用户自行配置模型与工具凭据；PACT 不读取 | 对应 Agent 不存在时 CLI 仍可用，Skills 状态记 pending |
| npm 全局目录与用户 Agent 目录 | 安装 CLI、读取包内 Skills、注册入口 | 当前用户权限，不要求 sudo | 权限或本地修改冲突时不覆盖，doctor 给出修复诊断 |

<!-- PACT:A2 -->
## A2 · 结构与模块职责

```text
pact/
  pact*/                         # PACT Core skills，保持现有发布布局
  bin/pact.mjs                   # pact/vima-pact 统一 CLI
  platform/
    schemas/                     # governance JSON Schema
    registry/                    # capabilities, profiles, compatibility, release-units
    adapters/                    # ui-admin / vima-starter 描述与选择边界
    benchmarks/                  # router 与 release-plan fixtures
    scripts/                     # inspect/check/plan/verify/pack/migration 工具
    test/                        # 平台契约测试
  install-manifest.json          # npm 包版本、内置 Skills 与 hash 真源
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
| `bin/pact.mjs` | `pact`/`vima-pact` CLI 与命令路由 | R029,R033,R035,R038 |
| `platform/lib/agent-skills.mjs` | Agent 检测、同步、验证、冲突保护和状态记录 | R031–R035,R039,R040 |
| `platform/scripts/postinstall.mjs` | npm 安装后的非交互 best-effort Skills 同步 | R031,R032,R035 |
| `install-manifest.json` | 完整包能力、Skills 列表、版本/hash 契约 | R030,R032,R039 |

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

### 链路 4 · 完整安装与 Agent 同步

```text
npm i -g @vima-tech/pact → 包内 CLI/Runtime/manifest/Skills
                                      ↓ postinstall（非交互、无二次下载）
                              detect installed agents
                                      ↓
                         hash/ownership/path preflight
                           ↙ ready              ↘ conflict/pending
                  link/copy + state             保留原字节
                           ↓                         ↓
                     pact doctor ←──── pact agent sync/verify
```

- manifest 与当前 `package.json` 同版本，Skill hash 从包内真源复算；同步不读取网络上的“最新版”。
- postinstall 只做可恢复的 best-effort 同步；包损坏才使安装失败，无 Agent、权限或内容冲突留诊断但不破坏 CLI。
- 同步按 Agent 独立事务：先完整预检该 Agent 的九个目标，再对该 Agent 全写或零写；目标必须在已知当前用户 Agent Skills 根内，重复运行结果幂等。

### 链路 5 · Agent 驱动业务系统交付

```text
业务需求 → PACT 领域/流水线/契约 → action graph → Claude Code/Codex 施工
       → DB/API/权限/UI/测试垂直切片 → 真实启动 → 真实业务状态变化
       → Delivery Profile + 可重放证据 → 验收/部署/稳定运行
```

- PACT 是 Agent 之上的交付控制层，不实现或绑定某个模型。
- action graph 回答“计划的工作是否完成”，Delivery Profile 独立回答“这种交付物是否漏掉整类必需工作”。
- 只有真实操作产生可观测业务状态变化，且对应运行与稳定性门通过，才允许进入高层完成态。

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
9. **北极星高于功能数量**：新增能力必须能提高生成规范、准确实现、真实可用或运行稳定中的至少一项；否则不因“平台更完整”而加入。
10. **Agent 可替换、真源不漂移**：Claude Code、Codex 等只消费同一 PACT/图谱/证据，客户端专属 Skill 不承载唯一业务规则。
11. **简单入口、显式风险**：主安装保持一条 npm 命令；机械复杂度由 Installer 吸收，重型依赖、覆盖、删除和外部状态变化必须显式。
12. **完成分级**：已实现、可构建、可启动、已集成、业务闭环通过、已验收、可部署、稳定运行逐级举证，任何低级不得显示为高一级。

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

#### D010 · PACT 是完整 Agent 还是交付控制平台
- **选项**：A. 自建并替代 Claude Code/Codex / B. 作为可替换 Agent 之上的交付控制平台 / C. 只保留文档模板
- **结论**：采 B；PACT 管需求、规格、图谱、能力、写入边界、证据和完成标准，推理与编码由外部 Agent 执行。
- **理由**：用户终极目标是组合成熟 AI Agent 与 PACT 快速交付可靠业务系统；重复建设通用 Agent 会稀释业务规格和交付门的优势。
- **已否决**：A——模型、工具和客户端演进快且会形成锁定；C——无法保证准确实现、真实可用和稳定交付。
- **影响**：R028,R041

#### D011 · 完整安装主入口
- **选项**：A. 继续只推荐 `npx skills add` / B. `npm i -g @vima-tech/pact` 为主、Skills CLI 为轻量备选 / C. 只让 Agent 搜索网络文档自由安装
- **结论**：采 B；自然语言安装也路由到同一 npm/doctor/sync 流程。
- **理由**：完整系统需要 CLI、Runtime、manifest 和修复工具，Skills CLI 只适合安装说明能力；npm scoped package 能提供标准全局 CLI 和可测试 tarball。
- **已否决**：A——无法可靠注册完整运行能力；C——不可复现且有文档漂移和供应链风险。
- **影响**：R029,R036,R037

#### D012 · npm 安装时如何获得 Skills
- **选项**：A. postinstall 联网执行 `npx skills add` / B. npm 包携带同版本 Skills 并自行注册 / C. 要求用户手工再跑第二条命令
- **结论**：采 B；包内 manifest 锁版本/hash，postinstall 只消费本包内容。
- **理由**：一份发布物才能保证 CLI、Runtime、Skills 同版并支持离线、测试和审计。
- **已否决**：A——二次下载、版本错位且上游交互不可控；C——违背完整安装的一条主命令目标。
- **影响**：R030–R032,R039

#### D013 · 自动同步失败是否使 npm 安装失败
- **选项**：A. 任一 Agent 问题都使安装失败 / B. 可恢复问题记 pending/conflict，CLI 安装成功并由 doctor/sync 修复 / C. 静默忽略全部错误
- **结论**：采 B；包内容损坏、manifest 非法属于致命失败，未检测到 Agent、权限或本地修改属于显式可恢复状态。
- **理由**：用户必须始终保有修复工具，同时不能用“安装成功”掩盖 Skills 未就绪。
- **已否决**：A——没有 Agent 的正常机器也无法安装；C——制造假成功。
- **影响**：R033–R035,R040

#### D014 · `/pact-install` 的职责
- **选项**：A. 继续负责安装基础 CLI / B. 在 CLI 已由 npm 安装后负责诊断、修复和按需 Adapter/环境 / C. npm 阶段直接安装所有外部工具
- **结论**：采 B；默认 inspect/sync，任何重型外部能力都先给计划并显式批准。
- **理由**：基础发行与环境扩展的权限、失败模式和平台差异不同，分层后主入口简单且风险可见。
- **已否决**：A——产生先有 Skill 还是先有 CLI 的循环；C——越权、笨重且不可移植。
- **影响**：R035,R038

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

### `install-manifest.json`

```json
{
  "version": "1.0.0",
  "skills": [{"name":"pact","path":"pact","sha256":"<64hex>"}],
  "runtime": {
    "entry":"bin/pact.mjs",
    "files":[{"path":"bin/pact.mjs","sha256":"<64hex>"}]
  },
  "resources":[{"path":"platform/registry","sha256":"<64hex>"}],
  "agentTargets": ["codex","claude-code","cursor","universal"]
}
```

| 字段 | 类型 | 不变量 |
|---|---|---|
| `version` | semver string | 必须与发布包 `package.json.version` 字节相等 |
| `skills` | 非空 array | name/path 唯一、稳定排序，必须覆盖仓库全部公开 PACT Skills |
| `skills[].sha256` | 64 位小写 hex | 按 C3 Skill 树哈希复算一致 |
| `runtime.entry` | repo-relative path | 必须解析在包根内且是发布清单中的 `bin` 文件 |
| `runtime.files` | 非空 file/hash array | 固定覆盖允许闭集内全部 `.mjs` 运行时代码及 `package.json`，包括 bin、platform/lib、pre/postinstall/preuninstall 和公开 platform scripts，每项文件 SHA-256 可复算 |
| `resources` | path/tree-hash array | 固定覆盖 `platform/registry`、`platform/schemas`、`platform/adapters`、`docs`，按 C3 树哈希复算 |
| `agentTargets` | enum[] | 只允许安装器实现的已知目标；排序稳定 |

npm `files` 允许闭集固定为：`bin/**`、`docs/**`、九个 Skill 目录、`platform/adapters/**`、`platform/lib/**`、`platform/registry/**`、`platform/schemas/**`、`platform/scripts/capability-router.mjs`、`platform/scripts/governance-check.mjs`、`platform/scripts/preinstall.mjs`、`platform/scripts/postinstall.mjs`、`platform/scripts/preuninstall.mjs`、`install-manifest.json`、`CLAUDE.md`。npm 自动包含的 `package.json`、`README.md`、`LICENSE` 也允许。禁止 `platform/test/**`、其他 migration/release/build 脚本、`products/**`、`templates/**`、`.pact/**`、`artifacts/**`、`.playwright-mcp/**`、图片和用户文件。

manifest `runtime.files` 必须枚举并 hash 允许闭集中全部 `.mjs` 可执行文件及其传递 import 闭包，同时包含 `package.json`；构建器从 ESM import 图和固定脚本入口计算闭包，遇到动态/越界 import 拒绝 pack。`resources` 覆盖其余允许目录树。manifest 不自哈希，但 pack 前/CLI 启动时先校验 package name/version/bin/scripts/files/os/engines 与 C1 固定契约，再校验 runtime/resources/skills hash；因此新增 helper 不能绕过完整性门。

九个公开 Skill 的稳定清单按 name 升序固定为：

| name | 包内目录 | Agent 入口 |
|---|---|---|
| `pact` | `pact/` | `/pact` |
| `pact-change` | `pact-change/` | `/pact-change` |
| `pact-check` | `pact-check/` | `/pact-check` |
| `pact-estimate` | `pact-estimate/` | `/pact-estimate` |
| `pact-install` | `pact-install/` | `/pact-install` |
| `pact-list` | `pact-list/` | `/pact-list` |
| `pact-new` | `pact-new/` | `/pact-new` |
| `pact-review` | `pact-review/` | `/pact-review` |
| `pact-run` | `pact-run/` | `/pact-run` |

发布包只支持 Node.js `>=20`、npm `>=10`、Linux 与 macOS，运行时 npm dependencies 必须为 0。`package.json.engines` 固定 node/npm 下限，`os` 固定 `linux,darwin`。平台与 Node 门在 preinstall 及每次 CLI 启动时都由 `process.platform/process.version` 直接检查；低版本/未知平台 exit 4、零用户目录写入。npm 版本只在 npm lifecycle 的 `preinstall` 门检查：必须从 `npm_config_user_agent` 解出 npm semver，缺失/非法/低于 10 均 exit 4；普通 `pact --help`/`--version`/doctor/Agent 子命令不要求该 lifecycle 环境变量、不 spawn `npm --version`，手工解包后 CLI 因而只执行平台与 Node 门。官方 npm 全局安装的前置条件是当前用户对 `npm config get prefix` 可写；不满足时 npm 自身失败，官方文档引导用户使用 Node version manager 或配置用户级 prefix，禁止建议 `sudo npm i -g`。获取 tgz 本身可由 npm registry 使用网络；tgz 一旦获得，解包、postinstall、doctor 和 Agent sync 不再发起网络请求。

Agent 检测与全局 Skills 根在 Linux/macOS 固定如下；`~` 由 `os.homedir()` 获得，测试只通过函数参数注入临时 userHome，不声明或改写系统 `HOME`：

| Agent ID | 已检测条件 | Skills 根 | 显式 install 行为 |
|---|---|---|---|
| `claude-code` | `~/.claude` 是目录 | `~/.claude/skills` | 可创建 `.claude/skills`，不修改其他 Claude 配置 |
| `codex` | `~/.codex` 是目录 | `~/.codex/skills` | 可创建 `.codex/skills`，不修改其他 Codex 配置 |
| `cursor` | `~/.cursor` 是目录 | `~/.cursor/skills` | 可创建 `.cursor/skills`，不修改其他 Cursor 配置 |
| `universal` | `~/.config/agents` 是目录 | `~/.config/agents/skills` | 仅显式 `agent install universal` 可创建 base/skills |

自动 postinstall/sync 只处理“已检测”项，不因为 npm 安装创建任何 Agent base。多个 Agent 的事务按 Agent 独立：单个 Agent 先预检其九个目标再全写或零写；一个 Agent conflict 不阻止其他 Agent 收敛，但总报告必须保留 conflict 且 doctor 非零。

### Agent Skill 安装状态

```ts
type AgentId = 'codex' | 'claude-code' | 'cursor' | 'universal';
type SkillStatus = 'ready' | 'missing' | 'needs-sync' | 'conflict' | 'pending';
type CliStatus = Exclude<SkillStatus, 'missing'> | 'manifest-broken' | 'error';
type InstallMethod = 'symlink' | 'copy';
type SkillRecord = {
  agent: AgentId;
  name: string;
  source: string;
  target: string;
  method: InstallMethod;
  ownership: 'managed' | 'observed';
  sourceSha256: string;
  targetSha256: string;
};
type InstallState = { version: 1; agent: AgentId; packageVersion: string; records: SkillRecord[] };
type UninstallConflict = { agent: AgentId; name: string; target: string; reason: 'target-type-changed' | 'target-content-changed' | 'source-changed' | 'path-unsafe'; recordedAt: string; stateRecord: SkillRecord };
type UninstallConflicts = { version: 1; packageVersion: string; conflicts: UninstallConflict[] };
```

- 状态只记录 PACT 创建或验证接管的目标，不扫描并认领其他来源文件。
- `target` 落盘为规范化绝对路径，但输出默认只展示 `~` 相对人读形式；状态文件原子写入。
- symlink 记录包内 canonical source、source/target hash；copy 同样记录两端 hash。目标内容变化后状态降为 conflict。
- 目标已存在、内容与当前包 source 完全相同但无 PACT state 时，`sync` 可零写入登记为 `ownership=observed` 并视为 ready；observed 永不由 remove 删除。
- PACT 创建的 symlink/copy 记为 `managed`；remove 只删除 managed 且 source/target/type/hash 仍与 state 一致的精确目标。
- `pact uninstall --apply` 是跨 Agent 的单个全局事务（不复用 sync journal）：按 Agent ID 升序预检，exact managed 删除目标并删 state record，observed 只删 state record，conflict 不改目标且将原 state record 迁移到 state 根 `uninstall-conflicts.v1.json`。该文件按 `(agent,name,target)` 唯一；相同 key 且 `reason/stateRecord` canonical bytes 未变时保留原 `recordedAt` 并零写入，只有内容真正变化时才替换记录和时间，再按 Agent ID/Skill name/target 稳定排序。迁移后 Agent state 不再保留该 conflict record；若无剩余 record 则保留合法空 `records:[]` state。这使重装时目标被重新分类为未受管 conflict，不会继承旧 managed 权限。只有无 conflict 的 apply 返回 ready/exit 0；任一 conflict 返回 conflict/`E_SKILL_CONFLICT`/exit 5，而 global `preuninstall` 仍显式将该结果转为 script exit 0 以允许 npm 移除包。
- Linux state 根固定为 `~/.local/state/vima-tech/pact/`，macOS 固定为 `~/Library/Application Support/vima-tech/pact/`；每 Agent 同步使用独立 `agents/<agent>.state.v1.json`、`sync-<agent>.lock`、`sync-<agent>-journal.v1.json`，而跨 Agent 卸载另用 state 根的 `uninstall.lock`、`uninstall-journal.v1.json`与 `uninstall-conflicts.v1.json`。默认忽略 `PACT_USER_HOME`；只有 `PACT_ALLOW_HOME_OVERRIDE=1` 且 override 是已存在、当前 uid 拥有的绝对目录时才用它覆盖 `~`，用于容器/隔离测试且不修改系统 `HOME`。所有 Agent/state 目标仍必须落在该 override 下的闭集。
- symlink 安全校验分两端：安装 leaf 的父目录 realpath 必须等于或位于已知 Skills 根；leaf 的 linkText 必须精确指向 manifest 当前 Skill source，source realpath 必须位于当前 package root。不得要求解引用后的 source realpath 位于 Skills 根。
- symlink 的 `targetSha256` 是解引用后 Skill 树哈希，linkText/source 路径另字段精确记录。package 升级优先按 state.packageVersion 判 needs-sync：若 leaf type/linkText 与旧 state 一致则不是用户 conflict；sync 用新 source 替换/复核链接并更新新树 hash。dangling 但 linkText 仍等于旧 state source 也归 needs-sync；linkText 或 leaf type 被改才归 conflict。
- Agent base、Skills 根和 state 根若已存在必须是当前 uid 拥有的真实目录，不接受 symlink；其 realpath 必须等于或位于 effective user home。新建目录权限固定 `0700`，state/lock/journal 临时和最终文件固定 `0600`，发现 symlink、非目录、越界或 owner 不同返回 `E_SKILL_PATH` 且零写入。

### 交付完成分级

机器真源固定为 `platform/registry/delivery-profiles.v1.json` 顶层 `completionLevels`，设计解释固定为 `.pact/pact-platform-unification/docs/pact-controlled-generation-design.md`。每项 JSON 结构为 `{id,rank,requiredEvidence}`；`id` 使用下表闭集，`rank` 为 1–8 连续整数，`requiredEvidence` 是下表列出的稳定 evidence ID 数组。级别按下列顺序不可跳级：

| level | 进入条件（除本级外还须前级全部通过） |
|---|---|
| `implemented` | `trace-complete`,`implementation-tests-pass`：R-ID 对应代码存在，trace 无野生/未覆盖，实现测试有证据 |
| `buildable` | `locked-build-pass`：锁定环境的编译、类型检查和单测命令 exit 0 |
| `startable` | `real-start-pass`,`health-check-pass`：真实进程启动，健康检查通过，启动命令/环境/快照可重放 |
| `integrated` | `real-database-pass`,`real-request-pass`：真实数据库、后端、API 与前端装配；至少一次真实请求通过，非 mock/demo 数据 |
| `business-closed-loop` | `business-state-change-pass`,`business-query-or-audit-pass`：用户关键操作通过真实 API 产生可观测后端状态变化，并能查询或审计验证 |
| `accepted` | `pact-t1-pass`,`delivery-profile-pass`,`business-owner-accepted`,`no-hard-blocker`：规格门和业务验收全过 |
| `deployable` | `production-config-pass`,`migration-pass`,`security-pass`,`release-pass`,`rollback-plan-pass`：产物可部署但尚不声称长期稳定 |
| `stable` | `restart-recovery-pass`,`observability-pass`,`stability-threshold-pass`：重启/恢复、日志指标和规格稳定阈值通过 |

```ts
type CompletionEvidence = { id: EvidenceId; passed: boolean; command: string; exitCode: number; snapshotSha256: string; artifact: string };
type CompletionLevelStatus = 'achieved' | 'blocked';
type CompletionReport = { achieved: LevelId | null; blockedAt: LevelId | null; levels: { id: LevelId; status: CompletionLevelStatus }[] };
```

`platform/lib/delivery-readiness.mjs` 导出 `evaluateCompletion(evidence: CompletionEvidence[]): CompletionReport`；非法 evidence 统一抛出 `PlatformError('E_SCHEMA', <stable-path>, <message>, 2)`，包括重复/未知 ID、空 command/artifact、非整数 exitCode 或非法 64hex snapshot。只有 `passed=true && exitCode=0` 才算通过。聚合器按 rank 逐级计算：已通过当级全部 requiredEvidence 且前级皆 achieved 则当级 `achieved`，否则当级及后级全部 `blocked`；`achieved` 为最高 achieved 级（一级未达成则 null），`blockedAt` 为首个 blocked 级，八级全 pass 时 `achieved='stable'`、`blockedAt=null`。本 CR 验收 evidence vocabulary、记录形状与逐级聚合，不声称已重放任意生成业务系统；实际命令执行、产物验证和重放由后续 Delivery Verifier 物料实现，当前 Starter readiness 保持 partial/blocked。

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
| `pact-skills` | 根 `package.json#version` | `pact-self-test`,`pact-material-check`,`pact-distribution-test` | `npm pack` 完整 `@vima-tech/pact` tgz（内部 unit ID 为兼容保留） |
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

### Agent Skill 同步状态机

```text
missing ──sync──> ready
pending ──sync──> ready
needs-sync ──sync──> ready
ready ──package upgrade──> needs-sync
ready/needs-sync ──target changed──> conflict
conflict ──explicit resolution──> ready
```

- `sync` 前先完成该 Agent 全部目标的 path/ownership/hash 预检；事务范围严格按 Agent 独立，同一 Agent 任一 conflict 时该 Agent 零写入，其他 Agent 可继续并在总报告保留失败。
- 未检测到 Agent 返回 pending，不创建伪造的 Agent 配置根；显式 `agent install <id>` 才允许创建已知目标的 Skills 根。
- 默认优先 symlink 到当前包内 Skill 真源；平台不支持或显式 `--copy` 时复制。重复 sync 必须是 no-op。
- remove 只处理 state 中仍指向记录 source 的软链或 hash 未变化的副本；否则转 conflict 并保留。
- `conflict → ready` 允许三条公开路径：目标内容已人工恢复为当前 source 的 exact hash 后重新 `sync`；对 exact hash 的既有内容运行 `pact agent adopt <id> --skill <name>` 记为 observed；或用户自行删除冲突 leaf 后由 inspect 将其降为 missing/needs-sync，再运行 sync。不同内容没有强制覆盖命令。
- package version 与 state 不同且 managed 目标仍与 state 记录的旧 type/source/target hash 一致时分类 `needs-sync`，即使软链当前解引用后已看到新包内容也不算 conflict；目标偏离 state 才是 conflict。检测到的 Agent 中任一 Skill missing 聚合为 `needs-sync`，未检测 Agent 才是 `pending`，CliReport 不使用 `missing` 聚合值。
- 总体聚合忽略未检测 Agent：存在至少一个 detected 时只聚合 detected reports；它们全 ready 则总体 ready。只有 detected 数量为 0 时总体 pending。

### 每 Agent 同步事务与崩溃恢复

1. 以 `open(lock,'wx')` 获取该 Agent 独占锁；已存在锁不猜 stale，返回 `E_SKILL_CONFLICT`，只有显式 `pact agent sync --agent <id> --recover` 可接管。
2. 预检九个 source/target/state；任一 conflict 释放本次新锁并零写入目标。
3. 在该 Agent Skills 根内创建 `.pact-stage-<transaction>` 和 `.pact-backup-<transaction>`；先把九个新 symlink/copy 全部构造并复算 hash。
4. 原子写 journal，记录 transaction、旧 state hash、九个 target、原 type/source/hash、stage/backup 路径和 `status=prepared`。
5. 对需要更新的 managed 目标先 rename 到 backup，再把 stage 项 rename 到 target；每步原子更新 journal。observed 和 no-op 目标不移动。
6. 九项全部复核后原子写新 install state，这是 commit point；随后删除 backup/stage/journal 并释放锁。
7. 普通异常在 commit point 前按 journal 删除本次新 target、rename backup 复原并保持旧 state；遇到未知类型/hash 停住不覆盖。
8. `--recover` 按 state hash 判 commit point：state 仍旧则执行前向安全回滚，state 已新则只复核新 targets 并清理 stage/backup；state/hash 不属于 journal 任一端则返回 conflict 人工审阅。

state/journal 使用 `stableJson`（对象 key 升序、数组按 Skill name、UTF-8、末尾单 `\n`），state hash 是该 canonical bytes 的 SHA-256。journal 固定结构：

```ts
type SyncJournal = {
  version: 1;
  agent: AgentId;
  transaction: string;
  packageVersion: string;
  status: 'prepared' | 'applying' | 'committed';
  oldStateSha256: string | null;
  newStateSha256: string;
  entries: Array<{
    name: string; target: string; stage: string; backup: string;
    old: null | { kind: 'symlink' | 'directory'; linkText: string | null; sha256: string };
    next: { kind: 'symlink' | 'directory'; linkText: string | null; sha256: string };
    applied: boolean;
  }>;
};
```

`transaction` 用 `crypto.randomUUID()` 只命名本地临时项，不进入确定性 CLI snapshot。每次写 state/journal：同目录 `0600` 临时文件 → `fsync(file)` → rename → `fsync(parent directory)`；stage/backup rename 后也 `fsync(skills root)`。JSON parse 失败、未知 version/字段、state hash 不符为 `E_INSTALL_STATE`；journal 非法或磁盘态无法按两端复核为 `E_INSTALL_RECOVERY`，均零覆盖并要求人工审阅。

### 全局卸载事务与崩溃恢复

1. `uninstall --apply` 先以 `open(uninstall.lock,'wx')` 获取全局锁，再按 Agent ID 升序获取所有已有 state 的 `sync-<agent>.lock`；任一锁已存在则释放本次已得锁并返回 `E_SKILL_CONFLICT`，不等待、不写入。普通 sync 仍只获取单 Agent 锁，因为卸载不持锁等待，不形成死锁。
2. 按 Agent ID/Skill name 完成全量预检，计算每个 old/new state canonical bytes、合并后 conflicts canonical bytes 和待删除 exact managed targets；发现不安全路径时将其作为 conflict 保留，不执行部分未记录动作。
3. 若所有 state 已为目标 bytes、无待删除 target 且 conflicts bytes 未变，直接释放锁并返回零 changes，不刷新 `recordedAt`。否则先原子写 `uninstall-journal.v1.json`，再做任何删除/状态写入。
4. 正常顺序固定为：删除并 fsync 每个 exact managed target → 原子写 conflicts 目标 bytes → 按 Agent ID 原子写各 new state → 复核所有 new hash 与 target 不存在 → 将 journal `status=committed` → 删 journal → 释放 Agent 锁和全局锁。全部 new state 和 conflicts 达到 journal 目标 hash 是 commit point。
5. 该事务只允许前向恢复：managed target 的删除不回滚为指向将被卸载包的软链。普通 I/O 异常且进程仍在时，工具立即按 journal 重试尚未完成的删除/写入；仍失败则保留 journal/锁并返回 `E_INSTALL_RECOVERY`。
6. 崩溃遗留的锁不自动判 stale。用户确认原进程已结束后显式运行 `pact uninstall --apply --recover`；它从 journal 内嵌的目标 canonical documents/hash 和 entries 验证磁盘处于 old/new/可前向的混合态，然后补齐第 4 步。任一 state/conflicts 不属于 journal 的 old/new hash，或 target 重现为未知类型/内容，均 `E_INSTALL_RECOVERY`、保留现场等人工审阅。

```ts
type UninstallJournal = {
  version: 1;
  transaction: string;
  packageVersion: string;
  status: 'prepared' | 'applying' | 'committed';
  conflicts: { path: string; oldSha256: string | null; newSha256: string; next: UninstallConflicts };
  agents: Array<{ agent: AgentId; path: string; oldSha256: string | null; newSha256: string; next: InstallState }>;
  removals: Array<{ agent: AgentId; name: string; target: string; kind: 'symlink' | 'directory'; linkText: string | null; sha256: string; removed: boolean }>;
};
```

Uninstall journal/state/conflicts 使用与 sync 相同的 `stableJson`、`0600`、file fsync、atomic rename 与 parent-directory fsync 规则；target 删除后 fsync 对应 Skills root。journal 内嵌 `next` 文档，使 npm preuninstall 中断且旧 package 被移除后，重装同/新版 PACT 仍能显式前向恢复。

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
| INV-10 | npm `package.json`、install manifest、CLI Runtime 与内置 Skills 使用同一版本/内容哈希 | 安装组件错位 | package/manifest/hash test |
| INV-11 | Agent 同步只写已知当前用户 Skills 根且不覆盖本地修改/未知来源 | 用户配置损坏 | path/conflict fixture |
| INV-12 | postinstall 不联网获取 Skills、不 spawn `npx skills add`、不静默安装重型外部依赖 | 供应链与越权安装 | static scan + isolated install test |
| INV-13 | 未检测到 Agent或可恢复同步失败时 CLI 仍可运行并准确报告 pending/conflict | 用户失去修复入口或假成功 | doctor fixture |
| INV-14 | 低层交付状态不得冒充更高层业务系统完成态 | 空壳系统被交付 | Delivery Profile/文档一致性测试 |

### 规范化树哈希算法

1. 排除任意路径段名称恰为：`node_modules`、`dist`、`dist-site`、`target`、`reports`、`.vite`、`.qoder`、`.playwright-mcp`；闭集不可由 CLI 覆盖。
2. 只记录 regular file 与 symlink，目录隐含；相对路径转 POSIX `/`、Unicode NFC，拒绝无法稳定编码的路径、绝对 symlink 或逃逸 symlink；权限位与 mtime 不入 hash。
3. 按规范化路径 UTF-8 字节升序。每条记录为：1 byte 类型（`0x66` file / `0x6c` link）+ 4 byte big-endian 路径字节长度 + 路径 UTF-8 + 8 byte big-endian 内容长度 + 内容。file 内容为原始 bytes；link 内容为 link target 的 UTF-8 bytes。
4. 依次送入 SHA-256，输出小写 64 位 hex。目标的同一算法结果必须与 provenance 相等。

Skill/资源树哈希复用同一 framing、路径规范化和 SHA-256，排除闭集只允许 `.git`、`node_modules`、`.DS_Store` 三个路径段；不接受“生成缓存”等开放描述。Skill 根必须包含合法 `SKILL.md`，不允许越界软链。manifest 的 hash 在 pack 前生成/验证，运行时对包内 source 与安装目标复算。

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

Git 变更集合固定为四者并集并去重：`git diff --name-status --find-renames <base>...HEAD`、`git diff --cached --name-status --find-renames`、`git diff --name-status --find-renames`、`git ls-files --others --exclude-standard`。rename 的旧/新路径都参与归属，delete 使用旧路径。

直接发布归属闭集：`pact/**`、`pact-*/**`、`bin/**`、`platform/**`、`docs/**`、`install-manifest.json`、根 `package.json`、`package-lock.json`、`README.md`、`CLAUDE.md` 归 `pact-skills`（稳定内部 unit ID，实际发布完整 `@vima-tech/pact`）；`products/vima-ui-admin/**` 归 UI；`templates/vima-starter/**` 归 Starter。`.pact/**` 只验证 `pact-skills`，`artifacts/**` 忽略。根 `package*.json`、`README.md`、`CLAUDE.md`、`.gitignore` 以及 `platform/registry|schemas|adapters|lib/capability-router|lib/governance|scripts/governance-check|scripts/capability-router` 属共享验证路径：在按上述规则计算 direct 后，额外把三个 unit 全加入 verification，不改变 direct 集合。任一路径命中两个直接 unit 规则即 `E_PATH_OWNERSHIP`。

### `pact` CLI

**入口**：npm `bin` 同时映射 `pact` 与 `vima-pact` 到 `bin/pact.mjs`。

| 命令 | 默认副作用 | 输出/行为 |
|---|---|---|
| `pact --help` | 无 | 主入口、三种安装方式和命令摘要 |
| `pact --version` | 无 | stdout 精确为当前 package semver 加 `\n`，stderr 为空，exit 0；`vima-pact --version` 字节相同 |
| `pact doctor [--json]` | 无 | 校验 package/manifest、逐 Agent 汇总 ready/pending/needs-sync/conflict，任一 conflict 非零 |
| `pact agent list [--json]` | 无 | 列出已知 Agent、是否检测到、Skills 根和状态 |
| `pact agent sync [--agent <id>] [--copy] [--recover] [--json]` | 注册/更新 PACT 拥有的 Skills | 默认同步全部已检测 Agent；无目标返回 pending；重复执行 no-op；`--recover` 必须同时指定单个 `--agent` |
| `pact agent install <id> [--copy] [--json]` | 可创建该已知 Agent 的 Skills 根并同步 | 未知 id 拒绝；仍执行 path/ownership/hash 预检 |
| `pact agent verify [--agent <id>] [--json]` | 无 | 复算 source/target/hash 与 state，漂移非零 |
| `pact agent adopt <id> --skill <name> [--json]` | 只写 state | 仅当既有目标与当前 source hash 完全相等时记 observed；不同内容拒绝 |
| `pact agent unadopt <id> --skill <name> [--json]` | 只写 state | 仅删除 observed 记录，目标原字节不变；managed 拒绝 |
| `pact agent remove <id> [--skill <name>] [--json]` | 删除精确 managed 目标并更新 state | observed 或任何类型/source/hash 漂移均保留并报 conflict |
| `pact install [--inspect|--repair|--upgrade]` | 默认 inspect；repair 可调用 agent sync | 本轮不安装重型外部依赖；未实现 Adapter 返回明确限制而非假成功 |
| `pact uninstall [--inspect|--apply] [--recover] [--json]` | 默认 inspect；apply 安全清理 | 对 managed exact targets 执行 remove，对 observed 只 unadopt；冲突保留并写 uninstall-conflicts，不删除未知/修改内容。`--recover` 必须与 `--apply` 同用，只接管 C2 全局卸载 journal |

所有 Agent/doctor 命令 JSON 固定为：

```ts
type SkillReport = { name: string; status: SkillStatus; method: InstallMethod | null; ownership: 'managed' | 'observed' | null; sourceSha256: string; targetSha256: string | null };
type AgentReport = { id: AgentId; detected: boolean; root: string; status: Exclude<SkillStatus,'missing'>; changes: number; skills: SkillReport[]; diagnostics: Diagnostic[] };
type CliReport = { ok: boolean; command: string; version: string; status: CliStatus; changes: number; agents: AgentReport[]; diagnostics: Diagnostic[] };
```

数组按 Agent ID、Skill name、diagnostic code/path 稳定排序。单 Agent 聚合优先级固定为 `conflict > needs-sync > pending > ready`；`manifest-broken/error` 只属于顶层。总体按“存在 detected 则忽略 undetected，否则 pending”规则聚合。退出码固定为：0=`ready` 或正常“未检测到任何 Agent”的 `pending`；1=`needs-sync`；2=`E_USAGE`；3=`E_INSTALL_MANIFEST`；4=`E_AGENT_UNKNOWN`/`E_UNSUPPORTED_PLATFORM`；5=`E_SKILL_CONFLICT`/`E_SKILL_PATH`/`E_INSTALL_STATE`/`E_INSTALL_RECOVERY`；6=`E_INSTALL_IO`。在 Linux/macOS，`list` 只要 manifest 合法就 exit 0；未知平台所有 Agent 子命令（包括 list）均 exit 4 且零写入。`verify`/`doctor` 按聚合状态退出。人读输出与 JSON 使用同一 report，不重新推导状态。

| 场景 | `ok` | `status` | agents | changes | diagnostics | exit |
|---|---:|---|---|---:|---|---:|
| detected 全 ready | true | ready | 全部报告 | 0 | [] | 0 |
| 零 detected | true | pending | 四项均 detected=false | 0 | E_SKILL_PENDING | 0 |
| detected 有 missing/旧版 | false | needs-sync | 逐 Skill missing/needs-sync | 0 | 对应诊断 | 1 |
| sync 部分 Agent 成功、另一个 conflict | false | conflict | 成功项 ready、失败项 conflict | 成功写入数 | E_SKILL_CONFLICT | 5（postinstall 自身转 0） |
| permission/EROFS/ENOSPC | false | needs-sync | 目标 Agent needs-sync | 0 | E_INSTALL_IO | 6（postinstall 自身转 0） |
| manifest/package/hash 损坏 | false | manifest-broken | [] | 0 | E_INSTALL_MANIFEST | 3（postinstall 也 3） |
| state/journal/恢复不可判定 | false | conflict | 受影响 Agent conflict | 0 | E_INSTALL_STATE/E_INSTALL_RECOVERY | 5（postinstall 自身转 0） |
| usage/未知子命令 | false | error | [] | 0 | E_USAGE | 2 |

postinstall stdout 始终只写一份上述 JSON；若可恢复 `ok:false`，stderr 只写一行“运行 pact doctor / pact agent sync 修复”，不包含绝对 HOME 或凭据。CLI 人读模式可写摘要，但 `--json` 遵循同一 truth table。

`pact install` 等价 `--inspect`；`--repair` 只对已检测 Agent 调 `sync`；`--upgrade` 只输出建议的显式命令 `npm i -g @vima-tech/pact@latest` 和当前/目标未知状态，不联网、不执行 npm。Adapter/重型环境安装尚未实现时输出 limitation、exit 1，不冒充成功。

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
loadInstallManifest(packageRoot: string): Promise<InstallManifest>;
detectAgents(userHome: string): Promise<AgentTarget[]>;
inspectAgentSkills(input: AgentSyncInput): Promise<AgentReport[]>;
syncAgentSkills(input: AgentSyncInput): Promise<AgentReport[]>;
removeAgentSkills(input: AgentRemoveInput): Promise<AgentReport[]>;
adoptAgentSkill(input: AgentAdoptInput): Promise<AgentReport>;
evaluateCompletion(evidence: CompletionEvidence[]): CompletionReport;
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
| `loadInstallManifest` | 只读 | 校验 package version、路径、Skill 列表和 source hash，不修 manifest |
| `detectAgents` | 只读 | 只检查版本化已知路径，不创建目录、不读取 Agent 凭据 |
| `inspectAgentSkills` | 只读 | state、target、source 三方核验，分类 ready/pending/needs-sync/conflict |
| `syncAgentSkills` | 用户 Agent Skills 根、PACT state | 预检后原子 link/copy；不覆盖 conflict；重复调用幂等 |
| `removeAgentSkills` | 仅 state 中的精确记录 | source/target/hash 不一致即保留并报 conflict |
| `adoptAgentSkill` | 只写 state | 只接纳与当前 source exact hash 的既有内容，ownership=observed |
| `evaluateCompletion` | 无 | 读取已校验 completionLevels，按 rank/requiredEvidence 逐级聚合，不接受调用方自定义级别 |

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
| `npm run release:pack` | 依次生成完整 `vima-tech-pact-<version>.tgz`、`vima-tech-ui-admin-<version>.tgz`、`create-vima-starter-<version>.tgz` 到 `artifacts/release/`；新 PACT tgz **替换**旧 `pact-skills-<version>.tar.gz`，总数仍恰为 3 |
| `npm pack --pack-destination artifacts/release` | 生成完整 `vima-tech-pact-<version>.tgz`；只本地打包，不 publish |
| `node platform/scripts/preinstall.mjs` | 只读校验 Node/OS，并从 npm lifecycle 必有的 `npm_config_user_agent` 解出 npm>=10；缺失/非法/低版本或不满足 C1 支持矩阵均 exit 4，零用户目录写入。普通 CLI 不执行 npm 版本门 |
| `node platform/scripts/postinstall.mjs` | 仅当 npm 明确给出 `npm_config_global=true` 时，从本包 manifest 对已检测 Agent 做非交互 best-effort sync；本地项目依赖安装固定跳过用户 Agent 写入。manifest/package/source hash 损坏输出 `CliReport` JSON 并 exit 3 使 npm 失败；无 Agent、权限、Agent conflict 等可恢复问题输出 `ok:false` 的稳定 JSON、stderr 一行修复提示但自身 exit 0，保证 CLI 可用于 doctor/sync |
| `node platform/scripts/preuninstall.mjs` | 仅 global uninstall 时幂等执行 `pact uninstall --apply` 内核；删除 exact managed、解除 observed 记录。冲突目标保留，原 state record 按 C1/C2 全局事务迁移到 state 根 `uninstall-conflicts.v1.json`，卸载内核返回 exit 5 时脚本转为 exit 0；但 `E_INSTALL_IO/E_INSTALL_STATE/E_INSTALL_RECOVERY` 不得伪装成已清理，保留 journal/锁并输出重装后运行 `pact uninstall --apply --recover` 的诊断，script 仍 exit 0 允许 npm 移除包；`--ignore-scripts` 卸载前官方要求先手工 `pact uninstall --apply` |

三个发布单元统一执行 `npm pack --pack-destination <absolute artifacts/release>` 生成真实 tgz；PACT 不再执行旧的自定义 `tar`，也不承诺 npm tgz 的 mtime/uid/gid 字节确定性，只要求同一工作树的允许/禁止文件集合、manifest 内容和包身份确定。pack 可以读取本地 lock 与 npm 配置，但禁止 registry publish、Git push、凭据输出或任何远端状态写操作。

symlink 是默认 method；只有创建 symlink 本身返回 `EPERM`、`EOPNOTSUPP` 或 `ENOSYS` 时，且该 Agent 九个目标仍全部通过预检，才允许整 Agent 回退 copy 并在报告记录 limitation。`EACCES`、`ENOENT`、`EEXIST`、路径/类型/hash 冲突和任何未知 errno 均不得回退 copy。

双 bin 只提供调用层的明确身份：成功安装后 `vima-pact` 可避免用户在命令调用时误认其他 Pact 工具；它不声称自动解决 npm prefix 中已存在的 `pact` bin。官方安装前置检查若发现冲突，要求用户先选择保留哪个包或改用轻量 Skills 安装，禁止 `--force` 覆盖未知 bin。

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
| `E_USAGE` | CLI 命令或参数非法 | PACT 命令用法错误 | 查看 `pact --help` |
| `E_INSTALL_MANIFEST` | 包版本、路径或 hash 不一致 | PACT 安装包不完整或已损坏 | 停止同步，重装匹配版本 |
| `E_AGENT_UNKNOWN` | Agent ID 不在已知闭集 | 不支持该 Agent 标识 | 使用 `pact agent list` |
| `E_SKILL_CONFLICT` | 目标存在未知来源或本地修改 | Skill 有本地修改，未覆盖 | 审阅差异后显式处理 |
| `E_SKILL_PATH` | 目标逃逸已知 Skills 根 | Skill 安装路径不安全 | 修正用户级目标配置 |
| `E_SKILL_PENDING` | 无已检测 Agent或安装脚本未运行 | PACT CLI 可用，Agent 尚未连接 | 安装 Agent 后运行 sync |
| `E_UNSUPPORTED_PLATFORM` | 不是 Linux/macOS | 当前平台尚无安全路径契约 | 不写用户目录，使用受支持环境 |
| `E_INSTALL_STATE` | state JSON/version/hash/type 非法 | PACT 安装状态损坏 | 零覆盖，备份后人工审阅或安全重建 |
| `E_INSTALL_RECOVERY` | journal 与磁盘不属于任一合法提交端 | PACT 同步恢复无法自动判定 | 保留 stage/backup/目标，人工审阅 |
| `E_INSTALL_IO` | EACCES/EROFS/ENOSPC 等持久化失败 | Agent Skills 目录不可写或空间不足 | 保留/回滚原状态，修权限/空间后重试 |

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
| install manifest | 包根 `install-manifest.json` | JSON | 入包文件 | 否 | CLI/Runtime/Skills 版本与 hash 真源 |
| PACT state home | CLI 内部解析 | absolute dir | Linux `~/.local/state/vima-tech/pact`；macOS `~/Library/Application Support/vima-tech/pact` | 否 | 每 Agent 独立 state/lock/journal，不复用或改写系统 HOME |
| PACT user home override | `PACT_ALLOW_HOME_OVERRIDE=1` + `PACT_USER_HOME` | existing owned absolute dir | 默认禁用，使用 `os.homedir()` | 否 | 容器/隔离测试显式双开关；所有 Agent/state 目标仍按 C1 闭集解析，不修改系统 HOME |
| Agent target roots | `platform/lib/agent-skills.mjs` 闭集 | known paths | 按 Agent/OS | 否 | CLI 不接受任意绝对 target |
| sync method | CLI `--copy` | enum | symlink | 否 | symlink 不可用时可回退 copy 并记录 |
| postinstall global mode | npm `npm_config_global`（只读） | literal `true`/其他 | 其他 | 否 | 只有 literal true 才自动写 Agent Skills；不持久化该环境值 |

外部产品契约防漂移：provenance 锁定两个完整规范化产品树；compatibility 另锁定 UI `package.json` exports、`dist/ai-manifest.json` 与 Agent schema 的组合 hash。产品源码变化必须更新对应 evidence/hash 并触发 governance check，不允许只改产品文件而保持声明不变。

仓库态 `npm run governance:check` 复算 UI/Starter evidence，属于维护者门禁；发布后的 `@vima-tech/pact` 不携带 products/templates，因此 `pact doctor` 只校验 registry schema 与入包资源 tree hash，把可选产品 evidence 标为 `not-installed` 并保持原 partial/blocked readiness，不尝试从缺失路径复算，也不把 not-installed 冒充 ready。

<!-- PACT:C8 -->
## C8 · 权限与安全边界

| 操作 | AI Agent | 框架维护者 | 发布维护者 | 强制边界 |
|---|---|---|---|---|
| inspect/check/plan | 允许 | 允许 | 允许 | 只读当前 repo |
| 写治理/源码 | 仅显式任务 | 允许 | 允许 | 目标 realpath 必须在 repo 内，overwrite deny 默认 |
| migration link/finalize/recover | 不默认 | 显式迁移任务允许 | 允许 | 独占迁移锁；已 verified、路径精确、保留备份；finalize 仅 unlink 精确绝对软链 |
| local pack | 不默认 | 允许 | 允许 | 输出仅在 repo 忽略目录 |
| npm publish/git push | 禁止 | 根工具不提供 | 根工具不提供 | 必须脱离本自动化另行人工执行 |
| npm 完整安装 | 允许 | 允许 | 允许 | 当前用户 npm prefix；不要求 sudo、不读取 registry token |
| Agent detect/verify | 允许 | 允许 | 允许 | 只读已知当前用户目录，不读取 Agent 凭据 |
| Agent sync/install | 用户显式安装或 postinstall best-effort | 允许 | 允许 | 只写已知 Skills 根；冲突不覆盖；state 原子记录 |
| Agent remove | 用户显式允许 | 允许 | 允许 | 只删除 state 精确拥有且仍匹配 hash/source 的目标 |

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
| agent detection | INFO | agent id, detected, skills-root-display, status | 用户绝对 HOME、Agent 凭据不记录 |
| skill sync | INFO/WARN | agent id, skill name, method, before/after status, diagnostic code | Skill 内容、任意环境变量不记录 |
| doctor | INFO | package version, manifest status, Agent 状态计数 | 用户绝对 HOME、npm 配置不记录 |

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
| Agent 分工 | Claude Code/Codex 负责推理与编码；PACT 负责规格、约束、能力、证据和完成门，客户端专属 Skill 不得成为唯一真源 |
| 自然语言安装 | 只采用官方版本化安装文档，执行 `npm i -g @vima-tech/pact` → `pact doctor` → 必要时 `pact agent sync` |
| 安装安全 | 网络文档不得授权自由拼接 shell、`curl|sh`、任意搜索结果或隐式重型依赖安装 |
| 完成声明 | 只有 Delivery Profile 对应层级的真实证据齐备才可声明；页面、演示数据、无 handler、假 API、仅单测或无法启动均不得称业务系统完成 |

R028 的五个产品方向权威入口固定为：本 `PACT.md`、根 `CLAUDE.md`、根 `README.md`、`platform/README.md`、`.pact/pact-platform-unification/docs/pact-controlled-generation-design.md`。另新建 `docs/installation.md` 作为安装操作权威文档，但不计入“五个产品方向入口”；机器完成分级真源为 `platform/registry/delivery-profiles.v1.json`。这些路径是本需求的输出位置，不是开工前需要从外部补充的输入；本文件已包含它们必须承载的全部语义与验收。

自然语言安装只认可两个发布身份：npm registry 上精确 scoped package `@vima-tech/pact`，以及 GitHub 仓库 `https://github.com/vima-tech/pact`。发现入口可读 `main/docs/installation.md`；正式远端发布的独立发布清单要求先创建 `v<package-version>` tag，再公开 npm 包，发布后文档链接固定为该 tag。当前 CR 明确不执行 Git push/tag/npm publish，只在本地验证 URL 生成规则、文档内容和 tgz；不存在远端 tag 不影响本地 pack/安装验收，也不得让 Agent改用搜索结果或镜像页面。R036 以 devDependency `skills@1.5.22` 的真实 CLI 对本地仓库 discovery，不访问远端。

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
| R027 | static scripts scan + archive listing | 无 publish/push/token 读取；恰有 `vima-tech-pact`、UI、Starter 三个本地 tgz | 脚本 |
| R028 | 文档一致性测试 + 人工复核 | CLAUDE/README/platform/design/PACT 均含统一北极星、Agent/Pact 分工和业务操作系统定义 | 脚本+人 |
| R029 | package identity assertion + `npm pack --dry-run --json` + bin smoke | 直接读取 name=`@vima-tech/pact`、private 非 true；dry-run 成功；`pact`/`vima-pact` 均能打印 help/version | 脚本 |
| R030 | tarball files assertion | 完整包含 manifest、CLI/platform/9 Skills；不含 products/templates/.pact/artifacts/用户文件 | 脚本 |
| R031 | `PACT_ALLOW_HOME_OVERRIDE=1 PACT_USER_HOME=<temp>` Codex+Claude sync fixture | 两个 Agent 均安装 manifest 全量 Skills，verify 全 ready；不修改系统 HOME | 脚本 |
| R032 | static scan + network/child blocker 下运行 postinstall + manifest hash | postinstall/installer 无 npx/curl/download/外部子进程且 blocker 不触发；runtime/resources/skills hash 全相等 | 脚本 |
| R033 | CLI agent matrix test | list/sync/install/verify 成功、未知 agent/参数按契约失败；第二次 sync changes=0 | 脚本 |
| R034 | escape/unknown/local-edit fixtures | 全部 E_SKILL_PATH/E_SKILL_CONFLICT，目标原始 bytes/hash 不变 | 脚本 |
| R035 | doctor state fixtures | ready/pending/needs-sync/conflict/manifest-broken 判定和退出码准确；repair 可收敛可恢复项 | 脚本 |
| R036 | `skills@1.5.22 add . --list` 本地真实 CLI 测试 | 九个公开 `SKILL.md` 名称唯一且全部被发现，README 明确全量 Skills 入口 | 脚本 |
| R037 | 安装文档静态测试 | 主/轻量/自然语言三入口齐备，无 curl-pipe 或非官方自由执行说明 | 脚本 |
| R038 | `pact install --inspect` smoke + help/Skill 复核 | 默认零重型安装副作用，输出限制与下一动作 | 脚本+人 |
| R039 | package/manifest/drift fixtures | 同版同 hash PASS；版本或内容漂移 doctor 非零且不写目标 | 脚本 |
| R040 | state/adopt/unadopt/remove/preuninstall fixtures | exact managed 删除；observed 只解除 state；修改/未知项按 `(agent,name,target)` 迁移到 uninstall-conflicts 并从 Agent state 移除；重复卸载 bytes/recordedAt 不变；双 Agent 不丢记录；删除后/conflicts 后/state 中途崩溃均可前向 recover；直接 apply 冲突 exit 5、preuninstall 转 exit 0 | 脚本 |
| R041 | delivery profile schema + `evaluateCompletion` 测试 + 设计文档检查 | 八级/rank/evidence 闭集和 record shape 合法；非法 record 抛 E_SCHEMA/exit 2；缺失/失败/前级阻断后级；level status 只有 achieved/blocked；stable 时 blockedAt=null；明确 Verifier 后置 | 脚本+人 |
| R042 | `npm test` + 两类 tgz 隔离安装 + `npm run verify` | scripts-enabled 的 `npm i -g --offline --prefix <temp-prefix> <tgz>` 设置双 home override 后自动同步；另跑 `--ignore-scripts` 后 doctor/repair；注入 pre/post-commit 崩溃、损坏 journal、多 Agent 独立恢复；根门禁全绿 | 脚本 |

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
| 完整包内容 | manifest 声明文件 100% 在 tgz；禁止目录 0 项 | npm pack archive test |
| Skills 同步覆盖 | 已检测 Agent × manifest Skills 100% ready | agent sync fixture |
| 同步幂等 | 第二次 sync 写入变化 0 | agent sync fixture |
| 用户修改保护 | conflict fixtures 原字节/hash 100% 保留 | installer safety test |
| 版本一致性 | package/manifest/CLI/Skill source 100% 匹配 | package integrity test |
| 安装网络副作用 | postinstall Skill 下载与重型依赖安装 0 次 | static scan + isolated install |
| 文档北极星一致性 | 5 类权威入口 100% 命中统一定义 | documentation test |

<!-- PACT:T3 -->
## T3 · 停工线（出现即停，不得继续施工）

- 来源或用户文件出现未授权的不可逆删除、覆盖；R018 只允许删除两个已验证软链接且必须保留 target 与快照备份。finalized commit point 之前按 journal 回滚，之后只在 canonical target 前向修复，不得用“先回滚”复活已退役入口。
- PACT Core 引入 Vima 源码依赖，或 generic profile 在无 Vima 时不能工作。
- Router 在非 `business-system` 输入中选择 Starter。
- 为通过门禁而抬高 UI runtime budget、跳过现有产品测试或把失败标记为 ready。
- 根脚本执行真实 `npm publish`、Git push、读取 registry token 或运行不可信模板脚本。
- package/CLI identity 被无规格变更地合并或重命名。
- npm 完整包把 UI/Starter 源码打入、postinstall 联网下载 Skill/安装重型依赖、要求 sudo 或读取 Agent/npm 凭据。
- Agent 同步准备覆盖本地修改、未知来源、普通文件/目录；安装 leaf 的父目录 realpath 逃逸已知 Skills 根；或 symlink source 不在当前 package root/不等于 manifest source。
- package/manifest/Skill hash 不一致仍继续同步，或 pending/conflict 被显示为 ready。
- 文档、CLI 或 Delivery Profile 把仅生成、仅构建、仅单测/无法启动的工程宣称为可用稳定业务操作系统。
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
- [ ] T1 的 R001–R042 全部有真实执行证据；`action-graph.json` 完成度 100%。
- [ ] 根 `README.md`、`CLAUDE.md`、产品局部约定与实际目录/命令一致。
- [ ] `npm pack` 的 `@vima-tech/pact` tgz 在隔离 prefix 可安装，两个 CLI 命令和 doctor 可用，模拟 Agent Skills 全量 ready。
- [ ] 隔离安装以 `--offline --ignore-scripts` 验证 tgz 零 runtime dependency；postinstall 再在拦截 `net/http/https/dns/child_process` 的 Node preload 下显式运行，且含哨兵 token 的输出无泄漏。
- [ ] 另有真实 scripts-enabled 全局安装 fixture：设置 `npm_config_global=true PACT_ALLOW_HOME_OVERRIDE=1 PACT_USER_HOME=<temp-user>`，npm 自动触发 pre/postinstall 后模拟 Agent 全量 ready；直接显式 postinstall 的 blocker fixture也设置同样变量。
- [ ] sync recovery 注入 prepared、部分 applied、state commit 后三种崩溃和损坏 journal；两个 Agent 并发只写各自 state，恢复无丢失更新。
- [ ] `pact uninstall --apply` 与 global preuninstall 对 managed/observed/conflict 三类目标符合 C2；注入多 Agent 并发、三个提交阶段崩溃并用 `--recover` 前向收敛；重复卸载不刷新冲突文件；`--ignore-scripts` 卸载文档要求先手工清理。
- [ ] preinstall 对 npm user-agent 缺失/非法/<10 exit 4；普通 CLI 在无 `npm_config_user_agent` 环境下 `--help`/`--version` 仍 exit 0。
- [ ] 无 Agent、禁用 scripts、本地修改、版本漂移和安全清理 fixtures 全部符合 C2/C8，不存在假成功或静默覆盖。
- [ ] 北极星、Agent/Pact 分工、三种安装入口、八级完成态和 `/pact-install` 新职责已同步所有权威文档。
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
| M5 · 产品北极星与完整 npm 发行 CR | R028–R042 | 权威文档一致；完整 tgz、CLI、manifest、Agent sync/doctor/repair、安全冲突与隔离安装全绿；根 review 重新 100% | FullStackSpec、真实业务黄金切片、Starter readiness 提升、外部 npm publish |

### 降级策略

- **可牺牲（砍宽度）**：人读 release 摘要的排版、额外 benchmark 数量、重型 monorepo 缓存、远程 MCP 外壳。
- **不可牺牲（保深度）**：Core 独立、业务系统才候选 Starter、finalized 前迁移可回滚、canonical-only 入口、备份保留、独立包身份、全部既有硬门、确定性 changed plan、默认不发布、同版包内 Skills、用户修改保护、可修复安装、北极星与完成分级、C3 全部不变量。
- **触发条件**：非必要打磨导致核心门连续两轮无进展时，只删除 P2 打磨，不降低任何 P0/P1 验收。
- **决策人**：renmengkai；涉及冻结需求时必须走 `/pact-change`。

判据：宁可不增加更多 adapter 和自动化外壳，也不交付一个会误选 Starter、无法回滚或门禁不绿的统一仓库。
