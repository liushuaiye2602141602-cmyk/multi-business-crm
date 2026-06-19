# AI 安全 (AI Safety)

## 安全机制概览

AI 系统通过多层次安全机制确保操作在可控范围内执行。

## Guard 五步检查

Guard (`lib/ai/control/guard.ts`) 是 AI 安全的第一道防线。

```
┌────────────────────────────────────────────┐
│          AI Operation Request              │
└─────────────┬──────────────────────────────┘
              ▼
┌────────────────────────────────────────────┐
│ Step 1: 全局开关检查                        │
│ aiEnabled == false → BLOCK                │
└─────────────┬──────────────────────────────┘
              ▼ (通过)
┌────────────────────────────────────────────┐
│ Step 2: 模块开关检查                        │
│ 对应模块 enabled == false → BLOCK          │
└─────────────┬──────────────────────────────┘
              ▼ (通过)
┌────────────────────────────────────────────┐
│ Step 3: 工时检查                            │
│ 当前时间 NOT IN [workHoursStart, workHoursEnd]│
│ → BLOCK                                   │
└─────────────┬──────────────────────────────┘
              ▼ (通过)
┌────────────────────────────────────────────┐
│ Step 4: 策略规则评估                        │
│ HARD 规则匹配 → BLOCK (不可覆盖)           │
│ SOFT 规则匹配 → BLOCK (AUTO模式跳过)       │
└─────────────┬──────────────────────────────┘
              ▼ (通过)
┌────────────────────────────────────────────┐
│ Step 5: 速率限制                            │
│ 今日操作数 >= maxContactsPerDay → BLOCK    │
└─────────────┬──────────────────────────────┘
              ▼
┌────────────────────────────────────────────┐
│          ALLOWED → 执行操作                 │
│          BLOCKED → 记录日志，返回原因        │
└────────────────────────────────────────────┘
```

## 安全措施

### 1. 操作前检查 (Pre-execution)

- **Guard 五步检查** — 每次 AI 操作前必须通过
- **HARD 规则不可跳过** — 无论执行模式如何，HARD 规则始终生效
- **工时限制** — 非工作时间阻止自动操作

### 2. 操作中控制 (During execution)

- **HTTP 超时** — LLM 调用 60 秒超时 (`lib/ai/client.ts`)
- **测试超时** — 连接测试 15 秒超时
- **错误处理** — 针对 401/403/404/429/500/502/503 有详细错误处理

### 3. 操作后审计 (Post-execution)

- **AIExecutionLog** — 记录每次 Guard 检查结果
- **AILog** — 记录 AI 操作输出
- **ActivityLog** — 记录事件触发

## Guard 检查详情

### 全局开关

```json
// AIControlSettings
{
  "aiEnabled": true,           // 总开关
  "salesAgentEnabled": true,    // 销售 Agent
  "emailAgentEnabled": true,    // 邮件 Agent
  "whatsappAgentEnabled": false, // WhatsApp Agent
  "followUpAgentEnabled": true,  // 跟进 Agent
  "prospectingEnabled": false    // 开拓 Agent
}
```

关闭对应的开关可以立即停止该模块的所有 AI 操作。

### 工时限制

```json
{
  "workHoursStart": 9,    // 09:00
  "workHoursEnd": 18      // 18:00
}
```

Guard 检查当前时间是否在工作时间范围内。超出范围时阻止 AI 自动操作。

### 速率限制

```json
{
  "maxContactsPerDay": 5
}
```

限制每天 AI 可操作的最大联系人数量。Guard 跟踪当日操作次数。

### 策略规则

| 规则类型 | 安全级别 | AUTO 模式 |
|---------|---------|----------|
| HARD + block_blacklist | 最高 | 仍然阻止 |
| HARD + block_discount | 最高 | 仍然阻止 |
| SOFT + limit_rate | 中等 | 被跳过 |
| SOFT + block_send | 中等 | 被跳过 |

## 速率限制详情

速率限制在以下层面实现：

1. **Guard 层** — `maxContactsPerDay` 检查
2. **Provider 层** — LLM Provider 的 API 速率限制（429 错误处理）
3. **HTTP 层** — 60 秒请求超时

## 审计追踪

完整的审计链：

```
Event → Handler → Guard Check → Execution → Log
         │           │              │          │
         ▼           ▼              ▼          ▼
    ActivityLog  AIExecutionLog  AI结果    AILog
    (事件触发)   (Guard 决策)   (操作结果)  (操作输出)
```

每条日志记录包含：
- 操作类型和实体信息
- Guard 的允许/阻止决策和原因
- 执行时的模式
- 时间戳

## 已知安全限制

1. **密码明文存储** — EmailAccount.password 和 AIConfig.apiKey 明文存储
2. **API 无角色校验** — AI 管理接口无额外权限检查
3. **日志无 tenantId 隔离** — ActivityLog 和 AILog 缺少 tenantId
4. **IM 意图无权限校验** — IM Bot 意图执行器不检查用户角色
5. **OAuth 未实现** — EmailAccount.oauthToken 字段存在但未使用
