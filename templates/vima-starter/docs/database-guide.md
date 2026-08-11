# 数据库配置指南

本脚手架默认使用 PostgreSQL，并支持信创环境切换到国产数据库。

## 支持的数据库

| 数据库 | 配置标识 | 适用场景 |
|--------|----------|----------|
| PostgreSQL | postgresql | 默认，推荐生产环境 |
| MySQL | mysql | 通用场景 |
| H2 | h2 | 开发测试 |
| 人大金仓 KingbaseES | kingbase | 信创环境 |
| 达梦 DM | dm | 信创环境 |

## 快速切换

### PostgreSQL（默认）

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/vima
    driver-class-name: org.postgresql.Driver
    username: postgres
    password: postgres
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

### 人大金仓 KingbaseES

```yaml
spring:
  datasource:
    url: jdbc:kingbase8://localhost:54321/vima
    driver-class-name: com.kingbase8.Driver
    username: system
    password: 123456
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

**注意**: 人大金仓兼容 PostgreSQL 协议，使用相同的方言。

### 达梦 DM

```yaml
spring:
  datasource:
    url: jdbc:dm://localhost:5236/vima
    driver-class-name: dm.jdbc.driver.DmDriver
    username: SYSDBA
    password: SYSDBA
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

## CLI 创建项目时指定数据库

```bash
# 使用 PostgreSQL
create-vima-starter my-project --db postgresql

# 使用人大金仓
create-vima-starter my-project --db kingbase

# 使用 MySQL
create-vima-starter my-project --db mysql

# 使用 H2（开发测试）
create-vima-starter my-project --db h2
```

## 国产数据库驱动安装

### 人大金仓

```bash
# 下载 JDBC 驱动
# 从人大金仓官网下载 kingbase8-8.6.0.jar

# 安装到本地 Maven 仓库
mvn install:install-file \
  -Dfile=kingbase8-8.6.0.jar \
  -DgroupId=cn.com.kingbase \
  -DartifactId=kingbase8 \
  -Dversion=8.6.0 \
  -Dpackaging=jar
```

### 达梦

```bash
# 下载 JDBC 驱动
# 从达梦官网下载 DmJdbcDriver18.jar

# 安装到本地 Maven 仓库
mvn install:install-file \
  -Dfile=DmJdbcDriver18.jar \
  -DgroupId=dm.jdbc \
  -DartifactId=dm-jdbc \
  -Dversion=18 \
  -Dpackaging=jar
```

## Redis 配置

本脚手架使用 Redis 存储登录 Token，默认配置：

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: 
      database: 0
```

### 启动 Redis

```bash
# 本地启动
redis-server

# Docker 启动
docker run -d --name redis -p 6379:6379 redis:7
```

## 数据库初始化

首次启动时，JPA 会自动创建表结构（`ddl-auto: update`）。

生产环境建议改为：
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```
