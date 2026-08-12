# PACT Platform

<!-- @pact R001,R002,R003,R004,R005,R007,R008,R010,R017,R019,R020,R021,R022,R023,R027,R028,R041 -->

PACT Platform 以“AI Agent + PACT 快速交付规范、准确、可用、稳定的业务操作系统”为最高判断标准。Agent 是实施者，PACT Platform 是控制与证据层；任何低层“已写代码”都不得冒充可启动、业务闭环、可部署或稳定。

`platform/` 是 PACT Core 之外的工程能力治理层。统一的是能力发现、证据、兼容性、迁移和
发布编排；PACT skills、UI Admin 与 Starter 仍是三个独立发布单元。

## 目录

- `registry/`：六类版本化 JSON 真源；能力限制和 readiness 必须有文件 hash 证据。
- `schemas/`：治理文档 schema 描述；实际闭集与跨文档语义由 validator 校验。
- `adapters/`：PACT 与产品契约之间的边界说明，不包含自然语言推断或动态脚本执行。
- `lib/`：纯路由、治理、树哈希、release plan 和串行命令执行。
- `scripts/`：稳定 CLI；结构化结果写 stdout，失败给出 code/path。
- `test/`：schema 负例、路由真值表、迁移冲突、发布传播与安全门。

## 完整安装与 Agent 接入

```bash
npm i -g @vima-tech/pact
pact doctor
```

公开包内置同版本 CLI、Platform runtime 和九个 Skills；postinstall 只对已检测 Agent 做可恢复的本地同步，不下载 Skills、不覆盖冲突目标。轻量 Skills-only 入口仍为 `npx skills add vima-tech/pact -g`；详见 `docs/installation.md`。

交付完成度的机器真源是 `registry/delivery-profiles.v1.json` 顶层 `completionLevels`，由 `lib/delivery-readiness.mjs` 按证据逐级聚合。

## 能力选择

`platform:inspect` 只接受结构化枚举，不解析自由文本。缺省不采用 Vima：

```bash
printf '%s\n' '{"version":"1","kind":"generic"}' | npm run platform:inspect
printf '%s\n' '{"version":"1","kind":"admin-ui","preferredCapabilities":["ui-admin-adapter"]}' | npm run platform:inspect
printf '%s\n' '{"version":"1","kind":"business-system"}' | npm run platform:inspect
```

Starter 只有在 `business-system`、显式 preferred、adapter 为 ready 且 compatibility 为
compatible 时才能进入 selected。当前注册表如实保持 Starter `partial`、Starter adapter
`blocked`。

## 验证与发布预演

```bash
npm run governance:check
npm test
npm run migration:verify
npm run verify:products
npm run release:plan -- --base HEAD^
npm run release:pack
npm run release:verify
```

迁移的 `linked` 只用于过渡验收；`finalized` 后只使用仓库内 canonical 路径。退役旧入口必须提供
绑定当前 target hash 的产品验证报告，并只会 unlink 两个精确绝对软链接：

```bash
npm run verify:products -- --report artifacts/migration/product-verification.v1.json
npm run migration:apply -- --plan artifacts/migration/plan.v1.json --until finalized \
  --verification-report artifacts/migration/product-verification.v1.json
```

来源快照备份继续保留。若进程在 finalize 中崩溃，确认原进程已结束后才可显式执行
`npm run migration:apply -- --recover-finalize`，由 journal 的 commit point 恢复。

`release:pack` 串行执行已登记门禁后，只在 `artifacts/release/` 生成三份本地归档。根工具
没有远程发布、Git push 或凭据读取入口。
