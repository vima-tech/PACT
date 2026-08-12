# T4 · 交付前置（Definition of Done）

> **本页由 `pact-book.sh` 从 `PACT.md` 自动生成，请勿手改。**
> 改内容请改 `PACT.md`，然后重新 `pact-book.sh --build`；`--check` 会抓出手改导致的漂移。
> 锚点 `<!-- PACT:T4 -->`｜真源位置：`PACT.md` 第 1301–1322 行

← [T3 停工线（出现即停，不得继续施工）](../t/T3-停工线-出现即停，不得继续施工.md) ｜ [T5 施工范围与里程碑](../undefined) →

---

- [ ] `npm run governance:check`、`npm test`、`npm run migration:verify` 通过。
- [ ] UI 的 `check:ai`、`typecheck`、`test`、`verify:publish` 全部通过。
- [ ] 显式 `npm run bootstrap` 成功；此后验证命令不隐式安装依赖。
- [ ] Starter 的 `check:template`、frontend `build:check`、backend `mvn package`、CLI 本地 `npm pack` 全部通过。
- [ ] PACT scripts self-test、`pact-check.sh`、`pact-review.sh` 全部通过。
- [ ] `npm run release:plan -- --base HEAD^` 输出合法稳定计划；`npm run release:pack` 只生成本地 artifacts。
- [ ] 两个旧绝对路径已退役且 lstat 不存在；canonical target 与 provenance 记录的来源备份均可复算且 hash 一致。
- [ ] T1 的 [R001](../r/R001.md)–[R042](../r/R042.md) 全部有真实执行证据；`action-graph.json` 完成度 100%。
- [ ] 根 `README.md`、`CLAUDE.md`、产品局部约定与实际目录/命令一致。
- [ ] `npm pack` 的 `@vima-tech/pact` tgz 在隔离 prefix 可安装，两个 CLI 命令和 doctor 可用，模拟 Agent Skills 全量 ready。
- [ ] 隔离安装以 `--offline --ignore-scripts` 验证 tgz 零 runtime dependency；postinstall 再在拦截 `net/http/https/dns/child_process` 的 Node preload 下显式运行，且含哨兵 token 的输出无泄漏。
- [ ] 另有真实 scripts-enabled 全局安装 fixture：设置 `npm_config_global=true PACT_ALLOW_HOME_OVERRIDE=1 PACT_USER_HOME=<temp-user>`，npm 自动触发 pre/postinstall 后模拟 Agent 全量 ready；直接显式 postinstall 的 blocker fixture也设置同样变量。
- [ ] sync recovery 注入 prepared、部分 applied、state commit 后三种崩溃和损坏 journal；两个 Agent 并发只写各自 state，恢复无丢失更新。
- [ ] `pact uninstall --apply` 与 global preuninstall 对 managed/observed/conflict 三类目标符合 C2；注入多 Agent 并发、三个提交阶段崩溃并用 `--recover` 前向收敛；重复卸载不刷新冲突文件；`--ignore-scripts` 卸载文档要求先手工清理。
- [ ] preinstall 对 npm user-agent 缺失/非法/<10 exit 4；普通 CLI 在无 `npm_config_user_agent` 环境下 `--help`/`--version` 仍 exit 0。
- [ ] 无 Agent、禁用 scripts、本地修改、版本漂移和安全清理 fixtures 全部符合 C2/C8，不存在假成功或静默覆盖。
- [ ] 北极星、Agent/Pact 分工、三种安装入口、八级完成态和 `/pact-install` 新职责已同步所有权威文档。
- [ ] 无临时源文件、无未解释的待办占位、无本需求引入的 secrets；用户既有未跟踪文件保持未修改。
