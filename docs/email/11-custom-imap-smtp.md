# 自定义 IMAP/SMTP 配置 (Custom IMAP/SMTP)

## 概述

当邮件提供商不在预设列表中时，选择 "Custom" 模式手动配置 SMTP 和 IMAP 服务器。

## 需要的信息

配置自定义邮件账户需要以下信息：

### SMTP（发送）配置

| 字段 | 说明 | 获取方式 |
|------|------|---------|
| SMTP Host | SMTP 服务器地址 | 邮件提供商文档 |
| SMTP Port | SMTP 端口号 | 常见: 465 (SSL), 587 (STARTTLS), 25 (明文) |
| SSL/TLS | 是否使用加密连接 | 通常 465=SSL, 587=STARTTLS |

### IMAP（接收）配置

| 字段 | 说明 | 获取方式 |
|------|------|---------|
| IMAP Host | IMAP 服务器地址 | 邮件提供商文档 |
| IMAP Port | IMAP 端口号 | 常见: 993 (SSL), 143 (STARTTLS) |

### 认证信息

| 字段 | 说明 |
|------|------|
| 用户名 | 登录用户名（通常是完整邮箱地址） |
| 密码 | 登录密码或客户端授权码 |

## 常见邮件提供商手动配置参考

### 企业自建邮件服务器

```
SMTP: mail.yourdomain.com, 端口 465 或 587
IMAP: mail.yourdomain.com, 端口 993
```

### Zoho Mail

```
SMTP: smtp.zoho.com, 端口 465
IMAP: imap.zoho.com, 端口 993
```

### Yahoo Mail

```
SMTP: smtp.mail.yahoo.com, 端口 465
IMAP: imap.mail.yahoo.com, 端口 993
```

### iCloud Mail

```
SMTP: smtp.mail.me.com, 端口 587
IMAP: imap.mail.me.com, 端口 993
```

## 配置步骤

1. 导航到 `/email/accounts`
2. 选择 Provider：**自定义 (Custom)**
3. 手动填写所有 SMTP/IMAP 字段
4. 填写认证信息
5. 保存
6. 通过同步功能测试连接

## 排查提示

如果不确定服务器配置：

1. 查阅邮件提供商的官方文档
2. 搜索 "[提供商名] IMAP SMTP settings"
3. 联系邮件管理员获取服务器信息

## 端口选择指南

| 端口 | 协议 | 加密方式 | 推荐 |
|------|------|---------|------|
| 465 | SMTP | SSL/TLS | 推荐 |
| 587 | SMTP | STARTTLS | 推荐 |
| 25 | SMTP | 无加密 | 不推荐（可能被封） |
| 993 | IMAP | SSL/TLS | 推荐 |
| 143 | IMAP | STARTTLS | 可用 |

## 安全建议

- 优先使用 SSL/TLS 加密连接（端口 465）
- 避免使用端口 25（无加密，ISP 可能封锁）
- 使用客户端授权码而非登录密码（如提供商支持）
