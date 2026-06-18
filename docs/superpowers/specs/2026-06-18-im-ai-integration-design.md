# IM + AI 集成设计方案

> 日期：2026-06-18
> 项目：multi-business-crm
> 状态：已批准

## 1. 背景与目标

现有 multi-business-crm 是一个基于 Next.js + Prisma + PostgreSQL 的外贸 CRM 系统，已具备完整的线索、客户、商机、报价、订单、产品、跟进记录等管理功能。

**本次增强目标：** 接入飞书 IM，支持用户通过自然语言指令完成业务操作（创建线索、创建订单、查询进度等），并支持用户自定义模型 API。

## 2. 现有系统概况

### 技术栈
- 前端：Next.js 16, React 19, Tailwind CSS, Lucide Icons
- 后端：Next.js API Routes, Prisma ORM
- 数据库：PostgreSQL (Docker, port 5433)
- AI：OpenAI Compatible API（已接入小米 MiMo 模型）

### 已有功能模块
- 线索管理（全生命周期：NEW → CONTACTED → QUOTING → WON/LOST）
- 客户管理（360° 档案，含联系人）
- 商机项目管理（需求确认 → 报价 → 打样 → 谈判 → 成交）
- 报价管理（含明细项）
- 订单管理（含明细项，状态流转）
- 产品 + 业务线管理
- 跟进记录 + 跟进模板
- 任务管理（今日任务、逾期提醒）
- AI 分析（已接入自定义模型 API）
- Webhook 外部线索接入
- 文档管理
- 导入导出（CSV）
- 飞书集成指南（文档，无代码实现）

## 3. 新增功能设计

### 3.1 IM 消息网关

#### 飞书机器人集成

通过飞书开放平台的事件订阅机制接收用户消息：

```
用户在飞书 @机器人 发消息
  ↓
飞书平台推送事件到 Webhook URL
  ↓
POST /api/im/feishu/webhook
  ↓
验证签名 → 解析消息 → 转发到 AI 意图引擎
  ↓
执行业务操作 → 格式化结果 → 回复飞书消息
```

#### 飞书 Webhook 处理流程

1. **URL 验证**：飞书首次配置时发送 challenge 验证
2. **事件接收**：接收 `im.message.receive_v1` 事件
3. **签名验证**：使用 Encrypt Key 验证请求合法性
4. **消息解析**：提取消息文本、发送者信息
5. **去重处理**：基于 event_id 防止重复处理

#### 统一消息格式

```typescript
interface UnifiedMessage {
  platform: 'feishu' | 'telegram' | 'wechat';
  platformUserId: string;
  platformUserName: string;
  content: string;
  messageId: string;
  timestamp: Date;
}
```

### 3.2 AI 意图解析引擎

基于现有 `lib/ai/client.ts` 扩展，使用 Function Calling 将自然语言映射到业务操作。

#### 支持的意图

| 意图 | 触发示例 | 执行操作 |
|------|---------|---------|
| `create_lead` | "添加线索，ABC公司，美国，john@abc.com" | 创建 Lead 记录 |
| `create_customer` | "添加客户，XYZ集团，英国" | 创建 Customer 记录 |
| `create_order` | "帮ABC公司建个订单，产品XX，数量100" | 创建 Order 记录 |
| `add_followup` | "给ABC加跟进：今天电话沟通了价格" | 创建 FollowUp 记录 |
| `query_progress` | "ABC公司的订单进度怎么样" | 查询并返回订单状态 |
| `query_customers` | "本月新增了多少客户" | 查询统计数据 |
| `query_tasks` | "我今天有什么任务" | 查询待办任务 |
| `unknown` | 无法识别的输入 | 返回帮助信息 |

#### Function Calling 定义

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "创建新的销售线索",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "公司名称" },
          contactName: { type: "string", description: "联系人姓名" },
          country: { type: "string", description: "国家" },
          email: { type: "string", description: "邮箱" },
          phone: { type: "string", description: "电话" },
          requirement: { type: "string", description: "需求描述" },
        },
        required: ["company", "contactName"]
      }
    }
  },
  // ... 其他 function 定义
];
```

#### 意图解析流程

```
用户消息文本
  ↓
调用 LLM（带 Function Calling tools）
  ↓
LLM 返回: { function: "create_lead", arguments: {...} }
  ↓
参数校验 & 业务执行
  ↓
格式化结果 → 返回给用户
```

### 3.3 业务执行器

将 AI 解析的意图映射到对应的 Prisma 操作：

```typescript
// lib/ai/executor.ts
const executors = {
  create_lead: async (args) => {
    const lead = await prisma.lead.create({ data: args });
    await logActivity('CREATE', 'Lead', lead.id, lead.company);
    return { success: true, message: `线索已创建：${lead.company}`, data: lead };
  },
  create_order: async (args) => { ... },
  query_progress: async (args) => { ... },
  add_followup: async (args) => { ... },
  // ...
};
```

### 3.4 数据模型新增

#### 新增表

```prisma
model IMPlatform {
  id          Int      @id @default(autoincrement())
  name        String   @unique  // feishu / telegram / wechat
  appId       String?
  appSecret   String?
  webhookUrl  String?
  encryptKey  String?
  verifyToken String?
  botToken    String?           // Telegram bot token
  isActive    Boolean  @default(true)
  extra       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  imMessages  IMMessage[]
  imUsers     IMUser[]
}

model IMUser {
  id             Int      @id @default(autoincrement())
  platformId     Int
  platformUserId String   // 飞书 open_id / Telegram chat_id
  platformName   String?
  userId         Int?     // 关联系统用户（可选）
  createdAt      DateTime @default(now())

  platform  IMPlatform  @relation(fields: [platformId], references: [id])
  messages  IMMessage[]

  @@unique([platformId, platformUserId])
  @@index([platformId])
}

model IMMessage {
  id           Int      @id @default(autoincrement())
  platformId   Int
  imUserId     Int
  direction    String   // in / out
  content      String
  intent       String?  // AI 解析的意图
  action       String?  // 执行的操作
  actionResult Json?    // 操作结果
  errorMsg     String?
  createdAt    DateTime @default(now())

  platform IMPlatform @relation(fields: [platformId], references: [id])
  imUser   IMUser     @relation(fields: [imUserId], references: [id])

  @@index([createdAt])
  @@index([platformId])
}
```

### 3.5 API 路由设计

#### IM 相关

```
POST   /api/im/feishu/webhook     # 飞书事件回调（URL 验证 + 消息接收）
GET    /api/im/messages            # IM 消息历史（分页）
GET    /api/im/platforms           # 平台配置列表
POST   /api/im/platforms           # 添加平台配置
PUT    /api/im/platforms/:id       # 更新平台配置
DELETE /api/im/platforms/:id       # 删除平台配置
POST   /api/im/test                # 测试消息发送
```

#### AI 对话

```
POST   /api/ai/chat                # AI 对话（支持 function calling）
GET    /api/ai/chat/history        # 对话历史
```

### 3.6 前端页面

#### 新增页面

- `/im-settings` — IM 平台配置页面（配置飞书 App ID/Secret 等）
- `/im-messages` — IM 消息记录查看页面
- 增强现有 `/ai-settings` 页面，增加 Function Calling 配置

#### 侧边栏新增

```
外部接入
├── IM 设置              ← 新增
├── IM 消息记录          ← 新增
├── 外部来源
├── Webhook 测试
├── Webhook 日志
└── 接入指南
```

## 4. 模型 API 配置

用户可通过 `.env` 或 AI 设置页面配置自定义模型：

```env
# 现有配置（已支持）
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://your-api-url.com/v1"
AI_API_KEY="your-api-key"
AI_MODEL="your-model-name"

# 新增：Function Calling 配置
AI_FUNCTION_CALLING=true
AI_TEMPERATURE=0.1
```

要求模型支持 OpenAI 兼容的 Function Calling API。

## 5. 飞书接入步骤

1. 在飞书开放平台创建应用
2. 启用机器人能力
3. 配置事件订阅 URL：`https://your-domain.com/api/im/feishu/webhook`
4. 订阅 `im.message.receive_v1` 事件
5. 在系统 IM 设置页面填入 App ID、App Secret、Encrypt Key、Verify Token

## 6. 实施顺序

### Phase 1：数据模型 + 基础 API
- 新增 IMPlatform、IMUser、IMMessage 表
- 实现 IM 平台配置 CRUD API
- 实现 IM 消息记录 API

### Phase 2：AI 意图引擎
- 定义 Function Calling tools
- 实现意图解析器
- 实现业务执行器（create_lead、create_order、query_progress 等）
- 实现 `/api/ai/chat` API

### Phase 3：飞书 Webhook 集成
- 实现 `/api/im/feishu/webhook`（URL 验证 + 消息接收）
- 实现飞书消息回复（调用飞书 API 发送消息）
- 消息去重、错误处理

### Phase 4：前端页面
- IM 设置页面
- IM 消息记录页面
- 侧边栏更新

### Phase 5：扩展其他 IM 平台
- Telegram Bot 适配器
- 微信（企业微信）适配器

## 7. 测试策略

| 测试类型 | 覆盖目标 |
|---------|---------|
| 单元测试 | AI 意图解析准确率、业务执行器 |
| 集成测试 | Webhook 端到端（模拟飞书事件） |
| 手动测试 | 飞书实际发送消息验证 |

## 8. 约束与假设

- 飞书机器人需要公网可访问的 Webhook URL（开发时可用 ngrok）
- AI Function Calling 需要模型支持（OpenAI 兼容格式）
- 初期仅支持飞书，Telegram/微信后续扩展
- 不引入新的外部依赖（保持零依赖原则）
