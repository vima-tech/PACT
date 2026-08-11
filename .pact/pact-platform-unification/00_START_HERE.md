# 从这里开始 · PACT Platform 三阶段统一迁移

> 创建/冻结日期：2026-08-11

## 三十秒理解

本物料把 PACT skills、Vima UI Admin 与 Vima Starter 迁入同一 Git 仓库统一治理、验证和发布编排，同时保持 PACT Core 通用、Vima 可选、Starter 只在业务系统分析时成为候选。当前规格已冻结，施工以 `action-graph.json` 为唯一进度真源。

**一句话分野**：统一的是工程创建能力的治理与交付，不是把三个独立产品揉成一个包。

## 必读顺序与权威源

1. `PACT.md`：写什么、为什么、完成标准。
2. `open-questions.md`：当前无开放问题；新阻断不得自行补猜。
3. `action-graph.json`：下一步与实现/测试证据。
4. 根 `CLAUDE.md`：编码、目录与命令约定。

冲突时：规格听 `PACT.md`，进度听 `action-graph.json`，编码听最接近文件的 Agent 指令；`pact-book/` 和 `docs/` 都不是施工真源。

## 红线

- PACT Core 不得引用 Vima 产品源码；非 business-system 不得选择 Starter。
- target hash 和产品报告未验证前不得切换旧路径；finalize 只允许 unlink 两个精确软链接，来源备份不得自动删除。
- 不得抬高 UI runtime budget、跳过产品门禁、执行 publish/push 或不可信模板脚本。

## 验收与取活

```bash
npm run verify
bash pact/scripts/pact-graph.sh .pact/pact-platform-unification --next
bash pact/scripts/pact-review.sh .pact/pact-platform-unification
```

完成特征：根验证 exit 0、三个本地归档存在、图谱 100%、`pact-review.sh` exit 0。

## 当前状态

- 规格：已冻结 · 2026-08-11
- 执行：R018 finalized CR 已完成，图谱 12/12，根 verify 9/9，`pact-review.sh` 100% PASS
- 开放问题：无
