# 数据库模型

Prisma Schema 位于 `prisma/schema.prisma`，共 1187 行，定义了 34 个 Model 和 26 个 Enum。

## 模型分类

### 租户与用户

| Model | 说明 | tenantId |
|-------|------|----------|
| Tenant | 租户（plan: FREE/PRO/ENTERPRISE） | N/A（自身） |
| User | 用户（role: ADMIN/MANAGER/SALES） | 有 |

### 业务核心

| Model | 说明 | tenantId | 关联 |
|-------|------|----------|------|
| BusinessLine | 业务线（name/code 唯一） | 无 | → Lead, Customer, Project, Product, Order, Template, ExternalSource |
| Lead | 线索（完整跟踪字段） | 有 | → Customer, Owner |
| LeadActivity | 线索活动记录 | 无（通过 Lead 间接） | → Lead |
| Customer | 客户（扩展自 Lead 信息） | 有（通过 Owner） | → Contact, Activity |
| Contact | 客户联系人 | 无（通过 Customer 间接） | → Customer |
| CustomerActivity | 客户活动记录 | 无（通过 Customer 间接） | → Customer |
| Project | 项目 | 无 | → BusinessLine, Customer, Lead |
| FollowUp | 跟进记录 | 无 | → Lead, Customer, Project |

### 销售文档

| Model | 说明 | tenantId | 关联 |
|-------|------|----------|------|
| Quote | 报价单（quoteNo 唯一） | 有 | → Lead, Customer, Project, Tenant |
| QuoteItem | 报价项 | 无（通过 Quote 间接） | → Quote, Product |
| Order | 订单（orderNo 唯一） | 有 | → Customer, Project, Quote, Contact, BusinessLine, Tenant |
| OrderItem | 订单项 | 无（通过 Order 间接） | → Order, Product |

### 财务

| Model | 说明 | tenantId |
|-------|------|----------|
| Invoice | 发票（invoiceNo 唯一） | 无 |
| Payment | 付款记录 | 无 |

### 任务与活动

| Model | 说明 | tenantId |
|-------|------|----------|
| Task | 任务（type: 多种类型） | 有 |
| FollowUp | 跟进记录 | 无 |
| CalendarEvent | 日历事件 | 无 |
| SalesGoal | 销售目标 | 无 |
| ActivityLog | 活动日志 | 无 |

### 产品与模板

| Model | 说明 |
|-------|------|
| Product | 产品（英文关键词、规格、目标市场） |
| FollowUpTemplate | 跟进模板（scene + language） |
| Document | 文档（relatedType: CUSTOMER/PROJECT/QUOTE/ORDER） |

### 外部接入

| Model | 说明 |
|-------|------|
| ExternalSource | 外部来源（apiKeyHash、autoAnalyze） |
| WebhookLog | Webhook 日志 |

### 邮件系统

| Model | 说明 | 状态 |
|-------|------|------|
| EmailConfig | SMTP 配置 | DEPRECATED |
| Email | 邮件记录 | DEPRECATED |
| EmailAccount | 邮件账户（多供应商） | 当前使用 |
| EmailMessage | 邮件消息（含线程） | 当前使用 |
| EmailThread | 邮件线程 | 当前使用 |

### AI 系统

| Model | 说明 |
|-------|------|
| AIConfig | AI 配置（provider、apiKey、model） |
| AIAnalysis | AI 分析结果（详细字段） |
| AILog | AI 操作日志 |
| AIControlSettings | AI 控制设置（执行模式、工作时间） |
| AIPolicyRule | 策略规则（HARD/SOFT） |
| AIExecutionLog | AI 执行日志 |

### IM / 统一消息

| Model | 说明 |
|-------|------|
| IMPlatform | IM 平台配置 |
| IMUser | IM 用户映射 |
| IMMessage | IM 消息记录 |
| Message | 统一消息（跨渠道） |

## 关键关系图

```
Tenant ─┬─→ User
        ├─→ Lead ────→ LeadActivity
        │    │
        │    ├──→ Customer ──→ Contact
        │    │         │
        │    │         └──→ CustomerActivity
        │    │
        │    └──→ Project ──→ FollowUp
        │
        ├─→ Quote ──→ QuoteItem ──→ Product
        │    │
        │    └──→ Order ──→ OrderItem ──→ Product
        │
        └─→ Task

BusinessLine ─┬─→ Lead
              ├─→ Customer
              ├─→ Project
              ├─→ Product
              ├─→ Order
              ├─→ FollowUpTemplate
              └─→ ExternalSource → WebhookLog
```

## tenantId 覆盖情况

**已有 tenantId 的模型**：Tenant, User, Lead, Customer, Quote, Order, Task, AIControlSettings, AIPolicyRule, AIExecutionLog

**缺少 tenantId 的模型**（潜在改进点）：
- BusinessLine（全局唯一，当前非多租户隔离）
- Contact, Project, FollowUp, QuoteItem, OrderItem（通过父级间接关联）
- Invoice, Payment
- CalendarEvent, SalesGoal
- ActivityLog
- EmailAccount, EmailMessage, EmailThread
- IMPlatform, IMUser, IMMessage
- Message

## Enum 类型

系统定义了 26 个 Enum：

| Enum | 可选值 |
|------|--------|
| LeadSource | MULTIPLE 系列 |
| LeadStatus | NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST, UNINTERESTED |
| LeadTemperature | HOT, WARM, COLD |
| LeadGrade | A, B, C, D |
| CustomerType | ENTERPRISE, INDIVIDUAL |
| CustomerStatus | ACTIVE, INACTIVE, DORMANT, LOST |
| CustomerLifecycleStage | PROSPECT, LEAD, OPPORTUNITY, CUSTOMER, VIP |
| ProjectStatus | MULTIPLE |
| FollowUpMethod | CALL, EMAIL, WHATSAPP, WECHAT, VISIT, NOTE, OTHER |
| TaskType | FOLLOW_UP, DEMO, MEETING, REVIEW, OTHER |
| TaskStatus | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| TaskPriority | URGENT, HIGH, MEDIUM, LOW |
| QuoteStatus | DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED |
| Currency | USD, EUR, CNY |
| OrderStatus | PENDING, CONFIRMED, PRODUCING, SHIPPED, DELIVERED, COMPLETED, CANCELLED |
| InvoiceStatus | UNPAID, PARTIAL, PAID, OVERDUE, CANCELLED |
| TemplateScene | INQUIRY, FOLLOW_UP, THANK_YOU, PROPOSAL, OTHER |
| TemplateLanguage | CHINESE, ENGLISH, SPANISH, OTHER |
| AIAnalysisTargetType | LEAD, CUSTOMER, PROJECT |
| ExternalSourceType | WEBHOOK, API, FEISHU, OTHER |
| WebhookStatus | ACTIVE, INACTIVE |
| DocumentType | CONTRACT, INVOICE, CERTIFICATE, OTHER |
| DocumentRelatedType | CUSTOMER, PROJECT, QUOTE, ORDER |
| PaymentMethod | BANK_TRANSFER, CASH, CREDIT_CARD, PAYPAL, OTHER |

## 迁移方式

- 使用 `npx prisma migrate dev --name <描述>` 创建开发迁移
- 使用 `npx prisma migrate deploy` 在生产环境应用
- 修改 Schema 后需运行 `npx prisma generate` 重新生成客户端
- 生成输出路径：`../lib/generated/prisma`（相对 prisma 目录）
