# AI 控制面板与策略 (AI Control & Policies)

## 概述

AI 控制面板 (`/ai-control-panel`) 提供对系统中 AI 行为的集中管控能力。管理员可以通过该面板控制 AI 功能的开关、执行方式、安全策略和工作时间限制。

## 核心概念

### AIControlSettings 模型

```prisma
model AIControlSettings {
  id                    Int      @id @default(autoincrement())
  tenantId              Int?     @unique     // 每租户唯一设置
  aiEnabled             Boolean  @default(true)
  salesAgentEnabled     Boolean  @default(true)
  emailAgentEnabled     Boolean  @default(true)
  whatsappAgentEnabled  Boolean  @default(false)
  followUpAgentEnabled  Boolean  @default(true)
  prospectingEnabled    Boolean  @default(false)
  executionMode         String   @default("MANUAL")  // MANUAL / APPROVAL / AUTO
  workHoursStart        Int      @default(9)
  workHoursEnd          Int      @default(18)
  maxContactsPerDay     Int      @default(5)
}
```

## 全局开关

| 开关 | 默认值 | 说明 |
|------|--------|------|
| `aiEnabled` | `true` | AI 系统总开关，关闭后所有 AI 功能停止 |
| `salesAgentEnabled` | `true` | 销售助手 Agent（消息生成、建议） |
| `emailAgentEnabled` | `true` | 邮件 Agent（自动回复建议） |
| `whatsappAgentEnabled` | `false` | WhatsApp Agent（消息回复） |
| `followUpAgentEnabled` | `true` | 跟进 Agent（自动跟进任务创建） |
| `prospectingEnabled` | `false` | 开拓 Agent（新线索挖掘） |

## 执行模式 (Execution Mode)

通过 `executionMode` 字段控制 AI 执行行为：

| 模式 | 说明 | Soft 规则行为 | Hard 规则行为 |
|------|------|-------------|-------------|
| `MANUAL` | 所有 AI 操作需手动触发 | 阻止 | 阻止 |
| `APPROVAL` | AI 准备操作但需人工审批 | 阻止 | 阻止 |
| `AUTO` | AI 自动执行操作 | **跳过** | 阻止 |

> **关键规则：** HARD 类型的策略规则在所有模式下都会执行，不可被跳过。

## 工时设置

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `workHoursStart` | `9` | 工作开始时间（24 小时制） |
| `workHoursEnd` | `18` | 工作结束时间（24 小时制） |

Guard 检查会在工作时间外阻止 AI 自动操作。

## 速率限制

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `maxContactsPerDay` | `5` | 每天最大联系人操作数 |

## 策略规则 (Policy Rules)

### AIPolicyRule 模型

```prisma
model AIPolicyRule {
  id        Int      @id @default(autoincrement())
  tenantId  Int?
  name      String                              // 规则名称
  type      String   @default("SOFT")           // HARD / SOFT
  action    String                              // 规则动作类型
  condition String                              // JSON 条件
  value     String?                             // 阈值
  isActive  Boolean  @default(true)
}
```

### 规则类型

| 类型 | 说明 | Auto 模式行为 |
|------|------|-------------|
| `HARD` | 强制阻断，不可覆盖 | 仍然阻断 |
| `SOFT` | 软性限制，可被覆盖 | Auto 模式下跳过 |

### 规则动作 (action)

| 动作 | 说明 |
|------|------|
| `block_send` | 阻止发送操作 |
| `limit_rate` | 速率限制 |
| `block_blacklist` | 黑名单客户阻断 |
| `block_discount` | 折扣限额阻断 |

### condition JSON 格式

策略规则的 `condition` 字段为 JSON 字符串，示例：

```json
{
  "customerStatus": "BLACKLIST"
}
```

```json
{
  "discountPercent": 20
}
```

`value` 字段配合 `block_discount` 使用，表示折扣百分比阈值。

## Guard 五步检查流程

Guard 模块 (`lib/ai/control/guard.ts`) 在每次 AI 操作前执行五步检查：

```
1. 全局开关 (aiEnabled) → 关闭则全部阻止
2. 模块开关 (salesAgent/emailAgent/...) → 对应模块关闭则阻止
3. 工时检查 (workHoursStart ~ workHoursEnd) → 非工作时间阻止
4. 策略规则 (AIPolicyRule) → HARD 规则强制阻止，SOFT 规则按模式决定
5. 速率限制 (maxContactsPerDay) → 超限则阻止
```

## 执行日志 (AIExecutionLog)

每次 Guard 检查的结果都会记录到 `AIExecutionLog`：

```prisma
model AIExecutionLog {
  id         Int      @id @default(autoincrement())
  tenantId   Int?
  actionType String   // email_send / whatsapp_send / task_create / lead_analyze
  entityType String?  // Lead / Customer / Quote / Order
  entityId   Int?
  allowed    Boolean                     // 是否允许执行
  reason     String?                     // 允许/阻止原因
  mode       String?                     // 当时的执行模式
}
```

查看日志：在 AI 控制面板 (`/ai-control-panel`) 中查看，或通过 `GET /api/ai-control/logs` API 查询。

## 配置入口

| 操作 | 路径 / API |
|------|-----------|
| 查看/修改设置 | `GET/PUT /api/ai-control/settings` |
| 创建策略规则 | `POST /api/ai-control/rules` |
| 修改策略规则 | `PUT /api/ai-control/rules/[id]` |
| 删除策略规则 | `DELETE /api/ai-control/rules/[id]` |
| 查看执行日志 | `GET /api/ai-control/logs` |
| UI 面板 | `/ai-control-panel` |
