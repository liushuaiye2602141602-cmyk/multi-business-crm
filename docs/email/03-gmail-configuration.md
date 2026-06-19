# Gmail 配置 (Gmail Configuration)

## 概述

Gmail 需要特殊的配置步骤：必须启用 IMAP 访问，并使用应用专用密码（App Password）而非普通密码。

## IMAP/SMTP 服务器设置

| 类型 | 服务器 | 端口 | 加密 |
|------|--------|------|------|
| SMTP | smtp.gmail.com | 465 | SSL/TLS |
| SMTP (备选) | smtp.gmail.com | 587 | STARTTLS |
| IMAP | imap.gmail.com | 993 | SSL/TLS |

## 配置步骤

### 第 1 步：启用 IMAP 访问

1. 登录 Gmail 网页版
2. 点击右上角齿轮 → 查看所有设置
3. 转到 **转发和 POP/IMAP** 标签
4. 在 IMAP 访问部分，选择 **启用 IMAP**
5. 保存更改

### 第 2 步：生成应用专用密码

> Gmail 不允许第三方应用使用普通密码登录 IMAP，必须使用应用专用密码。

1. 前往 https://myaccount.google.com/security
2. 确保已开启 **两步验证**（2-Step Verification）
3. 搜索 **"应用专用密码"**（App passwords）
4. 选择应用类型（可选 "邮件" 或 "其他"，输入 "CRM"）
5. 点击 **生成**
6. 复制生成的 16 位密码（格式：`xxxx xxxx xxxx xxxx`）

### 第 3 步：在系统中配置

1. 导航到 `/email/accounts`
2. 点击 "添加账户"
3. 选择 Provider：**Gmail**
4. 系统自动填充：
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `465`
   - IMAP Host: `imap.gmail.com`
   - IMAP Port: `993`
5. 填写：
   - 名称：`您的显示名`
   - 邮箱地址：`your-email@gmail.com`
   - 用户名：`your-email@gmail.com`
   - 密码：粘贴第 2 步生成的应用专用密码
6. 保存

### 第 4 步：测试连接

保存后，通过同步功能验证 IMAP 连接是否正常。

## OAuth 说明

Gmail 支持 OAuth 2.0 认证，安全性更高。系统模型中有 `oauthToken` 字段预留，但当前 **OAuth 流程尚未实现**。

OAuth 的优势：
- 不需要存储用户密码
- 可以随时撤销访问权限
- 符合 Google 安全策略

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| IMAP 连接失败 | IMAP 未启用 | 检查 Gmail 设置中的 IMAP 开关 |
| 认证失败 | 使用普通密码 | 必须使用应用专用密码 |
| 频繁断连 | Google 安全策略 | 可能需要重新授权 |
| 部分邮件缺失 | IMAP 同步范围限制 | 调整 Gmail 中的 IMAP 同步设置 |

## 安全建议

- 定期轮换应用专用密码
- 不要将应用专用密码提交到版本控制
- 在不使用时撤销应用专用密码
- 考虑使用 Google Workspace 的 Service Account 方案
