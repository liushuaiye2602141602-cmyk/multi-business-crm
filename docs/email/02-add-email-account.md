# 添加邮件账户 (Add Email Account)

## 前提条件

- 已登录系统并拥有管理员或经理权限
- 知道邮箱账户的 SMTP/IMAP 配置信息
- 邮箱已开启 IMAP 访问（部分邮箱默认关闭）

## 操作步骤

### 第 1 步：进入邮件账户管理

1. 导航到左侧菜单 → **邮件** → **账户管理**
2. 或直接访问 `/email/accounts`

### 第 2 步：选择 Provider

点击 "添加账户" 后，从下拉框选择邮箱提供商：

| Provider | 说明 |
|----------|------|
| Custom | 自定义（手动填写所有配置） |
| Gmail | Google 邮箱 |
| Outlook / Microsoft 365 | 微软邮箱 |
| 阿里云邮箱 | Aliyun 企业邮箱 |
| 网易邮箱 | 163/126 邮箱 |

选择 Provider 后，SMTP 和 IMAP 服务器配置会自动填充。

### 第 3 步：填写账户信息

**必填字段：**

| 字段 | 说明 | 示例 |
|------|------|------|
| 名称 | 发件人显示名 | `张三` |
| 邮箱地址 | 完整邮箱地址 | `zhangsan@company.com` |
| 用户名 | 登录用户名 | `zhangsan@company.com` |
| 密码 | 邮箱密码或应用专用密码 | `YOUR_PASSWORD` |

**SMTP 配置（已由 Provider 预填）：**

| 字段 | 说明 |
|------|------|
| SMTP Host | SMTP 服务器地址 |
| SMTP Port | SMTP 端口号 |
| SSL/TLS | 是否使用加密连接 |

**IMAP 配置（已由 Provider 预填）：**

| 字段 | 说明 |
|------|------|
| IMAP Host | IMAP 服务器地址 |
| IMAP Port | IMAP 端口号 |

### 第 4 步：保存并测试

1. 确认所有信息正确
2. 点击保存
3. 系统创建 `EmailAccount` 记录
4. 可通过 "同步" 按钮测试 IMAP 连接

## 特殊 Provider 配置说明

### Gmail

- **需要应用专用密码：** Google 不允许使用普通密码登录 IMAP，需在 Google 账户设置中生成 App Password
- **IMAP 需手动开启：** 在 Gmail 设置 → 转发和 POP/IMAP 中启用 IMAP
- 详细配置参见 [Gmail 配置指南](./03-gmail-configuration.md)

### 阿里云企业邮箱

- 详细配置参见 [阿里云邮箱配置](./07-alibaba-mail.md)

### 腾讯企业邮箱

- 详细配置参见 [腾讯企业邮箱配置](./08-tencent-enterprise-mail.md)

## API 方式添加

```bash
POST /api/email/accounts
Content-Type: application/json

{
  "name": "销售邮箱",
  "provider": "GMAIL",
  "emailAddress": "sales@company.com",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 465,
  "smtpSecure": true,
  "username": "sales@company.com",
  "password": "YOUR_APP_PASSWORD"
}
```

## 注意事项

- **密码安全：** 当前密码以明文存储在数据库中，生产环境建议实施加密
- **账户删除：** 删除账户会级联删除关联的邮件消息和线程
- **多账户：** 系统支持同时配置多个邮件账户
- **Tenant 关联：** 账户可关联到特定租户和用户
