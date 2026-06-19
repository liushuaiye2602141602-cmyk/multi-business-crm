# 邮件系统架构 (Email Architecture)

## 系统概览

邮件系统分为两代架构：**当前系统**（EmailAccount/EmailMessage/EmailThread）和 **遗留系统**（EmailConfig/Email）。两套系统并存，新功能应使用当前系统。

## 当前系统模型

### EmailAccount（邮件账户）

```prisma
model EmailAccount {
  id           Int      @id @default(autoincrement())
  name         String                    // 显示名称
  provider     String   @default("CUSTOM")  // GMAIL / OUTLOOK / ALIYUN / NETEASE / CUSTOM
  emailAddress String                    // 邮箱地址
  imapHost     String?                   // IMAP 服务器
  imapPort     Int?                      // IMAP 端口
  smtpHost     String?                   // SMTP 服务器
  smtpPort     Int?                      // SMTP 端口
  smtpSecure   Boolean  @default(true)   // SMTP SSL/TLS
  username     String                    // 登录用户名
  password     String                    // 登录密码
  oauthToken   String?                   // OAuth Token（预留）
  isActive     Boolean  @default(true)
  lastSyncAt   DateTime?                 // 上次同步时间
  tenantId     Int?
  userId       Int?
}
```

### EmailMessage（邮件消息）

```prisma
model EmailMessage {
  id          Int      @id @default(autoincrement())
  accountId   Int                      // 所属账户
  threadId    Int?                     // 所属线程
  direction   String                   // in / out
  messageId   String?  @unique         // RFC 2822 Message-ID
  inReplyTo   String?                  // 回复的消息 ID
  fromAddr    String
  toAddr      String
  ccAddr      String?
  subject     String
  body        String
  bodyHtml    String?
  status      String   @default("received")  // received / sent / draft / failed
  receivedAt  DateTime?
  sentAt      DateTime?
  isRead      Boolean  @default(false)
  isStarred   Boolean  @default(false)
  leadId      Int?                     // 关联线索
  customerId  Int?                     // 关联客户
  contactId   Int?                     // 关联联系人
  quoteId     Int?                     // 关联报价
  orderId     Int?                     // 关联订单
  tenantId    Int?
}
```

### EmailThread（邮件线程）

```prisma
model EmailThread {
  id            Int      @id @default(autoincrement())
  accountId     Int
  subject       String
  lastMessageAt DateTime?
  messageCount  Int      @default(0)
  tenantId      Int?
}
```

### 模型关系

```
EmailAccount (1) ──→ (N) EmailThread
                           │
                           └──→ (N) EmailMessage
                                    │
                                    ├──→ Lead (optional)
                                    ├──→ Customer (optional)
                                    ├──→ Contact (optional)
                                    ├──→ Quote (optional)
                                    └──→ Order (optional)
```

## 遗留系统模型（已废弃）

### EmailConfig（废弃）

单账户配置模型，标注 `// DEPRECATED: Use EmailAccount instead`。

### Email（废弃）

平铺邮件模型，无线程支持，标注 `// DEPRECATED: Use EmailMessage instead`。

## 遗留系统文件

| 文件 | 说明 |
|------|------|
| `lib/email.ts` | 遗留邮件服务（发送/接收） |
| `app/api/email/config/route.ts` | 遗留配置 API |
| `app/api/email/send/route.ts` | 遗留发送 API |
| `app/api/email/emails/route.ts` | 遗留邮件列表 API |
| `app/api/email/inbox/route.ts` | 遗留收件箱 API |

## 当前系统文件

| 文件 | 说明 |
|------|------|
| `lib/email/service.ts` | 当前邮件服务（发送/接收/同步） |
| `app/api/email/accounts/route.ts` | 账户管理 API |
| `app/api/email/accounts/[id]/route.ts` | 单账户 CRUD API |
| `app/api/email/sync/route.ts` | IMAP 同步 API |
| `app/api/email/threads/route.ts` | 线程管理 API |

## 已知不一致

> 重要：遗留系统和当前系统之间存在以下不一致，需要在后续版本中统一。

1. **发送路径分歧** — Compose 页面使用遗留 `/api/email/send`，而非当前账户系统
2. **方向值不一致** — 遗留使用 `out/in`，统计页面查询 `OUTGOING/INCOMING`（永远不匹配）
3. **密码脱敏** — 遗留 config API 脱敏密码；当前 accounts API 返回明文密码
4. **IMAP SSL 硬编码** — 当前 sync 代码中 `secure: true` 为硬编码

## 技术依赖

| 库 | 用途 |
|---|------|
| `nodemailer` | SMTP 邮件发送 |
| `imapflow` | IMAP 邮件接收 |
