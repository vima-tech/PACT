# Vima Starter · 给 AI 的施工须知

Vue 3 + Java 21 + Spring Boot 的政企后台脚手架。
这份文件写的是**加一个业务模块的固定流程**和**照抄就不会错的骨架**，动手前先看完。

---

## 一、真源规则（最容易踩的一条）

```
frontend/           ← 前端真源，改这里
backend/            ← 后端真源，改这里
cli/template/       ← create-vima-starter 发包时带走的模板，【由上面两个自动生成，不要手改】
```

`cli/template/` 必须真实存在于 cli 包里（见 `cli/package.json` 的 `files`），所以不能软链。
它的内容由 `scripts/sync-template.mjs` 单向生成：

```bash
npm run sync:template    # 从 frontend/ backend/ 重新生成模板
npm run check:template   # 只比对，不一致退出码 1
```

**改完 `frontend/` 或 `backend/` 一定要跑一次 `npm run sync:template`**，
否则 `create-vima-starter` 生成出来的项目和仓库里这份不是同一个东西，而且不会有任何报错。
（这不是假想：接入这个脚本时，模板已经漂移到少了 `backend/src/main/resources/application-database.yml`，
前端也停在若干版之前。）`cli` 的 `prepack` 会自动跑一次，但本地开发不会。

---

## 二、UI 契约（详见 `@vima-tech/ui-admin` 的 CLAUDE.md）

组件库是 `@vima-tech/ui-admin`，源码在 `/home/renmk/projects/vima-ui-admin`。
这里只列本工程必须遵守的三条：

### 1. 整页外壳已经搭好，不要重搭

`components/layout/MainLayout.vue` 是唯一的外壳，结构已经按框架契约写好：

```
VLayout.vui-layout-fill      ← 撑满 #app
├─ VSide.sidebar             ← 侧栏，宽度由 .sidebar 给（框架只保证 flex:none）
└─ VBody                     ← 纵向 flex，吃掉剩余宽度
   ├─ VHeader.header         ← 顶栏
   ├─ TabBar.tab-bar         ← 自定义层，必须自己写 flex:none 否则会被压扁
   └─ .main-content          ← 路由出口，只负责把剩余高度交给页面
```

高度链：`html/body/#app{height:100%}`（`src/style.css`，唯一一份，**App.vue 里不要再写全局样式**）
→ `.vui-layout-fill` → `.vui-body` → `.vui-page` → `.vui-table`。
断在任何一环，表现都一样：整页出现滚动条，而表格内部反而滚不动。

### 2. 业务页面根一律用 `.vui-page`

```vue
<template>
  <div class="vui-page">
    <VCard title="用户管理">
      <VForm inline>…搜索栏…</VForm>
      <div class="toolbar"><VButton type="primary" @click="handleAdd">新增</VButton></div>
      <VTable :loading="loading" :data-source="tableData" :columns="columns" />
      <VPagination
        v-model:current="queryParams.pageNum"
        :page-size="queryParams.pageSize"
        :total="total"
        @change="fetchData"
      />
    </VCard>

    <VLayer v-model="dialogVisible" :title="dialogTitle" area="600px">…</VLayer>
  </div>
</template>
```

`.vui-page` 已经负责了**占满高度、内边距、卡片间距、末个卡片撑满、表格内部滚动**。
所以页面的 `<style scoped>` 里 **不要再出现**：

- ❌ `height` / `min-height` / `100vh` / `calc(100vh - 120px)` 这类魔法数
- ❌ 页面根的 `padding` / `background` / `border-radius`（那是 `VCard` 的事）
- ❌ `overflow`

`VLayer` 放在 `.vui-page` 里当兄弟节点是安全的：它关闭时渲染 `null`、打开时 teleport 到 body，
两种状态都只留注释节点，不会抢走 `:last-child`。

### 3. 别手写框架已有的东西

| 想做的事 | 用它 |
|---|---|
| 翻页 | `VPagination` |
| 二次确认 | `import { confirmAsync } from '@/utils/feedback'` → `if (!(await confirmAsync('确定删除？'))) return` |
| 轻提示 | `toastSuccess(...)` / `toastError(...)`（同一文件） |
| 对话框 / 抽屉 | `VLayer` / `VDrawer` |

**禁止原生 `confirm()` / `alert()`**：阻塞主线程、样式不受控、自动化测试里行为不一致。
`@/utils/feedback` 已经把框架的回调式 `layer` 服务包成了 Promise，业务代码保持线性。

---

## 三、加一个业务模块的完整流程

以「设备管理 device」为例，八步，缺一步页面就跑不通。

### 后端（`backend/src/main/java/com/vima/starter/`）

1. **entity/Device.java** — JPA 实体，照 `entity/SysConfig.java` 抄：
   `@Data @Entity @Table(name = "sys_device")`，`@Id @GeneratedValue(strategy = IDENTITY)`，
   驼峰字段配 `@Column(name = "snake_case")`，`@PrePersist` / `@PreUpdate` 维护 `createTime` / `updateTime`。
2. **repository/DeviceRepository.java** — `extends JpaRepository<Device, Long>`。
3. **service/DeviceService.java** — `@Service @RequiredArgsConstructor`，构造注入 repository。
   列表方法返回 `PageResponse<Device>`。
4. **controller/DeviceController.java** — `@RestController @RequestMapping("/api/system/device")`，
   返回值一律包 `ApiResponse.success(...)` / `ApiResponse.error(msg)`。
   分页参数用 `@RequestParam(defaultValue = "1") int pageNum` 这套命名，前端已按此约定。
5. **菜单**：在 `config/DataInitializer.java` 里加菜单记录，否则侧栏出不来。

### 前端（`frontend/src/`）

6. **api/system.ts** — 追加一组函数，走统一的 `request`：
   ```ts
   export function getDeviceList(params?: any) { return request.get('/system/device/list', { params }) }
   export function createDevice(data: any)     { return request.post('/system/device', data) }
   export function updateDevice(data: any)     { return request.put('/system/device', data) }
   export function deleteDevice(id: number)    { return request.delete(`/system/device/${id}`) }
   ```
   响应拦截器已经拆过一层：`res.code !== 200` 会 reject，业务代码里直接取 `res.data`。
7. **views/system/device/index.vue** — 照第二节的骨架写，别改动那些结构类名。
8. **router/index.ts** — 挂在 `MainLayout` 的 `children` 下，`meta: { title, icon }`。

最后：`npm run sync:template`。

---

## 四、改完必须跑

```bash
cd frontend && npm run build:check   # vue-tsc 类型检查 + 构建
cd .. && npm run check:template      # 模板是否与真源一致
```

后端：`cd backend && ./mvnw -q -DskipTests package`。

---

## 五、默认账号与数据库

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | 管理员 |
| test | test123 | 普通用户 |

数据库通过 CLI 参数切换（PostgreSQL 默认 / MySQL / H2 / 人大金仓），
配置模板见 `cli/index.js` 的 `DB_CONFIGS`，信创说明见 `docs/database-guide.md`。
