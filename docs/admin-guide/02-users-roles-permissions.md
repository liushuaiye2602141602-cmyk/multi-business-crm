# 用户、角色与权限 (Users, Roles & Permissions)

## User 模型

```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String              // 应用层 bcrypt 哈希存储
  role      String   @default("SALES")  // ADMIN / MANAGER / SALES
  tenantId  Int?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | String | 用户显示名称 |
| `email` | String | 登录邮箱，唯一约束 |
| `password` | String | 哈希后的密码（应用层使用 bcrypt） |
| `role` | String | 角色标识，默认 `SALES` |
| `tenantId` | Int? | 关联的租户 ID（可选） |
| `isActive` | Boolean | 是否启用，默认 `true` |

## 角色定义

### ADMIN（管理员）

- 系统全部功能的访问权限
- 可管理所有用户的操作
- 可配置 AI 控制策略和全局设置
- 可管理 IM 平台、邮件账户、外部来源
- 可执行数据库备份和恢复操作

### MANAGER（经理）

- 管理下属销售人员的数据
- 查看团队范围内的报表和统计
- 管理跟进任务和日程
- 访问 AI 分析功能

### SALES（销售人员）

- 操作自身负责的线索和客户
- 创建/编辑报价、订单
- 记录跟进记录和任务
- 使用 AI 辅助分析和回复建议

## 权限实现现状

> **当前限制：** 角色信息存储在 `User.role` 字段中，但系统中 **尚未实现基于角色的访问控制 (RBAC) 中间件**。

当前的实际行为：
- 登录认证通过 JWT Token 实现
- API 路由 (`/api/auth/me`) 返回当前用户信息包含 `role` 字段
- 但所有 API 路由 **不对角色进行校验**，任何已登录用户可访问所有接口

### 计划中的改进

- 实现 RBAC 中间件，根据 `role` 字段控制 API 访问
- 前端页面根据 `role` 控制按钮和菜单的显示/隐藏
- 支持自定义角色和细粒度权限配置（需要 RBAC UI）

## 多租户隔离

`tenantId` 字段关联到 `Tenant` 模型，用于多租户数据隔离：

```prisma
model Tenant {
  id       Int      @id @default(autoincrement())
  name     String
  plan     String   @default("FREE")  // FREE / PRO / ENTERPRISE
  isActive Boolean  @default(true)
  // ...
}
```

> **当前限制：** 虽然数据模型中 `User` 有 `tenantId` 字段，但当前所有操作默认使用 `tenantId = 1`（硬编码）。租户间的逻辑隔离尚未实现。详见 [Tenant 文档](./03-tenants.md)。

## 用户管理操作

### 创建用户

1. 通过数据库直接创建（当前无管理 UI）
2. Seed 数据在 `prisma/seed.ts` 中预设初始用户

### 验证 Seed 数据

Seed 脚本创建的用户：

| 邮箱 | 密码 | 角色 | 租户 |
|------|------|------|------|
| admin@example.com | (seed 定义) | ADMIN | tenant1 (id: 1) |
| manager@example.com | (seed 定义) | MANAGER | tenant1 |
| sales@example.com | (seed 定义) | SALES | tenant1 |

## 相关文件

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | User 模型定义 |
| `prisma/seed.ts` | 初始用户数据 |
| `middleware.ts` | 认证中间件（JWT 校验） |
| `app/api/auth/login/route.ts` | 登录 API |
| `app/api/auth/me/route.ts` | 当前用户信息 API |
