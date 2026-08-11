# 多来源熔合门（Source Merge Gate）

> 创建日期: 2026-08-11
>
> **「更精准」≠「自动覆盖」。** 每处分歧显式上桌、由用户裁定；未裁定不得写进 PACT.md。
> 来源优先级默认：**运行中的代码 > SDD/技术方案 > 原型设计 > PRD > 历史文档**。
> 优先级只用来给**建议**，不用来替用户做决定。

## 来源清单

| 来源 ID | 文件/位置 | 类型 | 日期 | 可信度说明 |
|---|---|---|---|---|
| SRC-A | 用户本轮要求与上一轮三阶段方案 | 意图/裁定 | 2026-08-11 | 最高意图权威：三阶段全部完成 |
| SRC-B | `.pact/pact-platform-unification/docs/pact-controlled-generation-design.md` | P/A/C/T 设计草案 | 2026-08-11 | 架构与控制模型来源，未冻结 |
| SRC-C | PACT repo `pact*/**`、`README.md` | 运行代码/文档 | 2026-08-10 | 当前 skill 套件事实来源 |
| SRC-D | `/home/renmk/projects/vima-ui-admin/**` | 运行代码/测试/文档 | 2026-08-11 | 当前 UI 产品快照；无独立 `.git` |
| SRC-E | `/home/renmk/projects/vima-starter/**` | 运行代码/模板/文档 | 2026-08-11 | 当前 Starter 快照；无独立 `.git` |

## 分歧清单

| DIFF-ID | 主题 | 来源A 怎么说（引用） | 来源B 怎么说（引用） | 类型 | 影响 R-ID | 建议 | 裁定 |
|---|---|---|---|---|---|---|---|
| DIFF001 | “统一管理”的物理边界 | 用户认为三者都是工程创建工具，应迁入 PACT 项目 | 既有设计要求 PACT Core 不依赖 Vima、三者独立发布 | 矛盾 | R001–R004 | 同一 repo 统一治理，但 Core/Adapter/Product/Template 分层，独立包名与发布 | 已裁定：两者同时成立；统一仓库不等于统一包 |
| DIFF002 | 源码历史保留 | 三阶段方案要求保留 Git 历史 | ui-admin 与 starter 当前目录均无 `.git`，没有可导入历史 | 矛盾 | R011–R014 | 记录来源路径、快照哈希、导入时间；从 PACT 导入提交开始保留历史 | 已裁定：不伪造不存在的历史 |
| DIFF003 | ui-admin 版本能力 | Starter lock/依赖使用 `^0.1.0`，已安装旧包无 Agent 出口 | 当前 ui-admin 源码同为 `0.1.0`，包含 Agent/Manifest 能力 | 矛盾 | R008,R015,R021 | 导入后建立内容哈希兼容矩阵；不在本迁移伪装已发布新版本，版本升级列为发布计划 | 已裁定 |
| DIFF004 | 发布门状态 | 既有设计曾记录 `VIcon` 重复导入 | 2026-08-11 串行实测当前实际失败是 runtime-size，测试 93/93 通过 | 细化 | R024 | 以当前实测为准；迁移 M0 必须修复 size，不降低阈值 | 已裁定 |
| DIFF005 | workspace 工具 | 三阶段要求统一 workspace | PACT 当前无 root package；两个产品各自使用 npm lock，Starter 还含 Maven | 缺漏 | R017,R024–R026 | 根编排用轻量 Node 脚本与 `npm --prefix`，保留各自 lock 和 Maven，不引入重型 monorepo 工具 | 已裁定 |
| DIFF006 | 原路径兼容 | 物理迁入会改变 `/home/renmk/projects/vima-*` | Starter CLAUDE 与本地工作流使用旧绝对路径 | 矛盾 | R018 | 迁入后把旧目录替换为指向新位置的符号链接；验证 realpath 和命令 | 已裁定 |
| DIFF007 | Starter 数据库能力 | README/docs 声称支持达梦 | CLI 只接受 postgresql/mysql/h2/kingbase，非法值静默回落 postgresql | 矛盾 | R002,R010 | 本迁移兼容矩阵只声明代码实证能力；不顺手实现达梦，后续功能走独立 PACT | 已裁定 |
| DIFF008 | 发布行为 | “第三阶段完成”可能被理解为实际发布到 registry | 访谈未提供 npm/Git 凭据，真实发布是外部状态变更 | 越界 | R019–R027 | 完成可审计 release plan、pack/dry-run 和独立发布命令；不执行真实 push/publish | 已裁定 |

### 分歧类型
- **矛盾**：直接冲突（字段/阈值/流程/状态机不同）→ **必须裁定**。
- **细化**：一方在另一方之上补精度 → 通常采精确方，仍列出确认。
- **缺漏**：一方有另一方无 → 确认是否仍实现。
- **越界**：某来源引入别处没有的需求/范围 → 确认是否纳入。

## 裁定（AskUserQuestion 批量；候选：以X为准(推荐)/以Y为准/两者都要/都不要）

- [x] 全部**矛盾**类与高影响分歧已裁定
- [x] 裁定结论已写进 `PACT.md` 正文
- [x] **每条非平凡裁定已在 `A5` 落 D001–D008**
- [x] 低影响「细化」采用当前运行代码与串行实测，并已标注

## 结论

> 八项 DIFF 全部由用户已确认的三阶段目标、既有设计原则与运行代码裁定；正文与 D001–D008 已落盘。熔合门通过。

## S8 物料反扫

| 来源 | 反扫结果 | PACT 落点 |
|---|---|---|
| SRC-A 用户要求 | 三阶段全部完成、统一管理、Vima 非必选、仅业务系统候选 Starter、先前 ClearWorks 教训均未遗漏 | P1–P6，R001–R027，D001/D006/D008 |
| SRC-B 整体设计 | PACT Core/Router/Profile/Adapter/Product、独立 readiness、Skill 优先与 MCP 后置均已归类 | A1–A5，C1–C11；MCP 为 P6 非目标 |
| SRC-C PACT 代码 | 30 锚点、图谱、trace、book、review 与独立 skill 发布约束均已承接 | R001,R019,R026，T4 |
| SRC-D UI 代码 | Manifest/Recipe/Agent Builder、VIcon、安全模板、四个验证命令与 runtime-size 阻断均已承接 | R002,R008,R015,R024，P7/T2/T3 |
| SRC-E Starter 代码 | frontend/backend 真源、CLI/template、npm+Maven、旧 UI 依赖、权限/测试/数据库限制均已承接 | R002,R010,R016–R018,R025，P6/P7 |

反扫结论：所有输入段落均已归入需求、非目标、约束、风险或后续限制；未发现遗漏，PASS。
