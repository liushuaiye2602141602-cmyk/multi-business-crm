# 邮件同步 (Email Sync)

## 概述

邮件同步功能通过 IMAP 协议从邮件服务器拉取邮件到本地数据库。支持手动触发和自动绑定 CRM 实体。

## 同步机制

### IMAP 拉取流程

```
1. 根据 EmailAccount ID 加载账户配置
2. 使用 imapflow 连接 IMAP 服务器
3. 获取 INBOX 邮件列表
4. 按 Message-ID 去重
5. 解析邮件内容（envelope + source）
6. 创建 EmailMessage 记录
7. 线程处理（基于 inReplyTo）
8. 自动绑定 CRM 实体
9. 更新 lastSyncAt
```

### API 触发

```
POST /api/email/sync
Content-Type: application/json

{
  "accountId": 1
}
```

**响应：**

```json
{
  "total": 120,
  "new": 5,
  "message": "同步完成：共 120 封邮件，新增 5 封"
}
```

## 线程构建逻辑

### 新邮件（无 inReplyTo）

```
创建新 EmailThread
  → subject 作为线程标题
  → messageCount = 1
  → lastMessageAt = 当前时间
```

### 回复邮件（有 inReplyTo）

```
查找 inReplyTo 匹配的已有 Message
  → 如果找到：附加到该消息所在的 Thread
    → messageCount += 1
    → lastMessageAt = 当前时间
  → 如果未找到：创建新 Thread
```

## 自动绑定 CRM 实体

同步过程中，系统自动尝试将邮件绑定到已有的 CRM 实体：

### 绑定优先级

```
1. Contact.email 匹配 → 绑定 contactId + customerId
2. Customer.email 匹配 → 绑定 customerId
3. Lead.email 匹配 → 绑定 leadId
```

### 绑定规则

- 根据发件人邮箱地址 (`fromAddr`) 在 CRM 数据库中查找匹配
- 找到第一个匹配的实体后停止搜索
- 回复邮件 (direction=out) 根据收件人 (`toAddr`) 匹配
- `quoteId` 和 `orderId` 不自动绑定，需要手动设置

## 手动同步

### 通过 UI 触发

1. 导航到 `/email/accounts`
2. 点击对应账户的 "同步" 按钮
3. 等待同步完成
4. 查看结果（新增邮件数）

### 通过 API 触发

```bash
curl -X POST http://localhost:3000/api/email/sync \
  -H "Content-Type: application/json" \
  -d '{"accountId": 1}'
```

## 同步限制

| 参数 | 值 | 说明 |
|------|-----|------|
| 默认拉取数量 | 50 封 | 每次同步最多拉取 50 封 |
| 消息体截断 | 10,000 字符 | 超过部分截断 |
| IMAP 超时 | 60 秒 | 连接和操作超时 |
| 安全连接 | 硬编码 true | IMAP 始终使用 SSL |

## 遗留同步（已废弃）

遗留系统使用 `lib/email.ts` 中的 `fetchEmails()` 函数：

- 基于 `EmailConfig`（单账户配置）
- 存储到 `Email` 模型（无线程支持）
- 通过 `GET /api/email/inbox` 触发
- 拉取数量限制为 20 封

> 新功能应使用当前同步系统 (`lib/email/service.ts`)。

## Body 解析

当前同步使用简单的 RFC 2822 body 提取：

```typescript
// lib/email/service.ts
const bodyText = source.split("\r\n\r\n").slice(1).join("\r\n\r\n")
```

**已知限制：**
- 不处理 MIME multipart 消息
- 不处理 base64 编码内容
- 不处理字符集声明（charset）
- 可能丢失 HTML 部分或附件信息

## 自动同步

当前系统 **不支持自动定时同步**，需要手动触发或通过外部调度工具调用 `/api/email/sync` 接口。

可以配合以下工具实现自动同步：
- 系统 Cron Job
- N8N 自动化工作流
- 外部定时任务脚本
