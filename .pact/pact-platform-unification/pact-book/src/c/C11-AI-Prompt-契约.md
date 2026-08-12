# C11 · AI / Prompt 契约

> **本页由 `pact-book.sh` 从 `PACT.md` 自动生成，请勿手改。**
> 改内容请改 `PACT.md`，然后重新 `pact-book.sh --build`；`--check` 会抓出手改导致的漂移。
> 锚点 `<!-- PACT:C11 -->`｜真源位置：`PACT.md` 第 1189–1214 行

← [C10 交互与呈现契约](../c/C10-交互与呈现契约.md) ｜ [T1 验收清单](../undefined) →

---

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

[R028](../r/R028.md) 的五个产品方向权威入口固定为：本 `PACT.md`、根 `CLAUDE.md`、根 `README.md`、`platform/README.md`、`.pact/pact-platform-unification/docs/pact-controlled-generation-design.md`。另新建 `docs/installation.md` 作为安装操作权威文档，但不计入“五个产品方向入口”；机器完成分级真源为 `platform/registry/delivery-profiles.v1.json`。这些路径是本需求的输出位置，不是开工前需要从外部补充的输入；本文件已包含它们必须承载的全部语义与验收。

自然语言安装只认可两个发布身份：npm registry 上精确 scoped package `@vima-tech/pact`，以及 GitHub 仓库 `https://github.com/vima-tech/pact`。发现入口可读 `main/docs/installation.md`；正式远端发布的独立发布清单要求先创建 `v<package-version>` tag，再公开 npm 包，发布后文档链接固定为该 tag。当前 CR 明确不执行 Git push/tag/npm publish，只在本地验证 URL 生成规则、文档内容和 tgz；不存在远端 tag 不影响本地 pack/安装验收，也不得让 Agent改用搜索结果或镜像页面。[R036](../r/R036.md) 以 devDependency `skills@1.5.22` 的真实 CLI 对本地仓库 discovery，不访问远端。
