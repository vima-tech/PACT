> ## ⚠️ 本项目已归档（2026-08-12），不再维护
>
> 本文档描述的安装方式仅对现有版本有效，不会再有新版本发布。
> 接替项目：**https://github.com/vima-tech/vima-cli**

# 安装 PACT

<!-- @pact R029,R031,R035,R036,R037,R038,R039,R040 -->

## 主推：完整安装

```bash
npm i -g @vima-tech/pact
pact doctor
```

这会安装 `pact` 和 `vima-pact` 两个同义 CLI，并把包内同版本的九个 PACT Skills 同步给已检测的 Claude Code、Codex、Cursor 或通用 Agent Skills 目录。同步不会联网下载 Skills，也不会覆盖本地修改或未知来源的同名目标。

支持 Linux/macOS、Node.js >=20、npm >=10。npm 全局 prefix 必须对当前用户可写；若不可写，请使用 Node version manager 或配置用户级 prefix，不要使用 `sudo npm i -g`。如果 prefix 内已有其他包占用 `pact` bin，先决定保留哪个包；不要用 `--force` 覆盖未知 CLI。

## 轻量：只安装 Skills

```bash
npx skills add vima-tech/pact -g
```

该入口保留原来的简单体验，全量安装九个 Skills，暂不提供模块选择；它不安装本地 `pact` CLI 和完整运行时。

## 让 AI Agent 自动安装

可直接对 Claude Code、Codex 等 Agent 说：

> 请按 https://github.com/vima-tech/pact/blob/main/docs/installation.md 安装 PACT 完整功能，安装后运行 `pact doctor`；如果 Skills 未就绪，运行 `pact agent sync`。不要使用 sudo 或 --force。

Agent 应先检查 Node/npm/平台和 npm prefix，再执行主推 npm 安装。安装结果以 `pact doctor` 为准，不以终端中出现过“added”为准。

## 诊断、修复与显式 Agent 安装

```bash
pact doctor
pact agent list
pact agent sync
pact agent install codex
pact install --repair
```

`/pact-install` 和 `pact install` 是安装后的检查/修复/未来 Adapter 扩展入口，不负责在运行中替换自身 npm 包。`pact install --upgrade` 仅显示显式 npm 更新命令，不自动联网执行。

## 卸载

```bash
pact uninstall --inspect
pact uninstall --apply
npm uninstall -g @vima-tech/pact
```

PACT 只删除 state 中记录且内容/类型仍精确匹配的 managed Skills；observed 目标只解除记录，修改后或未知目标保留并写入冲突台账。如果 npm 使用 `--ignore-scripts` 卸载，必须先手工运行 `pact uninstall --apply`。崩溃中断后，重装 PACT，确认原进程结束，再运行 `pact uninstall --apply --recover`。
