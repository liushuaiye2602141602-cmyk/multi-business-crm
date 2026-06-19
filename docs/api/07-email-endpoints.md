# 邮件 API 端点

## GET /api/email/accounts

获取邮件账户列表。

**响应:**

```json
{
  "accounts": [
    {
      "id": 1,
      "name": "工作邮箱",
      "provider": "GMAIL",
      "emailAddress": "user@gmail.com",
      "isActive": true,
      "lastSyncAt": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```

**Provider 选项:** `GMAIL`, `OUTLOOK`, `ALIYUN`, `NETEASE`, `CUSTOM`

---

## POST /api/email/accounts

创建邮件账户。

**请求体:**

```json
{
  "name": "工作邮箱",
  "provider": "GMAIL",
  "emailAddress": "user@gmail.com",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": true,
  "username": "user@gmail.com",
  "password": "app-password"
}
```

**注意:** `password` 字段会加密存储。

---

## GET /api/email/accounts/[id]

获取单个邮件账户详情。

---

## PUT /api/email/accounts/[id]

更新邮件账户。

---

## DELETE /api/email/accounts/[id]

删除邮件账户。

---

## POST /api/email/send

发送邮件。

**请求体:**

```json
{
  "accountId": 1,
  "to": "recipient@example.com",
  "cc": "cc@example.com",
  "subject": "报价确认",
  "body": "纯文本内容",
  "bodyHtml": "<p>HTML 内容</p>",
  "leadId": 1,
  "customerId": 1,
  "contactId": 1,
  "quoteId": 1,
  "orderId": 1
}
```

**功能:**

- 通过 SMTP 发送（使用 nodemailer）
- 自动保存到 `EmailMessage`
- 自动创建或更新 `EmailThread`
- 可选关联 CRM 实体（`leadId`、`customerId`、`contactId`、`quoteId`、`orderId`）

---

## GET /api/email/inbox

获取收件箱。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `accountId` | number | 邮件账户 ID |
| `limit` | number | 获取数量（默认 50） |

---

## POST /api/email/inbox

从 IMAP 拉取邮件。

**请求体:**

```json
{
  "accountId": 1,
  "limit": 50
}
```

**功能:**

- 通过 imapflow 从 IMAP INBOX 拉取邮件
- 按 `messageId` 去重
- 自动绑定 CRM 实体：优先匹配 `Contact.email` → `Customer.email` → `Lead.email`
- 通过 `inReplyTo` 自动归入线程
- 更新 `lastSyncAt` 时间戳

---

## POST /api/email/sync

同步邮件（与 `POST /api/email/inbox` 功能相同，提供额外入口）。

---

## GET /api/email/threads

获取邮件线程列表。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `accountId` | number | 邮件账户 ID |
| `limit` | number | 返回数量 |

响应包含每条线程的首条消息预览。

---

## GET /api/email/threads/[id]

获取线程详情及所有消息。

**响应包含:**

- 线程元数据（`subject`、`messageCount`、`lastMessageAt`）
- 所有 `EmailMessage` 按时间排序
- 关联的 CRM 实体信息（`Lead`、`Customer`、`Contact`）

---

## GET /api/email/emails

获取邮件列表。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `accountId` | number | 邮件账户 ID |
| `direction` | string | `in` / `out` |
| `status` | string | `received` / `sent` / `draft` / `failed` |

---

## GET /api/email/config

获取旧版邮件配置（已弃用）。当前版本部分支持。

## PUT /api/email/config

更新旧版邮件配置（已弃用）。当前版本部分支持。
