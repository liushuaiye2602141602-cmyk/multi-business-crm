# 阿里云邮箱配置 (Alibaba Mail)

## 概述

阿里云企业邮箱（Aliyun Enterprise Mail）支持标准的 SMTP/IMAP 协议，可以直接在系统中配置。

## IMAP/SMTP 服务器设置

### 阿里云企业邮箱

| 类型 | 服务器 | 端口 | 加密 |
|------|--------|------|------|
| SMTP | smtp.qiye.aliyun.com | 465 | SSL/TLS |
| SMTP (备选) | smtp.qiye.aliyun.com | 25 | 无加密（不推荐） |
| IMAP | imap.qiye.aliyun.com | 993 | SSL/TLS |

### 阿里云个人邮箱（免费版）

| 类型 | 服务器 | 端口 | 加密 |
|------|--------|------|------|
| SMTP | smtp.aliyun.com | 465 | SSL/TLS |
| IMAP | imap.aliyun.com | 993 | SSL/TLS |

> 注意：个人邮箱和企业邮箱的服务器地址不同，请根据实际邮箱类型选择。

## 配置步骤

### 第 1 步：确认邮箱已开启 IMAP

1. 登录阿里云邮箱
2. 进入 **设置** → **邮箱设置** → **客户端设置**
3. 确认 **IMAP/SMTP 服务** 已开启
4. 如果未开启，点击开启并按照提示操作

### 第 2 步：获取安全授权码

> 阿里云邮箱不建议使用登录密码，推荐使用客户端授权码。

1. 在邮箱设置中找到 **客户端授权码** 或 **安全密码**
2. 生成新的授权码
3. 复制保存

### 第 3 步：在系统中配置

1. 导航到 `/email/accounts`
2. 选择 Provider：**阿里云邮箱**
3. 系统自动填充：
   - SMTP Host: `smtp.aliyun.com`
   - SMTP Port: `465`
   - IMAP Host: `imap.aliyun.com`
   - IMAP Port: `993`
4. 填写账户信息：
   - 名称：`您的显示名`
   - 邮箱地址：`your-name@aliyun.com`
   - 用户名：`your-name@aliyun.com`（不带 @ 后缀也可以）
   - 密码：粘贴客户端授权码
5. 保存

### 企业邮箱配置

如果是企业邮箱，需要手动修改服务器地址：

```
SMTP Host: smtp.qiye.aliyun.com
IMAP Host: imap.qiye.aliyun.com
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 认证失败 | 使用了登录密码 | 使用客户端授权码 |
| 连接超时 | 端口被封 | 尝试 465 端口（SSL） |
| 部分邮件无法读取 | IMAP 同步范围 | 检查邮箱 IMAP 设置中的文件夹权限 |

## 安全建议

- 使用客户端授权码而非登录密码
- 定期更换授权码
- 企业邮箱建议开启 IP 白名单
