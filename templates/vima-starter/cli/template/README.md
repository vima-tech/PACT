# {{PROJECT_NAME}}

{{DESCRIPTION}}

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite + @vima-tech/ui-admin
- **后端**: Java 21 + Spring Boot 3 + Spring Security + JWT
- **数据库**: H2 (开发) / MySQL (生产)

## 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 后端

```bash
cd backend
mvn spring-boot:run
```

### 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |
| test | test123 | 普通用户 |

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
{{PROJECT_NAME}}/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── api/          # API 请求
│   │   ├── components/   # 组件
│   │   ├── router/       # 路由
│   │   ├── store/        # 状态管理
│   │   └── views/        # 页面
│   └── package.json
├── backend/               # 后端项目
│   ├── src/main/java/
│   │   └── com/vima/starter/
│   │       ├── config/   # 配置
│   │       ├── controller/ # 控制器
│   │       ├── entity/   # 实体
│   │       ├── service/  # 服务
│   │       └── repository/ # 数据访问
│   └── pom.xml
└── README.md
```
