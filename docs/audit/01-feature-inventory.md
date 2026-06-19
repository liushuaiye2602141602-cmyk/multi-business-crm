# 01 - Feature Inventory

> 审计日期：2026-06-19 | 项目：multi-business-crm | 346 源文件

## 核心 CRM 模块

| # | 模块 | 页面路由 | API | Prisma 模型 | 侧边栏 | 完成度 |
|---|------|---------|-----|-------------|--------|--------|
| 1 | Dashboard | /dashboard | - | - | ✅ | 完整可用 |
| 2 | Leads | /leads, /leads/new, /leads/[id] | actions.ts | Lead | ✅ | 完整可用 |
| 3 | Customers | /customers, /customers/new, /customers/[id] | actions.ts | Customer | ✅ | 完整可用 |
| 4 | Customer Pool | /customers/pool | - | (ownerId) | ✅ | 完整可用 |
| 5 | Dormant Customers | /customers/dormant | - | - | ✅ | 完整可用 |
| 6 | Contacts | /contacts, /contacts/new, /contacts/[id] | actions.ts | Contact | ✅ | 完整可用 |
| 7 | Projects | /projects, /projects/new, /projects/[id] | actions.ts | Project | ✅ | 完整可用 |
| 8 | Follow-ups | /follow-ups, /follow-ups/new, /follow-ups/[id] | actions.ts | FollowUp | ✅ | 完整可用 |
| 9 | Tasks | /tasks, /tasks/new, /tasks/[id] | actions.ts | Task | ✅ | 完整可用 |
| 10 | Quotes | /quotes, /quotes/new, /quotes/[id] | actions.ts | Quote, QuoteItem | ✅ | 完整可用 |
| 11 | Orders | /orders, /orders/new, /orders/[id] | actions.ts | Order, OrderItem | ✅ | 完整可用 |
| 12 | Products | /products, /products/new, /products/[id] | actions.ts | Product | ✅ | 完整可用 |
| 13 | Business Lines | /business-lines | actions.ts | BusinessLine | ✅ | 完整可用 |
| 14 | Documents | /documents | actions.ts | Document | ✅ | 完整可用 |
| 15 | Templates | /templates | actions.ts | FollowUpTemplate | ✅ | 完整可用 |

## 财务模块

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 16 | Finance Overview | /finance | - | - | 完整可用 |
| 17 | Invoices | /finance/invoices/new, /finance/invoices/[id] | - | Invoice | 完整可用 |
| 18 | Payments | (via Invoice detail) | - | Payment | 基本可用 |
| 19 | Currency Converter | /currency | - | - | 完整可用 |

## 日程与目标

| # | 模块 | 页面路由 | Prisma 模型 | 完成度 |
|---|------|---------|-------------|--------|
| 20 | Calendar | /calendar | CalendarEvent | 完整可用 |
| 21 | Goals | /goals | SalesGoal | 完整可用 |

## 数据报表

| # | 模块 | 页面路由 | 完成度 |
|---|------|---------|--------|
| 22 | Reports | /reports | 完整可用 |

## 用户与认证

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 23 | Login | /login | /api/auth/login, /api/auth/logout, /api/auth/me | Tenant, User | 基本可用 |
| 24 | Settings | /settings | - | - | 基本可用 |
| 25 | Tenant/Multi-tenant | - | - | Tenant | 部分实现 |

## AI 系统

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 26 | AI Test | /ai-test | /api/ai/test | - | 完整可用 |
| 27 | AI Analyses | /ai-analyses | - | AIAnalysis | 完整可用 |
| 28 | AI Settings | /ai-settings | /api/ai/config | AIConfig | 完整可用 |
| 29 | AI Control Panel | /ai-control-panel | /api/ai-control/* | AIControlSettings, AIPolicyRule, AIExecutionLog | 完整可用 |
| 30 | AI Core Engine | - | - | AILog | 完整可用 |
| 31 | AI Agents | - | /api/ai/auto-action, /api/ai/sales-suggest, /api/ai/analyze-lead | - | 完整可用 |

## 邮件系统

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 32 | Email Center | /email | /api/email/emails | Email | 基本可用 |
| 33 | Email Compose | /email/compose | /api/email/send | - | 完整可用 |
| 34 | Email Settings | /email/settings | /api/email/config | EmailConfig | 完整可用 |
| 35 | Email Stats | /email/stats | - | - | 完整可用 |
| 36 | Email Accounts | /email/accounts | /api/email/accounts | EmailAccount | 完整可用 |
| 37 | Email Inbox | /email/inbox | /api/email/sync, /api/email/threads | EmailMessage, EmailThread | 完整可用 |
| 38 | Email Thread | /email/thread/[id] | /api/email/threads/[id] | - | 完整可用 |

## IM 集成

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 39 | IM Settings | /im-settings | - | IMPlatform | 基本可用 |
| 40 | IM Messages | /im-messages | - | IMMessage, IMUser | 基本可用 |

## 通信系统

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 41 | Communication Hub | - | /api/communication/* | Message | 基本可用 |

## 外部接入

| # | 模块 | 页面路由 | API | Prisma 模型 | 完成度 |
|---|------|---------|-----|-------------|--------|
| 42 | External Sources | /external-sources | - | ExternalSource | 完整可用 |
| 43 | Webhook Test | /webhook-test | /api/webhooks/leads | - | 完整可用 |
| 44 | Webhook Logs | /webhook-logs | - | WebhookLog | 完整可用 |
| 45 | Integration Guides | /integration-guides/* | - | - | 模拟数据 |

## 系统工具

| # | 模块 | 页面路由 | API | 完成度 |
|---|------|---------|-----|--------|
| 46 | Workbench | /workbench | - | 完整可用 |
| 47 | Search | /search | - | 完整可用 |
| 48 | Activity Logs | /activity-logs | - | 完整可用 |
| 49 | System Health | /system-health | - | 完整可用 |
| 50 | Maintenance Guide | /maintenance-guide | - | 模拟数据 |
| 51 | Imports | /imports | /api/import/* | 基本可用 |
| 52 | Exports | /exports | /api/export/* | 基本可用 |

## 已废弃模块

| # | 模块 | 说明 | 状态 |
|---|------|------|------|
| 53 | Email (Legacy) | 被 EmailAccount/EmailMessage 替代 | 已废弃但仍保留 |
| 54 | EmailConfig (Legacy) | 被 EmailAccount 替代 | 已废弃但仍保留 |
