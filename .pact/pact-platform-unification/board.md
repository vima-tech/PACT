# PACT 进度看板

> 创建日期: 2026-08-11
>
> **这是断点续跑的第一真相源。** 会话中断、上下文被压缩、换 agent 接手时，先读这份。
> 每一轮收工都必须更新本文件——**没更新 = 这一轮不算做完**。

- 物料目录：`.pact/pact-platform-unification/`
- 来源命令：将 `vima-ui-admin` 与 `vima-starter` 分三阶段迁入 PACT 项目统一管理，完成治理、monorepo 与发布编排
- 档位：`--level=full`
- 规格：`PACT.md`（状态：已冻结 · 2026-08-11）
- 启动命令：`npm run verify`

## 工序状态（S0–S11）

> 状态只许用四个词：`未开始` / `进行中` / `已完成` / `已跳过`。
> **`已跳过` 必须在备注里写理由**，静默略过 = 违反协议。
> S0–S9 由 `/pact-new` 走，S10–S11 由 `/pact-run` 走。
> 机检：`bash <SKILL_DIR>/scripts/pact-status.sh <物料目录>`

| 工序 | 名称 | 状态 | 备注 / 理由 |
|---|---|---|---|
| S0 | 定位与摄入 | 已完成 | 目标为存量 PACT skill 仓库；来源为 pact、vima-ui-admin、vima-starter 与既有整体设计；两个 Vima 源目录无独立 `.git`，按当前快照导入并记录 provenance |
| S1 | 访谈门 | 已完成 | 十二类全部已答或显式假设；无阻塞 OPEN；保留独立发布身份、旧路径兼容、不执行真实外部 publish |
| S2 | 熔合门 | 已完成 | 5 类来源、8 项 DIFF 全部裁定；统一 repo 与独立包边界并存；历史缺失以 provenance+hash 代偿 |
| S3 | 存量评估 | 已完成 | 八维评估完成；6 项迁移 P0 明确回流 M0，Starter 深层业务能力债仅登记 readiness、不虚报完成 |
| S4 | 写 P 层 | 已完成 | 原 R001–R027 加完整发行 CR 的 R028–R042；能力选择、治理迁移、北极星、npm 安装与 Agent 接入均落入用户可达节点 |
| S5 | 写 A 层 | 已完成 | Core/registry/adapters/products/install 分层、5 条关键链路与 D001–D014；新增 Agent 中立、完整发行和同步失败恢复决策 |
| S6 | 写 C 层 | 已完成 | 治理、迁移、install manifest、Agent 同步状态机、CLI/内部接口、安全与 AI 使用门均可执行 |
| S7 | 写 T 层 | 已完成 | R001–R042 一一验收，M0–M5 覆盖原三阶段与完整发行 CR；用户未要求工期/报价，估算门不适用 |
| S8 | 完备性门 | 已完成 | 完整发行 CR 的 lint/graph 通过，经多轮回填后第 15 轮零知识冷读 PASS，无必须追问问题 |
| S9 | 冻结 | 已完成 | PACT 于 2026-08-11 冻结；CR 保持冻结身份，经 changelog 修改并把图谱扩为 16 steps 覆盖 R001–R042 |
| S10 | 施工 LOOP | 已完成 | M5 四个 step 全部 done/pass；已实现文档准则、公开 npm 包、双 CLI、Agent sync/安全生命周期和隔离安装测试 |
| S11 | 收尾自检门 | 已完成 | `npm run verify` 全绿；lint/graph/book/trace/review 全过，图谱 16/16、R-ID 42/42，三份本地发行归档验证通过 |

## 冻结门计分（大型多子系统项目才用；单体需求删掉本节）

> **为什么需要它**：S8 是「全过才算过」的单一硬闸门，对单体需求刚好。
> 但多子系统项目（如 平台 + 端 + 网关）**做不到整份规格同时成熟**——契约可以先冻，
> 某个子系统的实现规格得等现场调研。硬等全部齐备会阻塞几个月，降标准放行则 S8 形同虚设。
> 分级冻结是第三条路：**按层分批冻，每层各有判据，低门未过不进高门。**
>
> **配套纪律（缺一条就会退化成"永远不冻结"）**：
> ① 每道门有明写的判据与签署日期，不写「差不多了」；
> ② 已冻结层的任何改动一律走 `/pact-change` 并记 `changelog.md`；
> ③ 未冻结层**不得**被下游当作依据实现——`open-questions.md` 里要有对应条目。

| 门 | 冻结范围 | 判据（可执行） | 状态 | 签署日期 |
|---|---|---|---|---|
| G1 | 规格冻结门 | P/A/C/T 完整、治理/迁移/发布契约可执行、冷读 PASS | ✅ 已冻结 | 2026-08-11 |

状态取值：`⬜ 未开始` / `🔄 进行中 N/M` / `✅ 已冻结` / `🔶 部分（说明）`

> 门的数量与切分按项目定，上表是**示例不是模板**——两三个子系统就别切三道门。
> 全部门签署后，`board.md` 的 S9 才可标「已完成」。

## 本轮

- **当前工序**：S11 · 完整发行 CR 已收尾
- **做了**：M5 4/4 step 已 done/pass；公开包、CLI、九 Skills 同步、doctor、安全卸载、三入口文档和八级完成度均已实现
- **验收结果**：`npm test` 41/41 PASS；真实 scripts-enabled/ignore-scripts 全局 tgz 安装均 PASS；`release:pack` 恰好生成三个 tgz；根级 `npm run verify` 与 `pact-review.sh` PASS，完成度 100%
- **下一道**：无；等待用户复核，外部 npm publish/tag 不在本次授权范围
- **阻塞**：无

## 施工取活（S10 用）

> 工作单元队列不再手维护——真源是 `action-graph.json`。取下一批可执行步骤：
> `bash <SKILL_DIR>/scripts/pact-graph.sh <物料目录> --next`

## 闸门记录

- [x] S1 访谈门通过（`interview.md` OPEN 清零）
- [x] S2 熔合门通过（全部 DIFF 已裁定；D-ID 待 S5 按工序落盘）
- [x] S3 存量评估完成（八维 + P0 已排进 M0）
- [x] S7 估算门已判定不适用（用户未要求工期、工作量或报价；不创建虚假估算）
- [x] S8 CR ① `pact-lint.sh` exit 0
- [x] S8 ② 物料反扫无遗漏
- [x] S8 CR ③ 冷读门 PASS（第 15 轮）
- [x] S8 CR ④ `pact-book.sh` 生成成功且 `--check` 无漂移
- [x] S9 已冻结，`action-graph.json` 已生成且 `pact-graph.mjs` 结构校验通过
- [x] S11 CR 收尾门重新全绿（R028–R042 实现后 `npm run verify`、`pact-review.sh` exit 0）

## 高风险项汇总（供随时复核）

> `P5` 里 `假设` 非空的条目、验收标准模糊的条目、`来源=目测` 的设计值、
> `A5` 中理由较弱的决策。
