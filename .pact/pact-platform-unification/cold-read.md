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
