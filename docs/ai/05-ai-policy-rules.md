# AI 策略规则 (AI Policy Rules)

## 概述

策略规则 (Policy Rules) 定义 AI 操作的安全边界。每条规则包含类型、动作、条件和阈值，Guard 在每次 AI 操作前评估所有激活的规则。

## 规则类型

### HARD（强制规则）

- **永远生效**，不可被任何执行模式跳过
- 条件匹配时 **强制阻止** 操作
- 适用于关键安全约束（如黑名单、敏感操作）

### SOFT（软性规则）

- 在 `MANUAL` 和 `APPROVAL` 模式下阻止操作
- 在 `AUTO` 模式下 **被跳过**（不阻止）
- 适用于可选的速率限制和质量控制

## 规则动作类型

### block_blacklist（黑名单阻断）

阻断与黑名单客户的交互操作。

```json
{
  "name": "黑名单客户阻断",
  "type": "HARD",
  "action": "block_blacklist",
  "condition": "{\"customerStatus\": \"BLACKLIST\"}",
  "isActive": true
}
```

### block_discount（折扣限额阻断）

当折扣超过阈值时阻断操作。

```json
{
  "name": "折扣超过20%阻断",
  "type": "HARD",
  "action": "block_discount",
  "condition": "{\"discountPercent\": 20}",
  "value": "20",
  "isActive": true
}
```

### limit_rate（速率限制）

限制 AI 操作频率。与 `AIControlSettings.maxContactsPerDay` 配合使用。

```json
{
  "name": "每日联系上限",
  "type": "SOFT",
  "action": "limit_rate",
  "condition": "{\"limitType\": \"daily_contacts\"}",
  "value": "10",
  "isActive": true
}
```

### block_send（发送阻断）

阻止特定类型的发送操作。

```json
{
  "name": "阻止邮件发送",
  "type": "SOFT",
  "action": "block_send",
  "condition": "{\"channel\": \"email\"}",
  "isActive": true
}
```

## Guard 评估逻辑

Guard (`lib/ai/control/guard.ts`) 中的 `evaluateRule()` 函数评估规则：

```
对于每条激活的规则:
  1. 解析 condition JSON
  2. 根据 action 类型执行评估:
     - block_blacklist: 检查客户是否在黑名单
     - block_discount: 检查折扣是否超过阈值
     - limit_rate: 检查频率是否超限
     - block_send: 检查发送类型是否匹配
  3. 返回评估结果
```

## 规则管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-control/rules` | 列出所有规则 |
| POST | `/api/ai-control/rules` | 创建新规则 |
| PUT | `/api/ai-control/rules/[id]` | 更新规则 |
| DELETE | `/api/ai-control/rules/[id]` | 删除规则 |

### 创建规则示例

```bash
curl -X POST http://localhost:3000/api/ai-control/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "禁止对黑名单客户发送邮件",
    "type": "HARD",
    "action": "block_blacklist",
    "condition": "{\"customerStatus\": \"BLACKLIST\", \"channel\": \"email\"}",
    "isActive": true
  }'
```

## AIPolicyRule 数据模型

```prisma
model AIPolicyRule {
  id        Int      @id @default(autoincrement())
  tenantId  Int?
  name      String                    // 规则名称
  type      String   @default("SOFT") // HARD / SOFT
  action    String                    // block_send / limit_rate / block_blacklist / block_discount
  condition String                    // JSON 条件
  value     String?                   // 阈值（用于 limit_rate 和 block_discount）
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 建议的策略规则配置

### 初始部署（保守）

| 规则名称 | 类型 | 动作 | 说明 |
|---------|------|------|------|
| 黑名单客户阻断 | HARD | block_blacklist | 阻止对黑名单客户的所有 AI 操作 |
| 折扣限额 15% | HARD | block_discount | 超过 15% 折扣需人工审批 |
| 每日邮件上限 | SOFT | limit_rate | 每天最多自动发送 10 封邮件 |

### 成熟期（高效）

| 规则名称 | 类型 | 动作 | 说明 |
|---------|------|------|------|
| 黑名单客户阻断 | HARD | block_blacklist | 安全底线 |
| 折扣限额 30% | HARD | block_discount | 放宽折扣限制 |
| 大额订单阻断 | HARD | block_send | 超过 $10,000 的订单自动操作需审批 |
