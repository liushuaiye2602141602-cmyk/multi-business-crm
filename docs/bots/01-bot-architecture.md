# Bot 系统架构 (Bot Architecture)

## 系统概览

Bot 系统支持通过即时通讯平台（飞书、Telegram、企业微信）与 CRM 系统交互，使用 AI 意图识别和执行器将自然语言转换为 CRM 操作。

## 架构组成

```
┌──────────────────────────────────────────────┐
│              IM 平台                          │
│  (飞书 / Telegram / 企业微信)                │
└──────────────┬───────────────────────────────┘
               │ 消息到达
               ▼
┌──────────────────────────────────────────────┐
│           接入层 (Route Layer)                │
│                                              │
│  飞书 Webhook: /api/im/feishu/webhook        │
│  飞书长连接: scripts/feishu-bot.ts           │
│  通用 Webhook: /api/webhooks/leads           │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│           消息处理层                          │
│                                              │
│  1. 签名验证 (Webhook)                       │
│  2. 消息存储 (IMMessage)                     │
│  3. 意图解析 (lib/ai/intent.ts)              │
│     → LLM Function Calling                  │
│  4. 意图执行 (lib/ai/executor.ts)            │
│     → 16 种 CRM 操作                         │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│           响应层                              │
│                                              │
│  飞书: sendFeishuMessage()                   │
│  通用 Webhook: HTTP Response                 │
└──────────────────────────────────────────────┘
```

## IM 平台模型

### IMPlatform

```prisma
model IMPlatform {
  id          Int      @id @default(autoincrement())
  name        String   @unique          // 平台名称
  appId       String                    // 应用 ID
  appSecret   String                    // 应用密钥
  encryptKey  String?                   // 加密密钥（飞书）
  verifyToken String?                   // 验证 Token（飞书）
  botToken    String?                   // Bot Token
  isActive    Boolean  @default(true)
  extra       Json?                     // 扩展配置
}
```

### IMUser

```prisma
model IMUser {
  id              Int    @id @default(autoincrement())
  platformId      Int
  platformUserId  String                // 平台用户 ID
  platformName    String?               // 平台显示名
}
```

### IMMessage

```prisma
model IMMessage {
  id          Int      @id @default(autoincrement())
  platformId  Int
  imUserId    Int
  direction   String                   // in / out
  content     String
  intent      String?                  // AI 识别的意图
  action      String?                  // 执行的动作
  actionResult Json?                   // 执行结果
  errorMsg    String?                  // 错误信息
  createdAt   DateTime @default(now())
}
```

## 支持的平台

| 平台 | 模式 | 文件 |
|------|------|------|
| 飞书 (Feishu/Lark) | Webhook | `app/api/im/feishu/route.ts` |
| 飞书 (Feishu/Lark) | 长连接 (WebSocket) | `scripts/feishu-bot.ts` |
| Telegram | 配置支持 | `IMPlatform` 模型 |
| 企业微信 | 配置支持 | `IMPlatform` 模型 |

## AI 意图系统

### 意图解析流程

```
用户消息 → LLM (Function Calling) → IntentResult
                                        │
                                        ├── intent: "create_lead"
                                        └── args: { company: "ABC", ... }
```

### 支持的 16 种意图

| 意图 | 说明 | 执行操作 |
|------|------|---------|
| `create_lead` | 创建线索 | 创建 Lead 记录 |
| `create_customer` | 创建客户 | 创建 Customer 记录 |
| `create_order` | 创建订单 | 创建 Order 记录 |
| `create_quote` | 创建报价 | 创建 Quote 记录 |
| `add_followup` | 添加跟进 | 创建 FollowUp 记录 |
| `query_leads` | 查询线索 | 搜索并返回线索列表 |
| `query_customers` | 查询客户 | 搜索并返回客户列表 |
| `query_orders` | 查询订单 | 搜索并返回订单列表 |
| `query_tasks` | 查询任务 | 搜索并返回任务列表 |
| `query_pool` | 查询客户池 | 查看可认领的客户 |
| `update_order_status` | 更新订单状态 | 修改订单状态 |
| `update_customer_grade` | 更新客户等级 | 修改客户等级 |
| `complete_task` | 完成任务 | 标记任务为已完成 |
| `claim_customer` | 认领客户 | 从客户池认领客户 |
| `return_to_pool` | 退回客户池 | 将客户退回公海 |
| `help` | 帮助 | 返回帮助信息 |

## Webhook Bot（外部来源）

用于从外部系统（网站表单、Facebook、TikTok、N8N 等）接收线索数据。

```
外部系统 → POST /api/webhooks/leads → 签名验证 → 创建 Lead → 可选 AI 分析 → 记录 WebhookLog
```

认证方式：`x-crm-source-code` + `x-crm-api-key` Header

## 相关文件

| 文件 | 说明 |
|------|------|
| `app/api/im/feishu/route.ts` | 飞书 Webhook 接入 |
| `scripts/feishu-bot.ts` | 飞书长连接 Bot |
| `lib/im/feishu.ts` | 飞书 SDK 工具函数 |
| `app/api/im/platforms/route.ts` | IM 平台 CRUD API |
| `app/api/webhooks/leads/route.ts` | Webhook 线索接入 |
| `lib/webhook.ts` | Webhook 工具函数 |
| `lib/ai/intent.ts` | 意图解析 |
| `lib/ai/executor.ts` | 意图执行器 |
| `lib/ai/tools.ts` | 工具定义 |
| `lib/ai/vision.ts` | 图片分析 |
