# 邮件问题

## SMTP 认证失败

### 症状

```
Error: Invalid login: 535 Authentication Failed
```

### 原因与解决

**用户名/密码错误**：

- 确认使用完整的邮箱地址作为用户名（如 `user@example.com`）
- 确认密码正确（部分服务商需要使用**应用专用密码**而非登录密码）

**应用专用密码**：

| 服务商 | 获取方式 |
|--------|----------|
| Gmail | Google 账号 → 安全性 → 两步验证 → 应用专用密码 |
| Outlook | account.microsoft.com → 安全 → 应用密码 |
| 阿里云邮箱 | 管理后台 → 客户端密码 |
| 网易邮箱 | 设置 → POP3/SMTP/IMAP → 客户端授权密码 |

**SMTP 服务器配置**：

| 服务商 | SMTP 服务器 | 端口 | SSL |
|--------|------------|------|-----|
| Gmail | smtp.gmail.com | 587 | STARTTLS |
| Outlook | smtp.office365.com | 587 | STARTTLS |
| 阿里云 | smtp.qiye.aliyun.com | 465 | SSL |
| 网易 | smtp.ym.163.com | 994 | SSL |

**防火墙/网络**：

```bash
# 测试 SMTP 连接
telnet smtp.gmail.com 587

# 或使用 openssl 测试 SSL
openssl s_client -connect smtp.gmail.com:587 -starttls smtp
```

## IMAP 连接超时

### 症状

```
Error: Connection timeout
Error: TLS upgrade failed
```

### 解决

**IMAP 服务器配置**：

| 服务商 | IMAP 服务器 | 端口 | SSL |
|--------|------------|------|-----|
| Gmail | imap.gmail.com | 993 | SSL |
| Outlook | outlook.office365.com | 993 | SSL |
| 阿里云 | imap.qiye.aliyun.com | 993 | SSL |
| 网易 | imap.qiye.163.com | 993 | SSL |

**网络问题**：

```bash
# 测试 IMAP 连接
telnet imap.gmail.com 993

# 检查 DNS 解析
nslookup imap.gmail.com
```

**超时设置**：

项目使用 `imapflow` 库，连接超时默认 30 秒。如果网络较慢，可能需要检查防火墙设置。

## 邮件同步问题

### 同步不到邮件

1. 确认 IMAP 已在邮箱服务商端启用
2. 确认使用的是**应用专用密码**（非登录密码）
3. 检查 API 调用：`POST /api/email/sync` 的响应
4. 查看数据库中 `EmailMessage` 表是否有新记录

### 同步重复邮件

系统通过 `messageId` 字段去重。如果仍然重复：

```bash
# 检查是否有重复的 messageId
SELECT "messageId", COUNT(*)
FROM "EmailMessage"
GROUP BY "messageId"
HAVING COUNT(*) > 1;
```

### 邮件线程混乱

邮件线程通过 `inReplyTo` 字段关联。如果线程显示不正确：

1. 检查邮件的 `In-Reply-To` 和 `References` 头
2. 确认 `EmailThread` 表中的 `messageCount` 是否正确
3. 尝试重新同步：`POST /api/email/sync`

## 发送邮件失败

### 通过 API 发送

```
POST /api/email/send
Body: { "to": "...", "subject": "...", "body": "...", "accountId": "..." }
```

常见错误：

- **未配置 SMTP 账户**：先创建 EmailAccount
- **账户未启用**：确认 EmailAccount 的 IMAP/SMTP 配置正确
- **发送频率限制**：部分服务商限制每小时发送数量

### 通过 AI Agent 发送

AI 的邮件草稿功能需要先配置 `AIControlSettings`：
- `emailAgentEnabled: true`
- `executionMode` 设置为 APPROVAL 或 AUTO

## 邮件密码安全

**重要提醒**：当前 EmailAccount 的密码以明文存储在数据库中。

生产环境建议：
1. 使用 OAuth2 认证（Gmail、Outlook 支持）
2. 对密码字段进行加密存储
3. 限制数据库访问权限
