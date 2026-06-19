# 腾讯企业邮箱配置 (Tencent Enterprise Mail)

## 概述

腾讯企业邮箱（Tencent Exmail）支持标准的 SMTP/IMAP 协议。本系统未内置腾讯企业邮箱的 Provider 预设，需要手动填写服务器配置。

## IMAP/SMTP 服务器设置

| 类型 | 服务器 | 端口 | 加密 |
|------|--------|------|------|
| SMTP | smtp.exmail.qq.com | 465 | SSL/TLS |
| IMAP | imap.exmail.qq.com | 993 | SSL/TLS |

### 腾讯个人邮箱（QQ 邮箱）

| 类型 | 服务器 | 端口 | 加密 |
|------|--------|------|------|
| SMTP | smtp.qq.com | 465 | SSL/TLS |
| IMAP | imap.qq.com | 993 | SSL/TLS |

> 注意：QQ 邮箱和企业邮箱服务器地址不同。系统 Provider 预设中未包含腾讯邮箱，需选择 "Custom" 手动配置。

## 配置步骤

### 第 1 步：获取客户端授权码

> 腾讯邮箱需要使用客户端专用密码（授权码），不能使用 QQ 密码或微信密码。

**企业邮箱：**
1. 登录腾讯企业邮箱
2. 进入 **设置** → **客户端设置**
3. 开启 **IMAP/SMTP/POP3** 服务
4. 生成客户端授权码

**QQ 邮箱：**
1. 登录 QQ 邮箱网页版
2. 进入 **设置** → **账户**
3. 在 "POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务" 部分
4. 开启 **IMAP/SMTP 服务**
5. 按提示发送短信验证
6. 生成授权码（16 位字母）

### 第 2 步：在系统中配置

1. 导航到 `/email/accounts`
2. 选择 Provider：**自定义 (Custom)**
3. 手动填写配置：

**企业邮箱：**

| 字段 | 值 |
|------|-----|
| 名称 | 您的显示名 |
| 邮箱地址 | your-name@company.com |
| SMTP Host | smtp.exmail.qq.com |
| SMTP Port | 465 |
| SMTP SSL | 勾选 |
| IMAP Host | imap.exmail.qq.com |
| IMAP Port | 993 |
| 用户名 | your-name@company.com |
| 密码 | 客户端授权码 |

**QQ 邮箱：**

| 字段 | 值 |
|------|-----|
| 名称 | 您的显示名 |
| 邮箱地址 | your-qqnumber@qq.com |
| SMTP Host | smtp.qq.com |
| SMTP Port | 465 |
| SMTP SSL | 勾选 |
| IMAP Host | imap.qq.com |
| IMAP Port | 993 |
| 用户名 | your-qqnumber@qq.com |
| 密码 | 客户端授权码 |

4. 保存

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 认证失败 | 使用了 QQ 密码 | 必须使用客户端授权码 |
| IMAP 连接失败 | 服务未开启 | 在邮箱设置中开启 IMAP |
| 发送失败 | SMTP 未开启 | 在邮箱设置中开启 SMTP |
| 邮件同步不全 | 授权码过期 | 重新生成授权码 |

## 安全建议

- 使用客户端授权码而非登录密码
- 定期更换授权码
- 企业邮箱建议在管理后台限制客户端登录 IP
