# Event Bus

Event Bus 是 CRM Core 与 AI Core Engine 之间的解耦层，位于 `lib/events/bus.ts`。

## 架构位置

```
Server Action / API Route
      ↓
  emit('event.name', payload)
      ↓
  bus.ts — 记录 ActivityLog + 路由到 Handler
      ↓
  Handler 执行副作用
```

## 核心机制

Event Bus 实现为一个简单的 switch/case 路由器。每次事件触发时：

1. 在 `ActivityLog` 表中记录事件
2. 根据事件类型路由到对应的 Handler
3. Handler 执行副作用（创建 FollowUp、触发 AI 评分等）

### 事件定义

```typescript
// lib/events/bus.ts

type EventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.converted'
  | 'quote.created'
  | 'quote.sent'
  | 'quote.accepted'
  | 'order.created'
  | 'order.confirmed'
  | 'order.completed'
  | 'customer.created'
  | 'customer.updated'
  | 'task.created'
  | 'task.completed'
  | 'email.received'
  | 'email.sent'
```

### emit() 函数

```typescript
export async function emit(eventType: string, payload: Record<string, any>) {
  // 1. 记录 ActivityLog
  await prisma.activityLog.create({
    data: {
      action: eventType,
      entityType: payload.entityType || 'unknown',
      entityId: payload.entityId || 'unknown',
      entityName: payload.entityName || eventType,
      description: JSON.stringify(payload),
    }
  })

  // 2. 路由到 Handler
  switch (eventType) {
    case 'lead.created':
      await handleLeadCreated(payload)
      break
    case 'quote.sent':
      await handleQuoteSent(payload)
      break
    case 'order.confirmed':
      await handleOrderConfirmed(payload)
      break
    // ... 其他事件
  }
}
```

## 已接线的事件

### lead.created

**触发时机**：创建新线索后

**副作用**：
1. 自动创建 FollowUp 任务（`lib/domain/auto-tasks.ts`）
2. 自动触发线索 AI 评分

### quote.sent

**触发时机**：发送报价单后

**副作用**：
1. 自动创建 FollowUp 任务
2. 自动触发成交概率评分（deal-scoring-agent）

### order.confirmed

**触发时机**：确认订单后

**副作用**：
1. 自动创建生产跟进任务

## 未接线的事件（已定义但 Handler 未实现）

以下事件类型已定义在 EventType 中，但尚未接入实际处理逻辑：

- `lead.updated` — 线索更新
- `lead.converted` — 线索转客户
- `quote.created` — 报价单创建
- `quote.accepted` — 报价单接受
- `order.created` — 订单创建
- `order.completed` — 订单完成
- `customer.created` — 客户创建
- `customer.updated` — 客户更新
- `task.created` — 任务创建
- `task.completed` — 任务完成
- `email.received` — 邮件接收
- `email.sent` — 邮件发送

## 如何添加新事件

### 步骤 1：定义事件类型

在 `lib/events/bus.ts` 的 EventType 类型中添加新事件名：

```typescript
type EventType =
  | 'lead.created'
  | 'customer.created'  // ← 新增
```

### 步骤 2：实现 Handler

```typescript
async function handleCustomerCreated(payload: Record<string, any>) {
  const { customerId, customerName } = payload

  // 示例：自动创建欢迎任务
  await prisma.task.create({
    data: {
      title: `欢迎新客户: ${customerName}`,
      type: 'FOLLOW_UP',
      status: 'PENDING',
      priority: 'MEDIUM',
      customerId,
    }
  })
}
```

### 步骤 3：在 switch/case 中注册

```typescript
switch (eventType) {
  // ...existing cases
  case 'customer.created':
    await handleCustomerCreated(payload)
    break
}
```

### 步骤 4：在业务代码中触发

```typescript
// 在 Server Action 或 API Route 中
import { emit } from '@/lib/events/bus'

await emit('customer.created', {
  entityType: 'customer',
  entityId: customer.id,
  entityName: customer.name,
  customerId: customer.id,
  customerName: customer.name,
})
```

## 注意事项

1. **Event Bus 是同步路由的**：Handler 按顺序执行，不是并发
2. **ActivityLog 必写**：所有事件都会写入 ActivityLog 表
3. **Handler 中的异常不会回滚 emit 调用者的操作**
4. **payload 结构灵活**：使用 `Record<string, any>` 类型，但建议定义明确的 payload 接口
5. **AI 操作会经过 Control Guard**：Handler 中的 AI 调用会自动通过权限检查
