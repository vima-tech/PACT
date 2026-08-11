# C11 · AI / Prompt 契约

> **本页由 `pact-book.sh` 从 `PACT.md` 自动生成，请勿手改。**
> 改内容请改 `PACT.md`，然后重新 `pact-book.sh --build`；`--check` 会抓出手改导致的漂移。
> 锚点 `<!-- PACT:C11 -->`｜真源位置：`PACT.md` 第 750–767 行

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
