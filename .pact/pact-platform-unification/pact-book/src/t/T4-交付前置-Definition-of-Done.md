# T4 · 交付前置（Definition of Done）

> **本页由 `pact-book.sh` 从 `PACT.md` 自动生成，请勿手改。**
> 改内容请改 `PACT.md`，然后重新 `pact-book.sh --build`；`--check` 会抓出手改导致的漂移。
> 锚点 `<!-- PACT:T4 -->`｜真源位置：`PACT.md` 第 828–841 行

← [T3 停工线（出现即停，不得继续施工）](../t/T3-停工线-出现即停，不得继续施工.md) ｜ [T5 施工范围与里程碑](../undefined) →

---

- [ ] `npm run governance:check`、`npm test`、`npm run migration:verify` 通过。
- [ ] UI 的 `check:ai`、`typecheck`、`test`、`verify:publish` 全部通过。
- [ ] 显式 `npm run bootstrap` 成功；此后验证命令不隐式安装依赖。
- [ ] Starter 的 `check:template`、frontend `build:check`、backend `mvn package`、CLI 本地 `npm pack` 全部通过。
- [ ] PACT scripts self-test、`pact-check.sh`、`pact-review.sh` 全部通过。
- [ ] `npm run release:plan -- --base HEAD^` 输出合法稳定计划；`npm run release:pack` 只生成本地 artifacts。
- [ ] 两个旧绝对路径已退役且 lstat 不存在；canonical target 与 provenance 记录的来源备份均可复算且 hash 一致。
- [ ] T1 的 [R001](../r/R001.md)–[R027](../r/R027.md) 全部有真实执行证据；`action-graph.json` 完成度 100%。
- [ ] 根 `README.md`、`CLAUDE.md`、产品局部约定与实际目录/命令一致。
- [ ] 无临时源文件、无未解释的待办占位、无本需求引入的 secrets；用户既有未跟踪文件保持未修改。
