# 邮件中心

## 概述

邮件中心模块提供完整的邮件收发与管理功能，支持多邮箱账户集成。您可以绑定 Gmail、Outlook、阿里企业邮、网易企业邮或其他自定义 IMAP/SMTP 邮箱，实现邮件的统一管理。系统通过 IMAP 协议自动同步邮件，并支持通过 SMTP 发送邮件。邮件会自动关联到 CRM 中的客户、联系人、线索、报价和订单。

## 页面入口

| 页面 | 路由 | 说明 |
|------|------|------|
| 邮件中心 | `/email` | 邮件中心主页面 |
| 邮箱账户管理 | `/email/accounts` | 管理已绑定的邮箱账户 |
| 写邮件 | `/email/compose` | 撰写并发送新邮件 |
| 收件箱 | `/email/inbox` | 查看收到的邮件 |
| 邮件对话 | `/email/thread/[id]` | 查看邮件往来对话 |
| 邮件设置 | `/email/settings` | 邮件相关设置 |
| 邮件统计 | `/email/stats` | 查看邮件发送与接收统计 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/email/send` | 发送邮件 |
| GET | `/api/email/inbox` | 获取收件箱邮件 |
| POST | `/api/email/inbox` | 获取收件箱邮件（带筛选参数） |
| POST | `/api/email/sync` | 手动触发邮件同步 |
| GET | `/api/email/threads` | 获取邮件对话列表 |
| GET | `/api/email/threads/[id]` | 获取指定对话详情 |

## 邮箱账户（EmailAccount）

### 支持的邮箱提供商

| 值 | 说明 |
|------|------|
| GMAIL | Gmail 邮箱 |
| OUTLOOK | Outlook / Microsoft 365 |
| ALIYUN | 阿里企业邮 |
| NETEASE | 网易企业邮 |
| CUSTOM | 自定义 IMAP/SMTP 配置 |

### 账户字段

| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 账户显示名称 |
| provider | Enum | 邮箱提供商 |
| emailAddress | String | 邮箱地址 |
| imapHost | String | IMAP 服务器地址 |
| imapPort | Number | IMAP 端口号 |
| smtpHost | String | SMTP 服务器地址 |
| smtpPort | Number | SMTP 端口号 |
| smtpSecure | Boolean | SMTP 是否使用 SSL 加密 |
| username | String | 登录用户名 |
| password | String | 登录密码（加密存储） |
| oauthToken | String | OAuth 令牌（Gmail 等支持 OAuth 时使用） |
| isActive | Boolean | 账户是否启用 |
| lastSyncAt | DateTime | 最近一次同步时间 |

## 邮件消息（EmailMessage）

| 字段 | 类型 | 说明 |
|------|------|------|
| accountId | String | 所属邮箱账户 ID |
| threadId | String | 所属邮件对话 ID |
| direction | Enum | 邮件方向：`in`（收件）/ `out`（发件） |
| messageId | String | RFC 2822 标准唯一标识 |
| inReplyTo | String | 回复的邮件 messageId（用于构建对话） |
| fromAddr | String | 发件人地址 |
| toAddr | String | 收件人地址 |
| ccAddr | String | 抄送地址 |
| subject | String | 邮件主题 |
| body | String | 纯文本正文 |
| bodyHtml | String | HTML 格式正文 |
| status | Enum | 状态：`received`（已收）/ `sent`（已发）/ `draft`（草稿）/ `failed`（发送失败） |
| receivedAt | DateTime | 收件时间 |
| sentAt | DateTime | 发件时间 |
| isRead | Boolean | 是否已读 |
| isStarred | Boolean | 是否标星 |
| leadId | String | 关联的线索 ID |
| customerId | String | 关联的客户 ID |
| contactId | String | 关联的联系人 ID |
| quoteId | String | 关联的报价 ID |
| orderId | String | 关联的订单 ID |

## 邮件对话（EmailThread）

| 字段 | 类型 | 说明 |
|------|------|------|
| accountId | String | 所属邮箱账户 ID |
| subject | String | 对话主题 |
| lastMessageAt | DateTime | 最近一封邮件时间 |
| messageCount | Number | 对话中的邮件数量 |

## 核心功能

### 多账户管理

- 支持同时绑定多个不同提供商的邮箱账户。
- 每个账户独立配置 IMAP 和 SMTP 连接参数。
- 支持启用/禁用单个账户。
- 首次绑定时可手动触发同步，获取历史邮件。

### 邮件收发

- **接收邮件：** 通过 IMAP 协议（使用 imapflow 库）自动或手动同步邮件。
- **发送邮件：** 通过 SMTP 协议（使用 nodemailer 库）发送邮件，支持纯文本和 HTML 格式。
- **邮件对话：** 通过 inReplyTo 字段自动将相关邮件归组为对话，方便查看完整沟通历史。

### CRM 实体自动绑定

当收到或发送邮件时，系统会根据邮件地址自动查找并关联 CRM 实体，查找顺序为：

1. **联系人（Contact）** — 通过邮箱地址匹配联系人记录。
2. **客户（Customer）** — 通过联系人关联到对应的客户。
3. **线索（Lead）** — 通过客户关联到对应的线索。

关联成功后，邮件记录中会自动填充 leadId、customerId、contactId 等字段。

### 邮件搜索与筛选

- 按发件人/收件人地址搜索。
- 按邮件主题和正文内容搜索。
- 按时间范围、已读/未读、标星等状态筛选。
- 按邮箱账户筛选。

## 使用说明

### 绑定邮箱账户

1. 进入邮箱账户管理页面（`/email/accounts`）。
2. 点击「添加账户」。
3. 选择邮箱提供商，填写邮箱地址和授权信息。
4. 系统将自动检测并填充 IMAP/SMTP 服务器配置（主流提供商）。
5. 自定义提供商需手动填写服务器地址和端口。
6. 保存后点击「测试连接」验证配置是否正确。
7. 连接成功后可选择立即同步历史邮件。

### 发送邮件

1. 进入写邮件页面（`/email/compose`）。
2. 选择发送账户（如有多个邮箱）。
3. 填写收件人、抄送人、主题和正文。
4. 支持关联 CRM 实体（线索、客户、报价、订单）。
5. 点击「发送」。

### 查看邮件对话

1. 在收件箱中点击邮件，进入对话视图。
2. 对话按时间顺序展示所有往来邮件。
3. 可直接在对话中回复邮件。

## 邮件统计

邮件统计页面（`/email/stats`）展示以下数据：

- 各账户的发送/接收邮件数量。
- 按时间维度的邮件收发趋势。
- 关联到 CRM 实体的邮件占比。
- 常用联系对象统计。

## 技术说明

- 邮件发送使用 nodemailer 库。
- 邮件接收使用 imapflow 库进行 IMAP 同步。
- 密码字段加密存储，保障账户安全。
- 邮件同步支持增量同步，避免重复下载。
- 废弃的 EmailConfig 和 Email 模型已不再使用，请使用新的 EmailAccount、EmailMessage、EmailThread 模型。
