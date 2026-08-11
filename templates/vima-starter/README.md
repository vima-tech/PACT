# Vima Starter

企业级后台管理系统脚手架 - Vue 3 + Java 21 + Spring Boot

## 特性

- **前端**: Vue 3 + TypeScript + Vite + @vima-tech/ui-admin
- **后端**: Java 21 + Spring Boot 3 + Spring Security + JWT
- **数据库**: PostgreSQL (默认) + Redis
- **信创支持**: 人大金仓、达梦等国产数据库

## 快速开始

### 使用 CLI 创建项目

```bash
# 全局安装
npm install -g create-vima-starter

# 创建项目 (默认 PostgreSQL + Redis)
create-vima-starter my-project

# 使用人大金仓 (信创)
create-vima-starter my-project --db kingbase

# 使用 MySQL
create-vima-starter my-project --db mysql
```

### 手动启动

```bash
# 1. 启动 Redis
redis-server

# 2. 启动后端
cd backend
mvn spring-boot:run

# 3. 启动前端
cd frontend
npm install
npm run dev
```

## 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |
| test | test123 | 普通用户 |

## 数据库支持

| 数据库 | CLI 参数 | 说明 |
|--------|----------|------|
| PostgreSQL | `--db postgresql` | 默认，推荐生产环境 |
| MySQL | `--db mysql` | 通用场景 |
| H2 | `--db h2` | 开发测试 |
| 人大金仓 | `--db kingbase` | 信创环境 |

## 功能模块

- 用户管理
- 角色管理
- 菜单管理
- 部门管理
- 字典管理
- 系统配置
- 文件管理
- 操作日志
- 登录日志
- 消息中心

## 项目结构

```
vima-starter/
├── frontend/              # 前端项目
├── backend/               # 后端项目
├── cli/                   # CLI 工具
├── docs/                  # 文档
└── README.md
```

## 信创环境

本脚手架支持信创环境，可无缝切换到国产数据库：

- 人大金仓 KingbaseES
- 达梦 DM
- 神通数据库

详见 [数据库配置指南](docs/database-guide.md)

## License

MIT
