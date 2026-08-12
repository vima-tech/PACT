# P5 · 需求清单（R-ID）

> **本页由 `pact-book.sh` 从 `PACT.md` 自动生成，请勿手改。**
> 改内容请改 `PACT.md`，然后重新 `pact-book.sh --build`；`--check` 会抓出手改导致的漂移。
> 锚点 `<!-- PACT:P5 -->`｜真源位置：`PACT.md` 第 184–255 行

← [P4 核心场景](../p/P4-核心场景.md) ｜ [P6 非目标（明确不做）](../undefined) →

---

| R-ID | 类型 | 描述（可判真假） | 验收标准（可量化） | 优先级 | 依赖 | 来源 | 假设 |
|---|---|---|---|---|---|---|---|
| [R001](../r/R001.md) | 架构 | PACT Core 零 Vima 源码依赖 | Core 路径扫描无 Vima import，Core 自测可独立运行 | P0 | — | 用户+设计 | — |
| [R002](../r/R002.md) | 数据 | 统一声明 3 个产品能力与 2 个 adapter | registry 恰有对应 5 个稳定 ID，均含限制/readiness | P0 | [R001](../r/R001.md) | 设计 | — |
| [R003](../r/R003.md) | 功能 | 按需求类别选择 3 种 profile | 4 个基准输入输出与期望完全一致 | P0 | [R002](../r/R002.md) | 用户 | — |
| [R004](../r/R004.md) | 架构 | Vima 在 profile 中均为可选 | 禁用 Vima 后 generic 仍通过；另两类返回可解释候选 | P0 | [R003](../r/R003.md) | 用户 | — |
| [R005](../r/R005.md) | 边界 | 非法或信息不足时拒绝生成 | 每类错误均返回非零码和稳定 code/path | P0 | [R007](../r/R007.md) | UI 约定 | — |
| [R006](../r/R006.md) | 治理 | readiness 变更必须显式且有证据 | validator 拒绝无 evidence 的 ready | P1 | [R007](../r/R007.md) | 评估 | — |
| [R007](../r/R007.md) | 数据 | 六类治理 JSON 全部有 schema 与校验器 | 合法 fixture 全过、每类非法 fixture 至少 1 个失败 | P0 | — | 设计 | — |
| [R008](../r/R008.md) | 兼容 | 版本+哈希+契约版本+发布状态判兼容 | 同 semver 不同 hash fixture 被识别为冲突 | P0 | [R007](../r/R007.md) | 评估 | — |
| [R009](../r/R009.md) | 测试 | 路由基准覆盖四类输入 | 四类 fixture 全部自动断言 | P0 | [R003](../r/R003.md) | 设计 | — |
| [R010](../r/R010.md) | 真实性 | 不虚报 Starter 未完成能力 | registry 含 C1 固定的 4 个 Starter/adapter 限制 ID | P0 | [R002](../r/R002.md) | 评估 | — |
| [R011](../r/R011.md) | 迁移 | 两产品进入约定目录 | 两目录存在且源码清单与规范化来源一致 | P0 | [R012](../r/R012.md) | 用户 | — |
| [R012](../r/R012.md) | 追溯 | 记录来源与规范化哈希 | provenance schema 通过且字段完整 | P0 | — | 评估 | — |
| [R013](../r/R013.md) | 边界 | 导入快照不包含闭集定义的可再生产目录 | link switch 前的 import manifest 对 8 个目录段零记录，调用方不能追加排除项 | P0 | [R011](../r/R011.md) | 约定 | — |
| [R014](../r/R014.md) | 安全 | 导入冲突时无覆盖无删除 | 冲突 fixture 失败且源/目标 hash 不变 | P0 | [R012](../r/R012.md) | 评估 | — |
| [R015](../r/R015.md) | 兼容 | UI 包身份与公开面保持 | package name 不变，exports 清单测试通过 | P0 | [R011](../r/R011.md) | UI package | — |
| [R016](../r/R016.md) | 兼容 | Starter CLI 身份和模板真源保持 | CLI name 不变且 `check:template` 通过 | P0 | [R011](../r/R011.md) | Starter 约定 | — |
| [R017](../r/R017.md) | 构建 | 根级串行编排各自门禁 | fixture 验证顺序/失败停止；产品迁入后同一命令跑真实门禁 | P0 | [R007](../r/R007.md),[R019](../r/R019.md) | 评估 | **采用轻量 Node 编排，不引入 Nx/Turbo** |
| [R018](../r/R018.md) | 迁移 | 退役两个旧绝对路径入口 | `finalized` 后两路径均不存在（含 dangling symlink），两个 canonical target 与两份备份 hash 一致，统一路径产品门通过 | P0 | [R011](../r/R011.md),[R017](../r/R017.md) | 用户授权 | **只 unlink 已验证指向 canonical target 的两个精确软链接；不删除备份** |
| [R019](../r/R019.md) | 发布 | 三个独立 release unit | registry 恰有 3 个 ID 且命令字段完整 | P0 | [R007](../r/R007.md) | 用户 | — |
| [R020](../r/R020.md) | 功能 | Git 路径映射直接影响单元 | fixture 的 added/modified/deleted 均映射正确 | P0 | [R019](../r/R019.md) | 设计 | — |
| [R021](../r/R021.md) | 兼容 | 依赖影响与发布影响分离 | UI 公开变更触发 Starter verify 但不强制 Starter release | P0 | [R020](../r/R020.md) | 设计 | — |
| [R022](../r/R022.md) | 数据 | release plan 稳定输出 JSON 与摘要 | 同输入两次输出字节一致 | P1 | [R020](../r/R020.md) | 用户 | — |
| [R023](../r/R023.md) | 边界 | 基线未知或归属冲突时失败 | 3 个失败 fixture 均非零退出 | P0 | [R019](../r/R019.md) | 设计 | — |
| [R024](../r/R024.md) | 质量 | UI 全部门禁通过且不抬 size 阈值 | 四命令 exit 0，预算配置未变宽 | P0 | [R015](../r/R015.md) | AGENTS+评估 | — |
| [R025](../r/R025.md) | 质量 | Starter 全部门禁与本地 pack 通过 | 4 类命令 exit 0，生成 CLI tgz 且无远程发布 | P0 | [R016](../r/R016.md) | CLAUDE | — |
| [R026](../r/R026.md) | 质量 | PACT Core 与物料全门禁通过 | self-test/check/review exit 0 | P0 | [R001](../r/R001.md),[R017](../r/R017.md) | PACT 协议 | — |
| [R027](../r/R027.md) | 安全 | 真实外部发布默认不可达 | 根 scripts 无 publish/push/token 读取；仅生成 3 个本地归档 | P0 | [R019](../r/R019.md) | 访谈 | — |
| [R028](../r/R028.md) | 产品 | 终极目标与最高判断标准进入五个权威入口 | 根 `CLAUDE.md`、根 README、平台 README、指定设计文档与本 PACT 对目标、Agent/Pact 分工和“业务操作系统”定义一致；安装文档另验安装语义 | P0 | [R001](../r/R001.md) | 用户 | **PACT 是控制平台，不替代 Claude Code/Codex** |
| [R029](../r/R029.md) | 发布 | 提供公开完整包 `@vima-tech/pact` 与两个 CLI 名 | 直接断言 `package.json.name`、`private!==true`、双 bin；`npm pack --dry-run --json` 成功且两命令 help/version smoke 通过 | P0 | [R019](../r/R019.md) | 用户 | — |
| [R030](../r/R030.md) | 交付 | 完整包携带 Core、Runtime、治理资源、Installer 和全量 Skills | tarball 清单包含 9 个 Skill 目录、CLI、platform 核心与 install manifest，且不包含 UI/Starter 源码和 `.pact` 私有物料 | P0 | [R001](../r/R001.md),[R029](../r/R029.md) | 用户 | — |
| [R031](../r/R031.md) | 安装 | npm 安装后自动向已检测 Agent 注册全量 Skills | `PACT_ALLOW_HOME_OVERRIDE=1` + `PACT_USER_HOME=<temp>` 模拟 Codex/Claude，非交互同步后每个目标恰有 manifest 所列 Skills 且验证通过，系统 HOME 不变 | P0 | [R030](../r/R030.md) | 用户 | — |
| [R032](../r/R032.md) | 供应链 | 自动注册只使用包内同版本 Skills | 安装器源码与测试证明不 spawn `npx skills add`、不下载 Skill；manifest 的 version/hash 可复算 | P0 | [R030](../r/R030.md) | 用户 | — |
| [R033](../r/R033.md) | 功能 | CLI 提供 Agent 检测、同步、定向安装与验证 | `pact agent list/sync/install/verify` fixture 输出稳定 JSON/人读状态，重复 sync 无额外变化 | P0 | [R031](../r/R031.md) | 用户 | — |
| [R034](../r/R034.md) | 安全 | Skill 同步路径受控且不覆盖本地修改/未知来源 | 路径逃逸、普通文件占位、本地 hash 改动 fixtures 全部拒绝并保留目标字节不变 | P0 | [R033](../r/R033.md) | 用户 | — |
| [R035](../r/R035.md) | 修复 | `pact doctor` 准确报告 CLI、manifest 和 Agent Skills 状态 | 无 Agent、pending、needs-sync、conflict、ready fixtures 全部判定正确；可恢复问题不破坏 CLI 安装 | P0 | [R033](../r/R033.md),[R034](../r/R034.md) | 用户 | — |
| [R036](../r/R036.md) | 兼容 | 保留 `npx skills add vima-tech/pact -g` 轻量全量 Skill 入口 | README 明确无需模块选择、只装 Skills；以 devDependency 固定的 `skills@1.5.22` 真实 CLI 对本地仓库执行 `add . --list` 并发现九个唯一 Skill | P1 | [R030](../r/R030.md) | 用户 | — |
| [R037](../r/R037.md) | 文档 | 自然语言安装只路由到官方确定性安装流程 | 官方安装文档给出“安装完整 PACT”的 Agent 步骤：npm 主安装→doctor→必要时 sync，不含 `curl|sh` 或任意搜索结果执行 | P1 | [R029](../r/R029.md),[R035](../r/R035.md) | 用户 | — |
| [R038](../r/R038.md) | 边界 | `/pact-install`/`pact install` 负责修复与可选环境/Adapter，不静默装重型依赖 | Skill 与 CLI help 明确职责；默认执行只 inspect/同步，不安装 JDK、数据库、浏览器、Docker、常驻服务 | P0 | [R035](../r/R035.md) | 用户 | — |
| [R039](../r/R039.md) | 版本 | CLI、Runtime、Skills 与 manifest 同版并支持升级后再同步 | package version 与 manifest version 相等；版本/hash 漂移由 doctor 检出，sync 只采用当前包内容 | P0 | [R030](../r/R030.md),[R035](../r/R035.md) | 用户 | — |
| [R040](../r/R040.md) | 生命周期 | 安装状态记录 PACT 精确拥有/观察的目标并支持 adopt/unadopt/remove/uninstall 安全清理 | state 记录 agent/source/target/method/ownership/hash；remove/preuninstall 只删除仍匹配 managed，observed 只解除记录，修改项保留并出冲突报告 | P1 | [R034](../r/R034.md),[R039](../r/R039.md) | 用户 | — |
| [R041](../r/R041.md) | 真实性 | 交付状态不得把低层完成冒充可用稳定业务系统 | 权威文档固定八级状态；Profile schema 与聚合器验证 evidence 记录形状和逐级阻断；本轮不声称已实现真实 Delivery Verifier 或 Starter ready | P0 | [R028](../r/R028.md) | 用户 | **本轮写入标准与聚合，不虚报证据执行器** |
| [R042](../r/R042.md) | 质量 | 完整发行与 Agent 接入有独立自动测试和本地安装验收 | npm test 覆盖 pack/CLI/detect/sync/conflict/pending/repair/version；release pack 仍仅本地产物且全量 verify 通过 | P0 | [R029](../r/R029.md)–[R041](../r/R041.md) | 用户 | — |

### 横切项检查

- [x] 权限/角色：仓库工具按 P3/C8 仅允许当前仓库与显式输出路径；无业务 RBAC。
- [x] 输入校验：[R005](../r/R005.md)、[R007](../r/R007.md)、[R014](../r/R014.md)、[R023](../r/R023.md)、[R033](../r/R033.md)–[R035](../r/R035.md)。
- [x] 错误处理/回滚/幂等：[R014](../r/R014.md)、[R022](../r/R022.md)、[R033](../r/R033.md)–[R040](../r/R040.md)；迁移采用复制验证后切换，Skill 同步使用受控路径、hash 与状态记录。
- [x] 破坏性操作二次确认：真实发布仍不可达；旧入口退役只在来源、目标、备份哈希和软链目标全部确认后，精确 unlink 两个软链接。
- [x] 分页/排序/性能：本地小规模 registry，无分页；T2 约束验证时长与确定性。
- [x] 审计/追溯：[R008](../r/R008.md)、[R012](../r/R012.md)、[R022](../r/R022.md)、[R032](../r/R032.md)、[R039](../r/R039.md)、[R040](../r/R040.md)。
- [x] 敏感信息：不读取、不记录 registry token；见 [R027](../r/R027.md)。
- [x] 国际化/时区/单位：治理 JSON 使用 UTF-8，时间使用 RFC 3339 UTC，哈希字节单位；CLI 人读文案为中文。

### 覆盖声明

| 输入类别 | 已归类位置 |
|---|---|
| 用户关于可控业务生成、PACT 可选对接和三阶段迁移的指令 | [R001](../r/R001.md)–[R010](../r/R010.md),[R017](../r/R017.md)–[R027](../r/R027.md)，P6 |
| PACT/UI/Starter 的现状代码与局部约定 | [R011](../r/R011.md)–[R018](../r/R018.md),[R024](../r/R024.md)–[R026](../r/R026.md)，P7 |
| ClearWorks 失败复盘与整体设计 | [R002](../r/R002.md)–[R010](../r/R010.md)，A4，[D006](../idx/D-ID决策索引.md#d006)/[D008](../idx/D-ID决策索引.md#d008)，C11 |
| 8 项来源冲突 | [D001](../idx/D-ID决策索引.md#d001)–[D008](../idx/D-ID决策索引.md#d008) |
| 用户关于终极目标、PACT/Agent 分工和业务操作系统交付的讨论 | [R028](../r/R028.md),[R041](../r/R041.md)，P1/P2/P4/P8，A4，C11 |
| 用户关于三种安装方式、完整 npm 包、Skills 自动同步和 `/pact-install` 新职责的讨论 | [R029](../r/R029.md)–[R040](../r/R040.md),[R042](../r/R042.md)，P4，A2/A3/A5，C1–C9，T1–T5 |

以上输入已全部归类为 [R001](../r/R001.md)–[R042](../r/R042.md)、非目标、约束或风险；这是 S8 来源反扫的审计结论，不是运行时代码需要重新推导的条件。
