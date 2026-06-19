# 租户数据隔离

## 隔离机制

系统通过 `tenantId` 字段实现多租户数据隔离。每个租户的数据相互独立。

## 已隔离的模型

以下模型直接包含 `tenantId` 字段：

| Model | tenantId | 说明 |
|-------|----------|------|
| Tenant | N/A | 租户自身 |
| User | 有 | 用户属于特定租户 |
| Lead | 有 | 线索数据隔离 |
| Customer | 间接（通过 Owner） | 客户通过 owner.tenantId 隔离 |
| Quote | 有 | 报价单数据隔离 |
| Order | 有 | 订单数据隔离 |
| Task | 有 | 任务数据隔离 |
| AIControlSettings | 有 | AI 控制设置隔离 |
| AIPolicyRule | 有 | 策略规则隔离 |
| AIExecutionLog | 有 | 执行日志隔离 |

## 未隔离的模型（潜在风险）

以下模型当前**没有** `tenantId` 字段：

### 高风险

| Model | 风险说明 |
|-------|----------|
| EmailAccount | 邮件账户可能跨租户暴露 |
| EmailMessage | 邮件消息可能跨租户可见 |
| EmailThread | 邮件线程可能跨租户泄露 |
| IMPlatform | IM 平台配置全局共享 |
| IMMessage | IM 消息全局共享 |

### 中风险

| Model | 风险说明 |
|-------|----------|
| BusinessLine | 业务线全局唯一（name/code 唯一），无法多租户 |
| ActivityLog | 活动日志全局共享 |
| CalendarEvent | 日历事件全局共享 |
| SalesGoal | 销售目标全局共享 |

### 低风险（通过父级间接隔离）

| Model | 说明 |
|-------|------|
| Contact | 通过 Customer → Owner → tenantId 间接隔离 |
| Project | 通过 BusinessLine 或 Customer 间接关联 |
| FollowUp | 通过 Lead/Customer/Project 间接关联 |
| QuoteItem | 通过 Quote → tenantId 间接隔离 |
| OrderItem | 通过 Order → tenantId 间接隔离 |
| Invoice | 通过 Order 间接关联 |
| Payment | 通过 Invoice 间接关联 |

## 公海池机制

### 工作原理

1. Customer 的 `ownerId` 为 null 时，该客户处于"公海池"状态
2. 任何销售人员可以领取（claim）公海中的客户
3. 领取后设置 `ownerId`，客户成为该销售人员的私有客户
4. 客户也可以被退回公海（设置 `ownerId` 为 null）

### 相关操作

```typescript
// 领取客户
await prisma.customer.update({
  where: { id: customerId },
  data: { ownerId: currentUser.id, ownerName: currentUser.name }
})

// 退回公海
await prisma.customer.update({
  where: { id: customerId },
  data: { ownerId: null, ownerName: null, poolEnteredAt: new Date(), poolReason: '手动退回' }
})
```

### 公海池安全注意

当前公海池**不做租户隔离**——同一系统中的所有销售人员都可以看到公海中的客户。如果需要租户级公海池，需要：
1. 为 Customer 添加 `tenantId` 字段
2. 公海池查询时添加 `tenantId` 过滤条件

## 改进路径

### 阶段 1：核心数据隔离（推荐优先）

1. 为 Customer 添加 `tenantId` 字段
2. 为 EmailAccount、EmailMessage、EmailThread 添加 `tenantId`
3. 所有查询添加 `tenantId` 过滤

### 阶段 2：日志和配置隔离

4. 为 ActivityLog 添加 `tenantId`
5. 为 CalendarEvent、SalesGoal 添加 `tenantId`
6. BusinessLine 改为租户级唯一（移除全局唯一约束）

### 阶段 3：自动化防护

7. 在 Prisma Middleware 中自动注入 `tenantId` 过滤
8. 添加数据库行级安全策略（PostgreSQL RLS）
9. 审计所有 API Route 和 Server Action 的租户过滤

### Prisma Middleware 示例

```typescript
// lib/prisma.ts 中添加
prisma.$use(async (params, next) => {
  // 仅为查询操作自动注入 tenantId
  if (['findMany', 'findFirst', 'count'].includes(params.action)) {
    const user = await getCurrentUser()
    if (user?.tenantId) {
      params.args.where = {
        ...params.args.where,
        tenantId: user.tenantId,
      }
    }
  }
  return next(params)
})
```
