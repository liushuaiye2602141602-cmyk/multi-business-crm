# 日志与审计 (Logs & Audit)

## 日志系统概览

系统包含三种独立的日志机制，用于不同场景的审计需求。

## 1. ActivityLog（操作日志）

### 模型定义

```prisma
model ActivityLog {
  id          Int      @id @default(autoincrement())
  action      String              // create / update / delete / ai_analysis 等
  entityType  String              // Lead / Customer / Quote / IM 等
  entityId    String?
  entityName  String?
  description String?
  createdAt   DateTime @default(now())
}
```

### 记录的内容

以下操作会写入 ActivityLog：

- **IM 消息处理** — 消息解析和意图执行
- **IM 实体创建** — 通过 IM Bot 创建线索、客户、订单、报价、跟进、任务
- **IM 实体更新** — 更新订单状态、客户等级
- **IM 任务完成** — 标记任务为已完成
- **客户池操作** — 认领客户、退回客户池
- **Webhook 线索创建** — 外部来源推送的线索
- **Webhook AI 分析** — 对 webhook 线索的自动分析
- **CSV 数据导入** — 导入线索、客户、产品

### 查看日志

- **UI 页面：** `/activity-logs` — 显示最近 100 条记录
- **颜色标识：** 绿色(create) / 蓝色(update) / 红色(delete) / 紫色(AI)

### 当前限制

- 无分页功能，仅显示最近 100 条
- 无按用户筛选
- 无 tenantId 字段（日志为全局记录）
- 写入失败时静默忽略，不阻断主流程

## 2. AIExecutionLog（AI 执行日志）

### 模型定义

```prisma
model AIExecutionLog {
  id         Int      @id @default(autoincrement())
  tenantId   Int?
  actionType String   // email_send / whatsapp_send / task_create / lead_analyze
  entityType String?  // Lead / Customer / Quote / Order
  entityId   Int?
  allowed    Boolean             // 是否允许执行
  reason     String?             // 允许/阻止的原因
  mode       String?             // 执行时的模式 MANUAL / APPROVAL / AUTO
  createdAt  DateTime @default(now())
}
```

### 记录的内容

每次 AI Guard 检查的结果都会记录：

- Guard 的五步检查决策结果
- 被阻止的 AI 操作及原因
- 允许执行的操作及当时的模式

### 查看日志

- **UI 页面：** `/ai-control-panel` 的日志 Tab
- **API：** `GET /api/ai-control/logs?actionType=xxx&allowed=true`
- **筛选：** 支持按 `actionType` 和 `allowed` 筛选

### 查询参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `actionType` | 操作类型筛选 | `email_send` |
| `allowed` | 是否允许 | `true` / `false` |
| `page` | 页码 | `1` |
| `pageSize` | 每页数量 | `20` |

## 3. WebhookLog（Webhook 日志）

### 模型定义

```prisma
model WebhookLog {
  id               Int      @id @default(autoincrement())
  externalSourceId Int?
  sourceCode       String?
  status           WebhookStatus  // SUCCESS / FAILED / UNAUTHORIZED / DUPLICATE / VALIDATION_ERROR
  requestBody      String?
  responseBody     String?
  errorMessage     String?
  createdLeadId    Int?
  ipAddress        String?
  userAgent        String?
  createdAt        DateTime @default(now())
}
```

### 记录的内容

每次 Webhook 调用都完整记录：

- 来源和状态
- 完整的请求和响应体
- 错误信息
- 创建的线索 ID
- 客户端 IP 和 User-Agent

### 查看日志

- **UI 页面：** `/webhook-logs` — 列表视图
- **详情页面：** `/webhook-logs/[id]` — 单条日志详情
- **API：** 通过导出功能可导出为 CSV

### WebhookStatus 枚举

| 状态 | 说明 |
|------|------|
| `SUCCESS` | 成功创建线索 |
| `FAILED` | 处理失败 |
| `UNAUTHORIZED` | API Key 认证失败 |
| `DUPLICATE` | 重复线索（邮箱匹配） |
| `VALIDATION_ERROR` | 请求数据校验失败 |

## 4. AILog（AI 操作日志）

### 模型定义

```prisma
model AILog {
  id         Int      @id @default(autoincrement())
  entityType String
  entityId   Int
  actionType String
  aiOutput   String?
  createdAt  DateTime @default(now())
}
```

用于记录 AI Core Engine (`lib/ai/core.ts`) 的 `log()` 方法输出。记录 AI 对具体实体的操作和输出结果。

## 日志对比

| 日志类型 | 记录范围 | 有 tenantId | 分页 | 筛选 |
|---------|---------|------------|------|------|
| ActivityLog | 所有 CRUD + IM 操作 | 无 | 仅最新 100 条 | 无 |
| AIExecutionLog | AI Guard 检查结果 | 有 | 支持分页 | actionType, allowed |
| WebhookLog | Webhook 调用 | 无 | 有 | status |
| AILog | AI Core 操作 | 无 | 有 | entityType, entityId |
