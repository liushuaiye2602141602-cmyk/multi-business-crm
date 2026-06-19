# 系统设置 (System Settings)

## 设置中心概览

系统设置中心位于 `/settings` 路由，提供 6 个配置模块的入口卡片：

| 卡片 | 路由 | 功能 |
|------|------|------|
| AI 配置 | `/ai-settings` | AI 模型和 API Key 配置 |
| IM 配置 | `/im-settings` | IM 平台（飞书/Telegram/微信）配置 |
| 邮件配置 | `/email/accounts` | 邮件账户管理 |
| 业务线管理 | `/business-lines` | 业务线创建与编辑 |
| 外部来源 | `/external-sources` | Webhook 来源和 API Key 管理 |
| 系统健康检查 | `/system-health` | 数据库状态和系统运行状况 |

## 各模块详细说明

### 1. AI 配置 (`/ai-settings`)

配置 AI 模型提供商和 API Key。详见 [AI 文档 - 模型配置](../ai/02-model-provider-configuration.md)。

- 设置 Provider（默认 OPENAI_COMPATIBLE）
- 配置 Base URL、API Key、Model 名称
- 可选配置 Vision Model（用于图片分析）
- 支持连接测试

### 2. IM 配置 (`/im-settings`)

管理即时通讯平台集成。详见 [Bot 文档 - 架构](../bots/01-bot-architecture.md)。

- 支持平台类型：`feishu`（飞书）、`telegram`、`wechat`（企业微信）
- 每个平台存储：`appId`、`appSecret`、`encryptKey`、`verifyToken`、`botToken`
- 显示每个平台的用户数和消息数统计

### 3. 邮件配置 (`/email/accounts`)

管理多个邮件账户。详见 [Email 文档 - 添加邮件账户](../email/02-add-email-account.md)。

- 支持 5 种 Provider 预设：Gmail、Outlook、阿里云、网易、自定义
- 每个账户配置 SMTP 和 IMAP 服务器
- 支持连接测试和同步

### 4. 业务线管理 (`/business-lines`)

创建和管理业务线。

| 字段 | 说明 |
|------|------|
| `name` | 业务线名称（唯一） |
| `code` | 业务线代码（唯一，如 FLEX、PACK、WOOD） |
| `description` | 业务描述 |
| `website` | 业务网站 |
| `mainProducts` | 主要产品描述 |

业务线关联到：线索、客户、项目、产品、订单、模板、外部来源。

### 5. 外部来源 (`/external-sources`)

管理 Webhook 数据来源。

| 字段 | 说明 |
|------|------|
| `name` | 来源名称 |
| `code` | 来源代码（唯一） |
| `sourceType` | 类型：WEBSITE_FORM / FACEBOOK_FORM / TIKTOK_MANUAL / N8N / AI_MARKETING_SYSTEM 等 |
| `defaultSource` | 默认线索来源 |
| `defaultLeadGrade` | 默认线索等级 |
| `autoAnalyze` | 是否自动 AI 分析 |

每个来源有独立的 API Key（`crm_sk_` 前缀），用于 Webhook 认证。

### 6. 系统健康检查 (`/system-health`)

系统运行状态仪表板，检查内容：

- **数据库状态** — 连接和基本查询测试
- **AI 配置** — 是否已配置有效的 AI 模型
- **Webhook 状态** — 外部来源配置和最近调用
- **数据量概览** — 各核心表的记录数
- **Prisma 表检查** — 所有模型表是否可达
- **逾期任务警告** — 超过截止日期的待处理任务

## 其他管理页面

| 路由 | 功能 |
|------|------|
| `/currency` | 货币配置（支持 USD/EUR/CNY） |
| `/templates` | 跟进模板管理 |
| `/goals` | 销售目标设置 |
| `/webhook-test` | Webhook 测试工具 |
| `/ai-test` | AI 连接测试 |
| `/maintenance-guide` | 系统维护指南 |
| `/integration-guides/*` | 集成配置指南（飞书、N8N 等） |
