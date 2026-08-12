# PACT 变更记录

> 创建日期: <YYYY-MM-DD>
>
> **PACT.md 冻结后的任何改动都必须在此留一行。** 规格漂移是最贵的债。
> 每条记：日期 / 改了哪个锚点 / 改成什么 / 为什么 / 影响哪些 R-ID / 是否需重跑冷读门。

| 日期 | 锚点 | 改动 | 原因 | 影响 R-ID | 重跑门禁 |
|---|---|---|---|---|---|
| 2026-07-26 | `C1` | `phone` 字段加索引 | 列表查询 P95 超阈值 | R004 | lint |
| 2026-07-27 | `P6` | 把「导出」从非目标移入 M2 | 用户裁定 D007 | 新增 R030 | lint + 冷读 |
| 2026-08-11 | `P4`,`P5`,`A5`,`C1`–`C5`,`C8`,`C9`,`T1`–`T5` | R018 从永久兼容软链改为 canonical-only finalized；新增 D009、finalized 状态、独占锁/journal 恢复协议与备份保留约束 | 用户明确要求直接由 PACT 管理两个项目并在修改后删除软链接；首轮 CR 冷读要求补齐并发、崩溃恢复、精确链接和产品门时点 | R012,R014,R018,R026 | lint + graph + book + 冷读 |
| 2026-08-11 | `P1`–`P8`,`A1`–`A5`,`C1`–`C9`,`C11`,`T1`–`T5` | 新增终极业务操作系统交付目标、Agent/Pact 分工、三种安装入口、`@vima-tech/pact` 完整发行、包内 Skills 自动注册、doctor/sync/repair、安全冲突与生命周期；新增 D010–D014 和 R028–R042 | 用户确认 PACT 的终极目标是配合 Claude Code/Codex 快速、规范、准确、可用、稳定地交付业务操作系统，并要求 npm 完整安装成为主入口且同时获得 Agent Skills | R028–R042 | lint + graph + book + 冷读 |
| 2026-08-11 | `C1`–`C7`,`C11`,`A3`,`T1` | 完整发行 CR 第 9 轮冷读回填：固定九个 Skill、Linux/macOS Agent 路径、三归档替换、source/ownership state、每 Agent 事务、adopt/remove、CLI JSON/退出码、global-only postinstall、离线边界、文档路径和八级证据 | 零知识 Agent 找到归档、路径、状态、恢复接口和公共契约仍需猜测，判定 FAIL | R029–R042 | lint + graph + book + 冷读复核 |
| 2026-08-11 | `C1`–`C7`,`C11`,`T1`–`T4` | 完整发行 CR 第 10 轮冷读回填：补直接发布路径、唯一 npm pack 协议、runtime/resources hash、升级判定、state 路径、同步 lock/journal/recover、`PACT_USER_HOME` 隔离、missing 聚合、平台退出码、已安装 registry 语义、completionLevels schema/聚合器、官方 URL 与动态网络阻断验收 | 第二个零知识 Agent 找到发布映射、完整性、事务和端到端验收仍不闭合，判定 FAIL | R029–R042 | lint + graph + book + 冷读复核 |
| 2026-08-11 | `P5`,`C1`–`C7`,`C11`,`T1`,`T3` | 完整发行 CR 第 11 轮冷读回填：分离 symlink leaf/source 安全与树 hash、每 Agent 独立 state、检测项聚合、stable blockedAt=null、公开 recover、双开关 home override、固定 skills CLI 1.5.22、postinstall 退出、copy fallback errno 和五权威入口 | 第三个零知识 Agent 找到 symlink、并发 state、状态聚合和验收口径仍存在冲突，判定 FAIL | R028–R042 | lint + graph + book + 冷读复核 |
| 2026-08-11 | `P5`,`C1`–`C7`,`C11`,`T1`–`T4` | 完整发行 CR 第 12 轮冷读回填：补精确 npm files allowlist/runtime 闭包、root ownership、I/O/state/recovery 错误、journal schema/fsync、CliReport truth table、真实 scripts-enabled 安装、preuninstall/unadopt、bin 冲突边界、远端 tag 后置和 evidence record 范围 | 第四个零知识 Agent 找到完整生命周期、完整性传递闭包和恢复验收仍需猜测，判定 FAIL | R028–R042 | lint + graph + book + 冷读复核 |
| 2026-08-11 | `C1`,`C4`,`C5`,`T1` | 完整发行 CR 第 13 轮冷读回填：统一 CompletionEvidence/Report/status 与 E_SCHEMA 失败语义；固定 uninstall-conflicts schema、迁移/去重/原子写/重装语义和 exit；分离 lifecycle npm 版本门与普通 CLI Node/OS 门 | 第五个零知识 Agent 找到完成度接口冲突、卸载冲突生命周期和无 npm user-agent 的 CLI 分支未定义，判定 FAIL | R029,R035,R039,R040,R041,R042 | lint + graph + book + 冷读复核 |
| 2026-08-11 | `C1`,`C2`,`C4`,`C5`,`T1` | 完整发行 CR 第 14 轮冷读回填：把 uninstall 收敛为独立跨 Agent 全局事务，固定全局锁、Agent 锁顺序、journal schema、写顺序、commit point、只前向 recover 入口；重复卸载不刷新 recordedAt | 第六个零知识 Agent 找到卸载误复用 sync journal、全局 conflict 文件并发丢更新及幂等语义冲突，判定 FAIL | R034,R040,R042 | lint + graph + book + 冷读复核 |

## 何时必须重跑冷读门
- 改动涉及 `P1/P2/P4/P5/P6`（意图与范围层）→ **必须**重跑。
- 只改 `C*` 的字段细节且不影响语义 → 跑 lint 即可。
- 新增或推翻 `A5` 决策 → **必须**重跑，并保留旧决策为「已否决」而不是删掉。

> **不要删除历史决策。** 推翻某条 D-ID 时，新增一条 D-ID 说明为什么推翻，
> 旧条目标 `已被 D0xx 取代`。删除等于抹掉后人判断的依据。
