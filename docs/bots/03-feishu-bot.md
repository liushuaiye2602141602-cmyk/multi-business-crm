# 飞书 Bot (Feishu Bot)

## 概述

飞书 Bot 支持两种运行模式：**Webhook 模式**（适合 Serverless 部署）和 **长连接 WebSocket 模式**（适合独立服务器部署）。两种模式都通过 AI 意图系统处理用户消息。

## 两种运行模式

### 模式对比

| 特性 | Webhook 模式 | 长连接模式 |
|------|-------------|-----------|
| 部署方式 | Serverless / API Gateway | 独立 Node.js 进程 |
| 文件 | `app/api/im/feishu/route.ts` | `scripts/feishu-bot.ts` |
| 启动命令 | 自动（Next.js 路由） | `npm run feishu:bot` |
| 连接方式 | 飞书推送事件到 Webhook URL | 主动连接飞书 WebSocket |
| 图片支持 | 不支持 | 支持（Vision API） |
| 持久连接 | 无 | 有（WSClient） |

### 模式一：Webhook 模式

**端点：** `POST /api/im/feishu/webhook`

**处理流程：**

```
1. 飞书发送事件到 Webhook URL
2. URL 验证（challenge 响应）
3. 签名验证 (verifyFeishuSignature)
4. 解析事件类型
5. 处理 im.message.receive_v1 事件
6. 存储消息到 IMMessage
7. 异步处理：parseIntent → executeIntent
8. 通过 sendFeishuMessage 回复用户
```

**飞书配置步骤：**

1. 在飞书开放平台创建自建应用
2. 添加机器人能力
3. 配置事件订阅：
   - 请求地址：`https://your-domain.com/api/im/feishu/webhook`
   - 订阅事件：`im.message.receive_v1`
4. 配置权限：
   - `im:message` — 获取与发送消息
   - `im:message:send_as_bot` — 以应用身份发消息
5. 在系统的 `/im-settings` 页面配置：
   - `appId` — 应用 App ID
   - `appSecret` — 应用 App Secret
   - `encryptKey` — 事件加密密钥
   - `verifyToken` — 事件验证 Token

### 模式二：长连接 WebSocket 模式

**脚本：** `scripts/feishu-bot.ts`

**启动命令：**

```bash
npm run feishu:bot
```

**技术实现：**

- 使用 `@larksuiteoapi/node-sdk` 的 `WSClient`
- 建立持久 WebSocket 连接到飞书服务器
- 支持文本消息和图片消息

**处理流程：**

```
文本消息:
1. 接收消息事件
2. 存储到 IMMessage
3. parseIntent → executeIntent
4. sendFeishuMessage 回复

图片消息:
1. 接收图片事件
2. 下载图片
3. Vision API 分析（提取客户信息）
4. 自动创建 Lead
5. 回复分析结果
```

**飞书配置步骤（长连接模式）：**

1. 在飞书开放平台创建自建应用
2. 添加机器人能力
3. 启用 **长连接** 模式（在事件订阅中选择）
4. 订阅事件：`im.message.receive_v1`
5. 在 `/im-settings` 中配置 appId 和 appSecret
6. 运行 `npm run feishu:bot` 启动 Bot

## 飞书工具函数

### verifyFeishuSignature

```typescript
// lib/im/feishu.ts
verifyFeishuSignature(timestamp, nonce, encryptKey, body, signature)
```

基于 SHA256 的签名验证，确保请求来自飞书服务器。

### sendFeishuMessage

```typescript
// lib/im/feishu.ts
sendFeishuMessage(receiveId, msgType, content)
```

1. 获取 tenant_access_token（使用 appId 和 appSecret）
2. 调用飞书消息发送 API
3. 支持文本消息类型

## AI 意图处理

Bot 收到消息后通过 AI 意图系统处理：

```
用户消息 → LLM (Function Calling) → IntentResult → executeIntent → CRM 操作 → 回复
```

支持 16 种意图（详见 [Bot 架构文档](./01-bot-architecture.md)）。

## 相关文件

| 文件 | 说明 |
|------|------|
| `app/api/im/feishu/route.ts` | Webhook 模式入口 |
| `scripts/feishu-bot.ts` | 长连接模式脚本 |
| `lib/im/feishu.ts` | 飞书工具函数 |
| `lib/ai/intent.ts` | 意图解析 |
| `lib/ai/executor.ts` | 意图执行器 |
| `lib/ai/tools.ts` | 工具定义和 Prompt |
| `lib/ai/vision.ts` | 图片分析（长连接模式） |
