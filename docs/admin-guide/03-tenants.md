# 租户管理 (Tenants)

## Tenant 模型

```prisma
model Tenant {
  id        Int      @id @default(autoincrement())
  name      String
  plan      String   @default("FREE")  // FREE / PRO / ENTERPRISE
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  leads     Lead[]
  customers Customer[]
  quotes    Quote[]
  orders    Order[]
  tasks     Task[]
  @@index([isActive])
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | String | 租户名称 |
| `plan` | String | 计划类型：`FREE` / `PRO` / `ENTERPRISE` |
| `isActive` | Boolean | 是否启用，默认 `true` |

## 多租户架构

本系统采用 **共享数据库、共享 Schema** 的多租户模式。核心模型通过 `tenantId` 字段关联到 `Tenant` 表。

### 带有 tenantId 的模型

以下模型包含 `tenantId` 字段，支持租户级数据隔离：

| 模型 | 说明 |
|------|------|
| `User` | 用户归属租户 |
| `Lead` | 线索归属租户 |
| `Customer` | 客户归属租户 |
| `Quote` | 报价归属租户 |
| `Order` | 订单归属租户 |
| `Task` | 任务归属租户 |
| `EmailAccount` | 邮件账户归属租户 |
| `EmailThread` | 邮件线程归属租户 |
| `EmailMessage` | 邮件消息归属租户 |
| `AIControlSettings` | AI 控制设置（每租户唯一） |
| `AIPolicyRule` | AI 策略规则归属租户 |
| `AIExecutionLog` | AI 执行日志归属租户 |
| `Message` | 统一消息归属租户 |

### 数据隔离设计

理想情况下的查询模式：

```typescript
// 正确的租户隔离查询
const leads = await prisma.lead.findMany({
  where: {
    tenantId: currentTenantId,
    // 其他筛选条件...
  }
})
```

## 当前实现状态

> **重要：** 租户隔离在数据模型层已就绪，但 **应用层尚未完整实现**。

### 已实现

- 数据模型中 `tenantId` 字段和索引已定义
- Seed 数据创建了两个租户：`tenant1`（默认租户）和 `tenant2`（测试租户）
- `AIControlSettings` 模型有 `[tenantId]` 唯一约束，支持每租户独立 AI 配置

### 未实现

1. **无租户管理 UI** — 没有创建、编辑、删除租户的管理界面
2. **无租户隔离中间件** — `middleware.ts` 中未实现租户级别的访问控制
3. **硬编码 tenantId** — 所有数据创建路径（导入、Webhook、IM Bot、AI 执行器）都使用 `tenantId: 1`
4. **查询未过滤 tenantId** — 大部分 `findMany` 查询未添加 `tenantId` 过滤条件

### 硬编码 tenantId = 1 的位置

以下操作路径中存在硬编码：

- CSV 导入 (leads/customers/products)
- Webhook 线索创建
- IM Bot 消息处理和实体创建
- AI 执行器 (executor.ts)
- Event Bus 处理函数

## 迁移到多租户

要完整实现多租户隔离，需要：

1. 创建 Tenant 管理 CRUD API 和 UI 页面
2. 实现租户上下文中间件（从 JWT 或 session 中提取 tenantId）
3. 修改所有查询添加 tenantId 过滤
4. 实现行级安全（Row Level Security）或在 Prisma 中使用中间件注入 tenantId
5. 移除所有硬编码的 `tenantId: 1`

## Seed 数据

```typescript
// prisma/seed.ts
const tenant1 = await prisma.tenant.create({
  data: { name: '默认租户', plan: 'FREE' }  // id: 1
})
const tenant2 = await prisma.tenant.create({
  data: { name: '测试租户', plan: 'PRO' }    // id: 2
})
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | Tenant 模型定义 |
| `prisma/seed.ts` | 租户 Seed 数据 |
| `middleware.ts` | 认证中间件（待扩展租户隔离） |
