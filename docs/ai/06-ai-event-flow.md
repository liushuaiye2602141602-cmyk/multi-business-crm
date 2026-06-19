# AI 事件流程 (AI Event Flow)

## 概述

Event Bus 是连接 CRM 业务操作和 AI 处理的核心桥梁。当 CRM 中发生特定事件时，Event Bus 自动触发相应的 AI 操作。

## 完整事件流程

```
CRM 操作（创建线索/发送报价/...）
        │
        ▼
┌─────────────────────┐
│     Event Bus        │
│  (lib/events/bus.ts) │
│                     │
│  emit(event)        │
│  → 写入 ActivityLog │
│  → 路由到 handler   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    Handler 处理      │
│                     │
│  handleLeadCreated  │
│  handleQuoteSent    │
│  handleOrderConfirmed│
└─────────┬───────────┘
          │ 需要 AI 操作时
          ▼
┌─────────────────────┐
│    Control Guard     │
│ (checkAIPermission) │
│                     │
│  1. Global Toggle   │
│  2. Module Toggle   │
│  3. Work Hours      │
│  4. Policy Rules    │
│  5. Rate Limits     │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
  Allowed    Blocked
    │           │
    ▼           ▼
┌────────┐ ┌──────────────┐
│ Execute │ │ Log AIExecution│
│  Action │ │ (allowed=false)│
└────────┘ └──────────────┘
    │
    ▼
┌─────────────────────┐
│   Write Results      │
│                     │
│  AIExecutionLog     │
│  AILog              │
│  ActivityLog        │
│  创建跟进任务/更新数据 │
└─────────────────────┘
```

## 支持的事件类型

| 事件 | 触发条件 | AI 操作 |
|------|---------|---------|
| `lead.created` | 新线索创建 | 创建跟进任务 + AI 交易评分 |
| `lead.updated` | 线索更新 | (记录日志) |
| `lead.converted` | 线索转客户 | (记录日志) |
| `quote.created` | 报价创建 | (记录日志) |
| `quote.sent` | 报价发送 | 创建跟进任务 + AI 交易评分 |
| `quote.accepted` | 报价接受 | (记录日志) |
| `order.created` | 订单创建 | (记录日志) |
| `order.confirmed` | 订单确认 | 创建生产跟进任务（无 AI） |
| `order.completed` | 订单完成 | (记录日志) |
| `customer.created` | 客户创建 | (记录日志) |
| `customer.updated` | 客户更新 | (记录日志) |
| `task.created` | 任务创建 | (记录日志) |
| `task.completed` | 任务完成 | (记录日志) |
| `email.received` | 邮件接收 | (记录日志) |
| `email.sent` | 邮件发送 | (记录日志) |

## 详细事件处理

### handleLeadCreated

```
1. 创建跟进任务 (type: FOLLOW_UP)
   - 关联到新创建的线索
   - 设置默认优先级和截止时间

2. AI 交易评分
   - checkAIPermission("lead_analyze", "Lead", leadId)
   - 若允许 → scoreDealProbability(leadId)
   - 若阻止 → 记录 AIExecutionLog (allowed=false)
```

### handleQuoteSent

```
1. 创建跟进任务 (type: FOLLOW_UP)
   - 关联到报价
   - 提醒跟进客户反馈

2. AI 交易评分
   - checkAIPermission("lead_analyze", "Quote", quoteId)
   - 若允许 → scoreDealProbability(quoteId)
   - 若阻止 → 记录 AIExecutionLog (allowed=false)
```

### handleOrderConfirmed

```
1. 创建生产跟进任务 (type: FOLLOW_UP)
   - 关联到订单
   - 无 AI 操作
```

## Event Bus 集成的 AI 安全机制

Event Bus 在触发任何 AI 操作前，必须通过 Guard 检查：

```typescript
// lib/events/bus.ts 中的模式
const permission = await checkAIPermission({
  action: "lead_analyze",
  entityType: "Lead",
  entityId: leadId
})

if (permission.allowed) {
  await scoreDealProbability(leadId)
  await logAIExecution({
    actionType: "lead_analyze",
    entityType: "Lead",
    entityId: leadId,
    allowed: true,
    reason: permission.reason
  })
} else {
  await logAIExecution({
    actionType: "lead_analyze",
    entityType: "Lead",
    entityId: leadId,
    allowed: false,
    reason: permission.reason
  })
}
```

## 扩展 Event Bus

要添加新的事件处理：

1. 在 `lib/events/bus.ts` 的 `emit()` 函数 switch 语句中添加新 case
2. 实现对应的 `handle*` 函数
3. 如涉及 AI 操作，通过 `checkAIPermission()` 检查权限
4. 记录 AIExecutionLog

## 相关文件

| 文件 | 说明 |
|------|------|
| `lib/events/bus.ts` | Event Bus 核心实现 |
| `lib/ai/control/guard.ts` | AI 权限 Guard |
| `lib/ai/agents/deal-scoring-agent.ts` | 交易评分实现 |
| `lib/ai/agents/followup-agent.ts` | 跟进任务创建 |
| `lib/activity-log.ts` | ActivityLog 写入 |
