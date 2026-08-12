# 零知识冷读门（Cold-Start Gate）

> 创建日期: 2026-08-11
>
> 判据：全新 Agent 只读 `PACT.md`；追问为空、无矛盾、计划不跑偏才 PASS。每轮追加保留。

## 第 1 轮 · 2026-08-11 · 视角 A

**冷读 agent 的追问清单**

1. 草稿是否已获冻结/施工授权 → 回填 `P7`：用户本轮已明确授权三阶段持续施工。
2. “四类治理 JSON”准确边界 → 回填 `C1`：统一为六类固定文档与路径。
3. Profile、adapter schema 与 Router 真值表 → 回填 `C1/C4`。
4. migration plan/apply/verify 边界、状态、staging/backup/恢复 → 回填 `C2/C5`。
5. 精确排除规则和目标冲突 → 回填 `C2/C3`，排除项改为 8 个目录段闭集。
6. Git diff 语义与路径归属 → 回填 `C4`。
7. pack 是 dry-run 还是真实 tarball → 回填 `C5/T1/T4`，统一为 3 个本地归档。
8. 排除依赖后如何安装 → 回填 `P7/C5/T4`，新增显式 bootstrap。

**冷读 agent 发现的矛盾**

- 四类/六类治理口径冲突 → 已统一为六类。
- migration 默认只读与切换软链冲突 → 已拆 plan/verify 只读与唯一 apply 写入口。
- dry-run 不产 tarball → 已统一为本地真实 pack，不做 publish。
- evidence 只有 path 却要求 hash → 已改为 `{path,sha256}`。
- 哈希 framing、排除闭集、状态持久化、changed-path、依赖环境不明确 → 已逐项补成可执行契约。
- “无网络写”不可证明 → 改为可静态验证的“无远端状态写操作”，不声称网络隔离。
- 外部 Manifest/产品约定可能漂移 → provenance 锁产品树，compatibility 锁公开契约组合 hash。

**它的实现计划是否跑偏**：否；十步顺序与 M0–M3 一致。

**判定**：FAIL

**本轮回填了什么**：上述八项追问和七类矛盾全部回填 P7、C1–C5、C7、T1/T4；需要全新 Agent 再冷读。

## 第 2 轮 · 2026-08-11 · 视角 A

**冷读 agent 的追问清单**

1. 五个 capability/两个 adapter 的初始 readiness、限制、证据、compatibility 值 → 回填 `C1` 固定表。
2. 三个 profile 的 requiredChecks 集合 → 回填 `C1` 固定表。
3. linked 后 provenance 应 hash 软链、备份还是目标 → 回填 `C2`：hash snapshotPath 与 targetPath，旧入口只验 realpath。

**冷读 agent 发现的矛盾**

- M0 依赖后续 M1/M2 的需求 → 重排 `T5` 为依赖有效的 M0 治理、M1 workspace、M2 changed plan、M3 收尾。
- R010 限制为任意字符串无法验收 → limitations 改稳定枚举并固定 4 个 Starter/adapter 限制 ID。
- provenance 的迁移前后校验时点不清 → 增加 planned/linked phase、nullable importedAt 与各阶段存在性规则。

**它的实现计划是否跑偏**：否，但原里程碑偏序不可直接施工，已修正。

**判定**：FAIL

**本轮回填了什么**：C1/C2/P5/T1/T5；需要第三轮全新 Agent 复核。

## 第 3 轮 · 2026-08-11 · 视角 A

**冷读 agent 的追问清单**

1. R013 扫描的是导入瞬间还是最终 workspace → 回填 `P4/P5/C3/T1`：只验 bootstrap/build 前的 import manifest 与 staging。
2. failed 状态能否直接 inspect → 回填 `C2`：只能 rollback，回到 source 后才允许 inspect。

**冷读 agent 发现的矛盾**

- 最终 workspace 必然出现 dist/node_modules/target，与零命中冲突 → 导入快照和后续验证产物分开定义。
- M0 仍依赖 M1 的产品身份/路径 → T5 改成严格依赖顺序：M0 工具安全前置，M1 workspace，M2 live 治理数据，M3 release/收尾。

**它的实现计划是否跑偏**：原先不能按里程碑施工；修正后每个跨里程碑依赖只指向前序。

**判定**：FAIL

**本轮回填了什么**：P4/P5/C2/C3/T1/T5；需要第四轮全新 Agent 终审。

## 第 4 轮 · 2026-08-11 · 视角 A

**冷读 agent 的追问清单**

1. migration 如何在导入、bootstrap/验证、切链之间暂停 → 回填 `C2/C5` 的 `--until staged|linked` 与绑定 target hash 的 verification report。
2. 两个 adapter 的 consumes/provides/requiredCapabilities → 回填 `C1` 固定表。
3. planned 阶段 snapshotPath 的含义 → 回填 `C1/C2`：等于 originalPath；linked 后切为 backupPath。

**冷读 agent 发现的矛盾**

- 唯一一次 apply 无法同时满足“不隐式安装”和“验证后才切链” → 改为同一受控入口的两段可重入调用，中间显式 bootstrap/verify。

**它的实现计划是否跑偏**：否；M0–M3 顺序正确，M1 接口原先缺少暂停点，现已补齐。

**判定**：FAIL

**本轮回填了什么**：C1/C2/C5；需要第五轮全新 Agent 只核阻断项。

## 第 5 轮 · 2026-08-11 · 视角 A

**冷读 agent 的追问清单**

1. adapter consumes/provides 引用 capability 还是 support → 回填 `C1`：引用 support ID，requiredCapabilities 才引用 capability ID。
2. staged 时文件在 staging 还是 target → 回填 `C2/C5`：先 staging 校验，再原子 rename 到 target；staged 精确定义为 target 就位、staging 消失、旧入口未切。
3. business-system 的 UI adapter 候选和多 preferred 行为 → 回填 `C1` 完整 optional 集合、真值表与集合展开规则。

**冷读 agent 发现的矛盾**：上述三项会阻断 schema、迁移状态机和 Router，均已消除。

**它的实现计划是否跑偏**：否；M0–M3 无环，阻断集中在三项类型/时点定义。

**判定**：FAIL

**本轮回填了什么**：C1/C2/C5；需要第六轮全新 Agent 最终确认。

## 第 6 轮 · 2026-08-11 · 视角 A

**冷读 agent 的追问清单**：无。

**冷读 agent 发现的矛盾**：无。

**它的实现计划是否跑偏**：否。计划严格为 M0 Core/schema/provenance → M1 staged import/bootstrap/产品门禁/link → M2 live governance/Router → M3 changed release/归档/总门。

**判定**：PASS

**本轮回填了什么**：无；规格可冻结。

## 第 7 轮 · 2026-08-11 · R018 finalized CR

**冷读 agent 的追问清单**

1. 两次 unlink 与 provenance/state 跨文件提交如何从崩溃恢复。
2. 如何阻止并发迁移写与预检后的路径替换。
3. “精确软链接”按 link text 还是 realpath 判定。
4. finalized 使用哪份产品门报告，提交后门失败如何处理。

**冷读 agent 发现的矛盾**：finalized 不可 rollback 与 T3 原“先回滚”口径冲突；原契约没有 commit point、journal 或锁，无法排除 alias 已缺失但 state 仍 linked。

**它的实现计划是否跑偏**：目标正确，但在无恢复协议下实施有误删与半提交风险。

**判定**：FAIL

**本轮回填了什么**：C2/C3/C5/C8/T3 增加独占 write lock、严格绝对 link text、绑定当前 target hash 的产品报告、finalize journal、provenance commit point、显式 crash recovery 与提交后前向修复规则。

## 第 8 轮 · 2026-08-11 · R018 finalized CR 复核

**冷读 agent 的追问清单**：无。

**冷读 agent 发现的矛盾**：无。

**它的实现计划是否跑偏**：否。计划为 linked 前置与独占锁 → 全量无副作用预检 → journal → 两个精确 unlink → hash/缺失复核 → provenance commit point → state finalized → canonical 产品门；崩溃按 commit point 恢复。

**判定**：PASS

**本轮回填了什么**：无；R018 finalized CR 可施工。

## 第 9 轮 · 2026-08-11 · 完整发行与 Agent 接入 CR

**冷读 agent 的追问清单**

1. 九个公开 Skill 的精确 name/目录和 `/pact-install` 归属。
2. 四类 Agent 在受支持 OS 上的检测信号、Skills 根和 universal 创建规则。
3. 完整 PACT tgz 是替换旧 Skills tar 还是成为第四份归档。
4. SkillRecord 缺 canonical source，无法安全删除软链。
5. 同内容无 state 的目标是否接管，冲突通过什么公开命令恢复。
6. 同步事务是跨 Agent 全局还是每 Agent 独立。
7. CLI JSON schema、状态优先级和退出码。
8. upgrade 是否联网执行、本地依赖安装是否允许 postinstall 写用户 Agent 目录。
9. Node/npm/OS 与离线依赖矩阵。
10. 权威文档、安装文档、Delivery Profile 的精确路径和八级状态证据。

**冷读 agent 发现的矛盾**

- R027 三份归档与新增 PACT tgz 可能形成四份。
- state 无 source/ownership 却要求精确安全清理。
- A3/C2 的事务范围不一致，conflict 没有公开恢复入口。
- Agent 路径、Skills 清单、CLI 结构、升级、本地安装副作用和八级状态进入条件不足以黑盒验收。

**它的实现计划是否跑偏**：否；方向与 M5 一致，但上述细节会迫使实现者猜测危险用户目录写入和公开接口。

**判定**：FAIL

**本轮回填了什么**：C1 固定九个 Skill、Node/npm/Linux/macOS、四 Agent 路径、source/ownership state、八级证据和文档路径；C2 固定每 Agent 事务、observed/adopt/remove；C4/C5/C6 固定 CLI schema/退出码/恢复接口；C5 明确完整 tgz 替换旧 tar，总数仍三份；C7/C8 固定 global-only postinstall 与离线边界。等待第 10 轮全新 Agent 复核。

## 第 10 轮 · 2026-08-11 · 完整发行与 Agent 接入 CR 复核

**冷读 agent 的追问清单**

1. 完整包 `bin/platform/docs/manifest/package` 的直接 release-path 归属。
2. PACT tgz 是 npm pack 还是旧固定元数据 tar。
3. manifest 如何锁 CLI/Runtime/资源 hash。
4. managed symlink 升级时 needs-sync/conflict 的优先判定。
5. Linux/macOS state 精确目录。
6. 同步并发、半写、崩溃恢复协议。
7. tgz/CLI 隔离测试如何注入 user home。
8. missing 如何聚合，未知平台 list 的退出码。
9. 用户 npm prefix 不可写时如何坚持无 sudo。
10. Skill hash 排除闭集、`--version`、已安装 registry evidence、completionLevels schema/聚合器、官方 URL和动态无网络验证。

**冷读 agent 发现的矛盾**

- 新完整包路径不触发 direct release；旧 tar 与 npm tgz 协议并存。
- manifest 只锁 Skills；state/升级和九目标事务无法唯一实现。
- 隔离 HOME、missing/平台状态、可选产品 evidence 和八级机器真源没有闭合。

**它的实现计划是否跑偏**：否；顺序正确，但关键发布、事务和机器契约仍需猜测。

**判定**：FAIL

**本轮回填了什么**：C1/C4 固定完整包直接归属与共享验证；C1/C3 固定 runtime/resources/Skills hash 与排除闭集；C5 删除旧 tar 语义、统一 npm pack 三 tgz；C1/C2/C7 固定 state 路径、`PACT_USER_HOME`、升级/missing 聚合和 per-Agent lock/journal/recover；C4/C6 固定 version/平台退出；C7/C11 固定可选 registry 和官方来源；C1/C5/T1 固定 completionLevels/evaluateCompletion 与离线+动态 blocker 验收。等待第 11 轮全新 Agent 复核。

## 第 11 轮 · 2026-08-11 · 完整发行与 Agent 接入 CR 再复核

**冷读 agent 的追问清单**

1. symlink leaf 父目录与 package source 两端安全、link target hash 的精确定义。
2. 多 Agent 如何避免共享 state 丢失更新，升级时 symlink 如何稳定判 needs-sync。
3. 未检测 Agent 是否参与总体聚合，stable 时 blockedAt 返回什么。
4. recover 是否公开参数，home override 是否允许生产任意改根。
5. Skills CLI 兼容版本/真实 discovery、private 验收、postinstall 退出、copy fallback errno、五权威入口闭集。

**冷读 agent 发现的矛盾**

- 正常 symlink 解引用到 package root，却可能被“target realpath 必须在 Skills 根”误杀。
- 每 Agent 锁共写一个 state 会丢更新；任意 undetected=pending 会让正常单 Agent 永不 ready。
- completion stable 没有合法 blockedAt；recover/home/discovery/postinstall 验收不唯一。

**它的实现计划是否跑偏**：否，但上述均涉及用户目录写入、公开兼容或完成声明，不能靠实现者补常识。

**判定**：FAIL

**本轮回填了什么**：C1/C2/T3 分离 leaf 父目录与 package source 安全，symlink hash 定义为解引用 Skill 树；每 Agent 独立 state/lock/journal；总体忽略 undetected、零 detected 才 pending；stable blockedAt=null；C4 公开 `--recover`；home override 需双开关和 owned absolute dir；R036/T1 固定真实 `skills@1.5.22` discovery；R029 改直接断言 private；C5 固定 postinstall report/exit 与 symlink fallback errno；C11 明确五个方向入口。等待第 12 轮全新 Agent 复核。

## 第 12 轮 · 2026-08-11 · 完整发行与 Agent 接入生命周期复核

**冷读 agent 的追问清单**

1. R042 如何以 global 变量触发真实 postinstall，是否要测 scripts-enabled 自动链路。
2. npm uninstall、双 bin collision、tarball allowlist、Runtime 传递闭包。
3. Skills/state 根 symlink/owner、I/O 和损坏 state/journal 分类、持久化格式/fsync。
4. CliReport 全场景 truth table、删除冲突目标、observed 解除接管、未知平台/低版本。
5. 远端版本 tag 在本轮不发布时如何验收，R041 evidence 由谁可信产生。

**冷读 agent 发现的矛盾**

- 直接 postinstall 未设 global 却要求同步；自动安装和卸载闭环缺验收。
- 允许文件/执行闭包、state/journal 和错误语义不闭合。
- conflict 删除、observed、远端 tag、R041 boolean evidence 存在未定义或过度承诺。

**它的实现计划是否跑偏**：否；主链正确，但完整生命周期与崩溃安全仍不足以无猜测施工。

**判定**：FAIL

**本轮回填了什么**：C1 固定 npm files allowlist、全部 runtime import 闭包/package hash、root symlink/owner/mode；C2 固定 canonical state/journal、fsync、恢复和 conflict 删除路径；C4/C5/C6 固定 unadopt/uninstall/preuninstall、truth table、I/O/state/recovery 错误、copy errno、bin collision；T1/T4 增加 scripts-enabled 自动安装、ignore-scripts repair、崩溃/并发恢复和卸载；C11 将远端 tag 移到未来发布清单；R041 改为 evidence record shape/聚合，本轮明确不实现真实 Delivery Verifier。等待第 13 轮全新 Agent 复核。

## 第 13 轮 · 2026-08-11 · 完整发行与 Agent 接入接口复核

**冷读 agent 的追问清单**

1. `evaluateCompletion` 究竟接受 evidence record 还是 boolean map，level status 与非法输入如何表达。
2. `uninstall-conflicts.v1.json` 的 schema、原子写、重复卸载、Agent state 迁移和 exit 语义。
3. 普通 CLI 没有 `npm_config_user_agent` 时如何执行 npm>=10 门。

**冷读 agent 发现的矛盾**

- C1 与 C5 的 completion 公开签名不一致。
- 卸载要保留冲突却没有状态迁移后的重装语义。
- preinstall 的 npm lifecycle 环境被错误扩展到了普通 CLI 启动。

**它的实现计划是否跑偏**：否；但三处都会导致不同实现者做出不兼容的公共行为。

**判定**：FAIL

**本轮回填了什么**：C1/C5 统一 `CompletionEvidence[] -> CompletionReport`、`achieved|blocked` 和 E_SCHEMA；C1/C4/C5 固定 uninstall conflict schema、state 迁移、原子性、去重、重装和 exit；C1/C5/T1 把 npm 版本门限定在 lifecycle，普通 CLI 只检 Node/OS。等待第 14 轮全新 Agent 复核。

## 第 14 轮 · 2026-08-11 · 完整发行与 Agent 接入卸载复核

**冷读 agent 的追问清单**

1. uninstall 如何用现有 SyncJournal 同时迁移 Agent state 与全局 conflicts，崩溃后入口是什么。
2. 多 Agent 同时更新全局 `uninstall-conflicts.v1.json` 如何不丢记录。
3. 重复卸载是否允许刷新 `recordedAt`。

**冷读 agent 发现的矛盾**

- 每 Agent 独立事务与共享全局 conflicts 写路径互相冲突。
- SyncJournal 无法表达卸载的多 state + conflicts 前向迁移。
- “更新时间”与“重复幂等”无法同时验收。

**它的实现计划是否跑偏**：否；但在用户 Skill 目标与状态清理上不允许猜测并发和崩溃语义。

**判定**：FAIL

**本轮回填了什么**：C1 将 uninstall 定义为跨 Agent 全局事务且真正重复零写；C2 新增全局 lock + 有序 Agent locks、UninstallJournal、精确写顺序、commit point与只前向恢复；C4 公开 `pact uninstall --apply --recover`；C5/T1 补中断诊断和三阶段崩溃/并发验收。等待第 15 轮全新 Agent 复核。

## 第 15 轮 · 2026-08-11 · 完整发行与 Agent 接入最终复核

**冷读 agent 的追问清单**：无。

**冷读 agent 发现的矛盾**：无。

**它的实现计划是否跑偏**：否。R028–R042 已为完整 npm 安装、双 CLI、Agent Skills 检测/同步、冲突保护、状态与崩溃恢复、安全卸载、三种安装入口、北极星文档、八级完成度模型及隔离安装测试提供一致且可判定的施工契约。

**判定**：PASS

**本轮回填了什么**：无；完整发行 CR 通过零知识冷读门，可进入 S10 施工。
