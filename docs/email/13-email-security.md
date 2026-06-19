# 邮件安全 (Email Security)

## 密码存储

### 当前状态

> **已知安全风险：** 邮件账户密码当前以 **明文** 存储在数据库中。

```prisma
model EmailAccount {
  password  String  // 当前为明文存储
  oauthToken String? // OAuth 字段预留但未实现
}
```

Schema 中有注释 `// Will be encrypted in production`，但加密功能 **尚未实现**。

### 安全建议

生产环境应采取以下措施之一：

1. **AES 加密存储** — 使用 AES-256 加密密码后存储，解密后用于 IMAP/SMTP 连接
2. **环境变量存储** — 敏感密码存储在环境变量中，不写入数据库
3. **OAuth 认证** — 使用 OAuth 2.0 替代密码认证（推荐）

### 密码脱敏

| API 端点 | 脱敏行为 |
|---------|---------|
| `GET /api/email/config` (遗留) | 密码替换为 `***` |
| `GET /api/email/accounts` | **未脱敏**，返回明文密码 |
| `GET /api/email/accounts/[id]` | **未脱敏**，返回明文密码 |

> 建议在 GET 路由中对密码字段进行脱敏处理。

## OAuth 认证（推荐）

### 优势

- 不存储用户密码
- 可随时撤销访问权限
- 符合现代安全标准
- 支持细粒度权限控制

### 当前状态

`EmailAccount` 模型中有 `oauthToken` 字段预留，但 OAuth 流程 **尚未实现**。

### 支持 OAuth 的提供商

| 提供商 | OAuth 支持 |
|--------|-----------|
| Gmail / Google Workspace | 是（推荐） |
| Microsoft 365 / Outlook | 是（推荐） |
| 阿里云企业邮箱 | 部分支持 |
| 腾讯企业邮箱 | 不支持 |

## TLS/SSL 加密

### SMTP

| 端口 | 加密方式 | 说明 |
|------|---------|------|
| 465 | SSL/TLS | 直接 SSL 加密连接（推荐） |
| 587 | STARTTLS | 明文连接后升级为加密 |
| 25 | 无 | 明文传输（不推荐） |

系统中 `smtpSecure` 字段控制 SMTP 加密：
- 默认值：`true`
- UI 中提供 SSL/TLS 复选框

### IMAP

| 端口 | 加密方式 | 说明 |
|------|---------|------|
| 993 | SSL/TLS | 直接 SSL 加密连接（推荐） |
| 143 | STARTTLS | 明文连接后升级为加密 |

**已知问题：** 当前同步代码中 IMAP 连接硬编码 `secure: true`，忽略账户的配置值。

```typescript
// lib/email/service.ts
secure: true  // 硬编码，忽略 account 配置
```

## 网络安全

### 防火墙配置

确保以下端口可用：

| 端口 | 方向 | 用途 |
|------|------|------|
| 465 | 出站 | SMTP SSL 发送 |
| 587 | 出站 | SMTP STARTTLS 发送 |
| 993 | 入站/出站 | IMAP SSL 接收 |

### API 访问控制

邮件管理 API 当前无额外的访问控制：
- 任何已登录用户可以查看所有邮件账户
- 建议添加角色校验（仅 ADMIN/MANAGER 可管理邮件账户）

## 安全检查清单

- [ ] 生产环境对邮件密码实施加密存储
- [ ] API 返回时对密码字段脱敏
- [ ] 确保所有 SMTP/IMAP 连接使用 SSL/TLS
- [ ] 考虑为 Gmail/Outlook 启用 OAuth
- [ ] 限制邮件管理 API 的访问权限
- [ ] 定期轮换邮件客户端授权码
- [ ] 在邮件提供商侧配置 IP 白名单（如支持）
