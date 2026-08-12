---
name: pact-install
description: >
  PACT 完整安装的检查、修复与环境扩展入口。基础 CLI 由
  npm i -g @vima-tech/pact 安装；/pact-install 不自我替换正在运行的包，
  只运行 doctor、Agent Skills 同步/修复，并对尚未支持的重型 Adapter 给出明确限制。
  触发词：/pact-install、安装 pact、修复 pact 安装、同步 pact skills。
argument-hint: "[--inspect|--repair|--upgrade]"
---

# /pact-install — 安装诊断与修复

<!-- @pact R030,R033,R035,R038,R040 -->

## 边界

- PACT 完整功能的主安装入口是 `npm i -g @vima-tech/pact`。
- 本 Skill 在 CLI 已安装后工作，不在运行中下载包、不执行 npm、不安装重型外部依赖。
- 它可检查包完整性、各 Agent 的九个 PACT Skills、冲突和可恢复状态。
- 不覆盖本地修改，不强制接管未知来源 Skill。

## 执行

1. 默认或 `--inspect`：运行 `pact doctor`，向用户说明 ready / pending / needs-sync / conflict。
2. `--repair`：先运行 `pact doctor`，再运行 `pact agent sync`，最后重跑 `pact doctor`。
3. `--upgrade`：只输出建议命令 `npm i -g @vima-tech/pact@latest`，不代替用户执行全局更新。
4. 发现 conflict 时停止，展示 `pact doctor --json` 中的精确 Agent/Skill；用户处理目标后再 sync，或对 exact 同内容目标显式 adopt。
5. Adapter/重型环境尚未开放时，必须如实说明 limitation，不得声称已安装。

## 停止条件

`pact doctor` 返回 ready，或明确报告需要用户处理的 conflict/权限/路径问题。
