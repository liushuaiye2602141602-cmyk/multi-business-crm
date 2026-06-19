# AI 执行日志 (AI Execution Logs)

## 概述

系统记录两种 AI 日志：`AIExecutionLog`（Guard 执行审计）和 `AILog`（AI 操作输出记录）。两者配合使用可以完整追踪 AI 的决策和执行过程。

## AIExecutionLog（执行审计日志）

### 模型定义

```prisma
model AIExecutionLog {
  id         Int      @id @default(autoincrement())
  tenantId   Int?
  actionType String                     // 操作类型
  entityType String?                    // 实体类型
  entityId   Int?                       // 实体 ID
  allowed    Boolean                    // 是否允许执行
  reason     String?                    // 决策原因
  mode       String?                    // 执行模式
  createdAt  DateTime @default(now())
  @@index([tenantId])
  @@index([actionType])
  @@index([allowed])
  @@index([createdAt])
}
```

### 字段说明

| 字段 | 说明 | 示例值 |
|------|------|--------|
| `actionType` | AI 操作类型 | `email_send`, `whatsapp_send`, `task_create`, `lead_analyze` |
| `entityType` | 操作的实体类型 | `Lead`, `Customer`, `Quote`, `Order` |
| `entityId` | 操作的实体 ID | `42` |
| `allowed` | Guard 是否允许执行 | `true` / `false` |
| `reason` | Guard 决策原因 | "AUTO 模式允许", "HARD 规则阻止" |
| `mode` | 当时的执行模式 | `MANUAL`, `APPROVAL`, `AUTO` |

### 查看日志

**UI 页面：** `/ai-control-panel` → 日志 Tab

**API 接口：**

```
GET /api/ai-control/logs
```

**查询参数：**

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `actionType` | string | 按操作类型筛选 | `email_send` |
| `allowed` | boolean | 按是否允许筛选 | `true` |
| `page` | number | 页码 | `1` |
| `pageSize` | number | 每页数量 | `20` |

**响应格式：**

```json
{
  "logs": [
    {
      "id": 1,
      "tenantId": 1,
      "actionType": "email_send",
      "entityType": "Lead",
      "entityId": 42,
      "allowed": false,
      "reason": "HARD 规则: 黑名单客户阻断",
      "mode": "AUTO",
      "createdAt": "2026-06-19T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

## AILog（操作日志）

### 模型定义

```prisma
model AILog {
  id         Int      @id @default(autoincrement())
  entityType String
  entityId   Int
  actionType String
  aiOutput   String?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### 记录内容

AILog 由 AI Core Engine 的 `log()` 方法写入，记录：
- AI 对具体实体执行的操作
- AI 的输出内容（`aiOutput`）

### 查看日志

通过 AI 分析页面 `/ai-analyses` 查看分析结果，或直接查询数据库。

## 日志分析场景

### 场景 1：排查 AI 操作被阻止

```
1. 在 AIExecutionLog 中筛选 allowed=false
2. 查看 reason 字段了解阻止原因
3. 根据原因调整策略规则或执行模式
```

### 场景 2：审计 AI 自动操作

```
1. 筛选 mode=AUTO, allowed=true
2. 检查 actionType 和 entityType 确认操作范围
3. 确认操作结果是否符合预期
```

### 场景 3：监控 AI 使用量

```
1. 按 actionType 统计数量
2. 对比 allowed=true 和 allowed=false 的比例
3. 识别高频操作和高频阻止原因
```

## 日志清理建议

| 日志类型 | 保留期 | 清理方式 |
|---------|--------|---------|
| AIExecutionLog | 90 天 | 定期数据库清理 |
| AILog | 90 天 | 定期数据库清理 |
| ActivityLog | 30 天 | 当前无自动清理 |

```sql
-- 清理 90 天前的 AIExecutionLog
DELETE FROM "AIExecutionLog" 
WHERE "createdAt" < NOW() - INTERVAL '90 days';

-- 清理 90 天前的 AILog
DELETE FROM "AILog" 
WHERE "createdAt" < NOW() - INTERVAL '90 days';
```
