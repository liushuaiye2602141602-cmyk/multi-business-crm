# 邮件故障排查 (Email Troubleshooting)

## 常见问题

### 1. IMAP 连接被拒绝 (Connection Refused)

**症状：** 同步时报错 "Connection refused" 或 "ECONNREFUSED"

**可能原因：**

| 原因 | 解决方案 |
|------|---------|
| IMAP 服务器地址错误 | 检查 `imapHost` 配置 |
| 端口错误 | 确认 IMAP 端口（通常 993） |
| 邮箱未开启 IMAP | 在邮箱设置中启用 IMAP 服务 |
| 防火墙封锁 | 确认 993 端口出站权限 |
| 服务器宕机 | 检查邮件提供商状态页 |

**排查步骤：**

```bash
# 测试 IMAP 端口连通性
telnet imap.gmail.com 993

# 或使用 openssl 测试 SSL 连接
openssl s_client -connect imap.gmail.com:993
```

### 2. 认证失败 (Authentication Failed)

**症状：** 同步时报错 "Authentication failed" 或 "Invalid credentials"

**可能原因：**

| 原因 | 解决方案 |
|------|---------|
| 密码错误 | 重新确认密码或授权码 |
| 使用了登录密码 | 改用客户端授权码（Gmail/阿里云/QQ） |
| IMAP 未开启 | 在邮箱设置中启用 IMAP |
| 账户被锁定 | 检查邮箱是否有安全锁定 |
| 两步验证 | Gmail 需要应用专用密码 |

**各 Provider 认证要点：**

- **Gmail：** 必须使用应用专用密码（App Password）
- **阿里云：** 使用客户端授权码
- **QQ 邮箱：** 使用客户端授权码
- **企业邮箱：** 通常使用邮箱密码或管理员分配的客户端密码

### 3. 同步超时 (Sync Timeout)

**症状：** 同步操作长时间无响应或超时

**可能原因：**

| 原因 | 解决方案 |
|------|---------|
| 邮件量过大 | 减少同步数量（修改 limit 参数） |
| 网络慢 | 检查网络连接 |
| 服务器负载高 | 避免高峰期同步 |
| 邮件体过大 | 大邮件解析耗时 |

**解决方案：**

```bash
# 减少同步数量
POST /api/email/sync
{ "accountId": 1, "limit": 20 }
```

### 4. SMTP 发送失败

**症状：** 发送邮件报错

**常见错误：**

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| "SMTP Error 550" | 收件人不存在 | 检查收件人地址 |
| "SMTP Error 553" | 发件人被拒绝 | 检查 FROM 地址配置 |
| "SMTP Error 421" | 连接频率限制 | 降低发送频率 |
| "SMTP Error authentication" | SMTP 未开启或密码错误 | 开启 SMTP 并使用授权码 |

### 5. 邮件内容乱码

**症状：** 同步的邮件正文显示乱码

**原因：** 当前 body 解析不处理字符集声明。

**当前限制：**
- 同步代码使用简单的 `\r\n\r\n` 分割提取 body
- 不处理 MIME multipart 结构
- 不处理 base64 编码
- 不处理字符集转换（如 GB2312/GBK）

### 6. 邮件线程不正确

**症状：** 回复邮件没有归入正确的线程

**可能原因：**
- `inReplyTo` 字段缺失或不匹配
- 原始邮件的 `messageId` 未被保存
- 跨账户的线程无法关联

### 7. 邮件未自动绑定 CRM 实体

**症状：** 同步的邮件没有关联到线索/客户

**排查步骤：**
1. 确认邮件地址在 CRM 中存在（Contact.email / Customer.email / Lead.email）
2. 检查 `fromAddr` 是否与 CRM 记录匹配
3. 自动绑定仅匹配发件人，收件人的绑定需手动操作

## 诊断工具

### 测试 IMAP 连接

```bash
# 使用 Node.js 脚本测试
node -e "
const { ImapFlow } = require('imapflow');
const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: { user: 'YOUR_EMAIL', pass: 'YOUR_PASSWORD' }
});
client.connect().then(() => {
  console.log('IMAP 连接成功');
  client.logout();
}).catch(err => console.error('连接失败:', err));
"
```

### 测试 SMTP 连接

```bash
# 使用 nodemailer 测试
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: 'YOUR_EMAIL', pass: 'YOUR_PASSWORD' }
});
transport.verify().then(() => {
  console.log('SMTP 连接成功');
}).catch(err => console.error('连接失败:', err));
"
```

## 查看同步状态

- **账户列表：** `/email/accounts` 显示每个账户的 `lastSyncAt`
- **消息计数：** GET `/api/email/accounts` 返回每个账户的消息数量
- **API 直查：** 查看 `EmailMessage` 表中对应 `accountId` 的记录
