# create-vima-starter

Vue 3 + Java 21 + Spring Boot 脚手架 CLI 工具

## 安装

```bash
npm install -g create-vima-starter
```

## 使用

### 创建项目（默认 PostgreSQL + Redis）

```bash
create-vima-starter my-project
```

### 使用人大金仓（信创）

```bash
create-vima-starter my-project --db kingbase
```

### 使用 MySQL

```bash
create-vima-starter my-project --db mysql
```

### 自定义配置

```bash
create-vima-starter my-project \
  -d "My Application" \
  -p 3000 \
  -b 9090 \
  --db postgresql \
  --redis-host 127.0.0.1 \
  --redis-port 6379
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `[project-name]` | 项目名称 | my-project |
| `-d, --description` | 项目描述 | Vue 3 + Java 21 + Spring Boot project |
| `-p, --port` | 前端端口 | 5173 |
| `-b, --backend-port` | 后端端口 | 8080 |
| `--db` | 数据库类型 | postgresql |
| `--redis-host` | Redis 地址 | localhost |
| `--redis-port` | Redis 端口 | 6379 |
| `--skip-install` | 跳过 npm install | false |

## 支持的数据库

| 类型 | 说明 |
|------|------|
| postgresql | PostgreSQL（默认） |
| mysql | MySQL |
| h2 | H2 内存数据库（开发测试） |
| kingbase | 人大金仓 KingbaseES（信创） |

## 前置要求

- Node.js 18+
- Java 21+
- Maven 3.8+
- Redis 6+
- PostgreSQL 14+ (或其他数据库)

## 开发

```bash
# 克隆项目
git clone <repo-url>

# 进入 CLI 目录
cd vima-starter/cli

# 安装依赖
npm install

# 链接到全局
npm link

# 测试
create-vima-starter test-project
```

## 发布

```bash
npm publish
```

## License

MIT
