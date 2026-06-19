# 邮件账户管理 (Email Account Management)

## 概述

系统支持管理多个邮件账户，通过 `/email/accounts` 页面进行配置。每个邮件账户关联 SMTP（发送）和 IMAP（接收）服务器。

## EmailAccount 模型

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

## Provider 预设

选择 Provider 后自动填充 SMTP/IMAP 配置：

| Provider | SMTP Host | SMTP Port | IMAP Host | IMAP Port | SSL |
|----------|-----------|-----------|-----------|-----------|-----|
| Gmail | smtp.gmail.com | 465 | imap.gmail.com | 993 | Yes |
| Outlook | smtp.office365.com | 587 | outlook.office365.com | 993 | No (STARTTLS) |
| 阿里云 | smtp.aliyun.com | 465 | imap.aliyun.com | 993 | Yes |
| 网易 163 | smtp.163.com | 465 | imap.163.com | 993 | Yes |
| 自定义 | (手动填写) | (手动填写) | (手动填写) | (手动填写) | (手动选择) |

## 添加邮件账户步骤

1. 导航到 `/email/accounts`
2. 点击 "添加账户" 按钮
3. 选择 Provider（如 Gmail），系统自动填充服务器配置
4. 填写以下必填字段：
   - **显示名称** — 发件人显示名
   - **邮箱地址** — 完整邮箱地址
   - **用户名** — 登录用户名（通常与邮箱地址相同）
   - **密码** — 邮箱密码或应用专用密码
5. 确认 SMTP/IMAP 配置正确
6. 保存账户

## 测试连接

保存账户后，可通过 API 测试 IMAP 连接：

```
POST /api/email/sync
Body: { "accountId": <账户ID> }
```

系统会尝试连接 IMAP 服务器并拉取最新邮件。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/email/accounts` | 列出所有账户（含消息计数） |
| POST | `/api/email/accounts` | 创建新账户 |
| GET | `/api/email/accounts/[id]` | 获取单个账户详情 |
| PUT | `/api/email/accounts/[id]` | 更新账户配置 |
| DELETE | `/api/email/accounts/[id]` | 删除账户 |

## 注意事项

- **密码存储：** 当前密码以明文存储在数据库中，生产环境应实现加密。参见 [Email 安全文档](./13-email-security.md)
- **API Key 泄露：** GET 端点返回完整账户信息（含密码），前端应处理脱敏显示
- **OAuth 支持：** 模型中有 `oauthToken` 字段但尚未实现 OAuth 流程
- **IMAP SSL：** 当前同步代码中 IMAP 连接硬编码 `secure: true`，忽略账户配置
