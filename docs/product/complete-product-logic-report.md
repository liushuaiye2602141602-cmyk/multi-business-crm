# Multi-Business CRM 完整产品逻辑报告

> 版本: v0.1.0 Initial Public Preview  
> 生成日期: 2026-06-19  
> 文档类型: 产品逻辑规格说明书 (READ-ONLY)

---

## 目录

1. [产品定位](#1-产品定位)
2. [技术架构](#2-技术架构)
3. [导航与页面](#3-导航与页面)
4. [数据库模型](#4-数据库模型)
5. [LocalContext 逻辑](#5-localcontext-逻辑)
6. [线索模块逻辑](#6-线索模块逻辑)
7. [客户模块逻辑](#7-客户模块逻辑)
8. [联系人模块逻辑](#8-联系人模块逻辑)
9. [自定义字段逻辑](#9-自定义字段逻辑)
10. [客户客群逻辑](#10-客户客群逻辑)
11. [任务/跟进逻辑](#11-任务跟进逻辑)
12. [报价模块逻辑](#12-报价模块逻辑)
13. [订单模块逻辑](#13-订单模块逻辑)
14. [发票逻辑](#14-发票逻辑)
15. [付款逻辑](#15-付款逻辑)
16. [产品/业务线逻辑](#16-产品业务线逻辑)
17. [商机项目逻辑](#17-商机项目逻辑)
18. [邮件模块逻辑](#18-邮件模块逻辑)
19. [AI 模块逻辑](#19-ai-模块逻辑)
20. [Event Bus 逻辑](#20-event-bus-逻辑)
21. [ActivityLog 逻辑](#21-activitylog-逻辑)
22. [列表字段设置与视图](#22-列表字段设置与视图)
23. [归档/恢复/删除策略](#23-归档恢复删除策略)
24. [备份与存储](#24-备份与存储)
25. [校验与错误处理](#25-校验与错误处理)
26. [业务流程概览](#26-业务流程概览)
27. [业务规则清单](#27-业务规则清单)
28. [手动测试点](#28-手动测试点)
29. [功能实现状态矩阵](#29-功能实现状态矩阵)
30. [已知限制](#30-已知限制)

---

## 1. 产品定位

### 1.1 产品概述

**Multi-Business CRM** 是一款面向 B2B 外贸/出口业务的多业务线客户关系管理系统。

- **品牌名**: Open CRM System / Multi Business CRM
- **版本**: v0.1.0 Initial Public Preview
- **许可证**: MIT
- **定位**: 单用户、本地优先(localhost)的 CRM 系统模板
- **目标用户**: 个人外贸从业者、小型外贸团队
- **核心场景**: 多业务线外贸 B2B 客户管理、线索跟踪、报价-订单-发票全流程

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| 单用户优先 | 无需登录认证，本地运行，localhost only |
| 多业务线 | 支持按业务线隔离客户、线索、项目、产品、模板 |
| 数据安全 | PostgreSQL 本地存储，支持手动备份/恢复 |
| AI 增强 | 内置 AI 分析引擎，支持 OpenAI 兼容模型 |
| 外贸专精 | 预置外贸行业术语、多币种、国际贸易条款 |

### 1.3 版本规划

| 版本 | 定位 |
|------|------|
| v0.1.0 | Initial Public Preview - 当前版本 |
| v1.0 | 多用户支持、完整认证、权限体系 |
| v2.0 | 团队协作、SaaS 化 |

---

## 2. 技术架构

### 2.1 技术栈

| 层次 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.2.7 |
| UI | React | 19.2.4 |
| 样式 | Tailwind CSS | 4.x |
| 图表 | Recharts | 3.8.1 |
| ORM | Prisma | 7.8.0 |
| 数据库 | PostgreSQL | 16 (Docker) |
| 校验 | Zod | 4.4.3 |
| 图标 | Lucide React | 1.17.0 |
| 邮件发送 | Nodemailer | 9.0.1 |
| 邮件接收 | ImapFlow | 1.4.1 |
| IM 集成 | @larksuiteoapi/node-sdk | 1.67.0 |
| 运行时 | Node.js | 18 (Alpine Docker) |

### 2.2 架构模式

```
用户浏览器
    |
    v
Next.js 16 App Router (Port 3003)
    |
    +-- Server Components (直接查库)
    +-- Server Actions (revalidatePath 触发刷新)
    +-- API Routes (REST endpoints)
    |
    v
Prisma 7 ORM (PrismaPg adapter)
    |
    v
PostgreSQL 16 (Docker, Port 5433)
```

**核心架构特征:**

1. **Server-First**: 页面组件直接查询 Prisma，无 API 中间层
2. **数据库即 Store**: 无 Redux/Zustand/React Context，Prisma 是唯一数据源
3. **Server Actions**: 所有写操作通过 `"use server"` 函数完成，完成后调用 `revalidatePath` 刷新缓存
4. **URL 即状态**: 搜索/筛选/排序/分页状态存储在 URL searchParams 中
5. **Event Bus**: 服务端事件总线，通过数据库 ActivityLog 记录事件并触发自动化

### 2.3 认证模型

- **文件**: `lib/auth.ts`, `lib/local-context.ts`, `middleware.ts`
- **模式**: 硬编码单用户，无会话管理
- `getCurrentUser()` 始终返回 `{ id: 1, name: "Local User" }`
- `middleware.ts` 为透传，不拦截任何路由
- `LOCAL_WORKSPACE_ID = 1`, `LOCAL_USER_ID = 1`
- Schema 中存在 User/Tenant 模型，为未来多用户预留

### 2.4 项目结构

```
multi-business-crm/
  app/                    # Next.js App Router 页面 + API
    (dashboard)/          # 所有仪表盘页面 (路由组)
    api/                  # REST API 端点
  components/             # React 组件 (43 + 8 UI primitives)
    ui/                   # 基础 UI 组件
  lib/                    # 服务端库
    ai/                   # AI 核心引擎
    communication/        # 统一通讯
    customer-list/        # 客户列表字段注册
    customer-segments/    # 客户客群
    domain/               # 领域逻辑
    email/                # 邮件服务
    events/               # Event Bus
    im/                   # IM 集成
    order-list/           # 订单列表字段注册
    orders/               # 订单计算
    validations/          # Zod 校验
  prisma/                 # 数据库 Schema + 种子数据
  scripts/                # 工具脚本
  docs/                   # 文档
```

---

## 3. 导航与页面

### 3.1 布局架构

**根布局** (`app/layout.tsx`):
- HTML lang="zh-CN"，标题 "多业务线 CRM"

**仪表盘布局** (`app/(dashboard)/layout.tsx`):
- 三栏布局: Sidebar (固定 260px) + Header (粘性顶部) + RightPanel (320px, xl 断点显示)
- 服务端预取: 销售目标、任务统计、项目状态、邮件统计

**看板专用布局** (`app/(dashboard)/dashboard/layout.tsx`):
- 简化布局: 仅 Sidebar + main，无 Header/RightPanel

### 3.2 导航菜单结构

#### 工作台

| 路由 | 标签 | 说明 |
|------|------|------|
| `/workbench` | 今日工作台 | 每日工作台: 待办任务、今日线索、待反馈报价、活跃项目、AI 分析 |
| `/dashboard` | 数据看板 | KPI 卡片、转化漏斗、收入统计、AI 洞察 |
| `/calendar` | 日程管理 | 周/月/列表视图日历 |
| `/goals` | 目标追踪 | 月度销售目标追踪 |
| `/reports` | 数据报表 | 6 类 Recharts 图表 |
| `/search` | 全局搜索 | 跨所有实体全文搜索 |

#### 客户增长

| 路由 | 标签 | 说明 |
|------|------|------|
| `/leads` | 线索池 | 线索管理 (状态流转、评分、Webhook 导入) |
| `/customers` | 客户库 | 客户 360 度视图、列表配置、CSV 导入导出 |
| `/customers/pool` | 客户公海 | 客户领取/释放 |
| `/contacts` | 联系人 | 联系人管理、社交档案 |
| `/projects` | 商机项目 | 项目管理、管道视图 (Kanban) |
| `/follow-ups` | 跟进记录 | 跟进记录管理 |
| `/customers/dormant` | 沉睡客户 | 60 天未跟进客户检测 |
| `/customers/segments` | 客户客群 | 7 种预设客群 |
| `/tasks` | 今日任务 | 任务管理 (优先级、到期日、逾期追踪) |

#### 业务管理

| 路由 | 标签 | 说明 |
|------|------|------|
| `/quotes` | 报价记录 | 报价管理 (明细行、状态锁定) |
| `/orders` | 订单管理 | 订单管理 (报价转订单、视图配置) |
| `/finance` | 财务管理 | 发票/付款/财务概览 |
| `/products` | 产品目录 | 产品管理 |
| `/documents` | 文档资料 | 文档管理 (多态关联) |
| `/templates` | 跟进模板 | 跟进模板管理 (含 AI 生成) |
| `/business-lines` | 业务线管理 | 业务线 CRUD |
| `/currency` | 汇率计算器 | 40+ 币种汇率转换 |

#### AI 助手

| 路由 | 标签 | 说明 |
|------|------|------|
| `/ai-test` | AI 测试 | AI 功能测试界面 |
| `/ai-analyses` | AI 分析记录 | 历史分析记录查看 |
| `/ai-settings` | AI 设置 | 模型配置 (OpenAI/DeepSeek 等) |
| `/ai-control-panel` | AI 控制面板 | AI 开关、模式、策略规则 |

#### 外部接入

| 路由 | 标签 | 说明 |
|------|------|------|
| `/im-settings` | IM 设置 | IM 平台配置 (飞书机器人) |
| `/im-messages` | IM 消息记录 | IM 消息历史 |
| `/email` | 邮件中心 | 多账号邮件管理 |
| `/email/accounts` | 邮箱账号 | SMTP/IMAP 账号管理 |
| `/email/inbox` | 收件箱 | 收件箱视图 |
| `/email/stats` | 邮件统计 | 邮件统计分析 |
| `/external-sources` | 外部来源 | 外部来源管理 |
| `/webhook-test` | Webhook 测试 | Webhook 调试工具 |
| `/webhook-logs` | Webhook 日志 | Webhook 事件日志 |
| `/integration-guides` | 接入指南 | n8n/网站表单/飞书/Docker 等 |

#### 系统工具

| 路由 | 标签 | 说明 |
|------|------|------|
| `/imports` | 数据导入 | CSV 导入 (线索/客户/产品) |
| `/exports` | 数据导出 | CSV 导出 (多种实体) |
| `/settings` | 系统设置 | 设置中心 (链接子模块) |
| `/system-health` | 系统健康检查 | DB/AI/邮件/Webhook 状态检查 |
| `/maintenance-guide` | 维护指南 | 静态维护文档 |
| `/activity-logs` | 操作日志 | 审计日志列表 |

### 3.3 页面统计

| 类别 | 数量 |
|------|------|
| 总 page.tsx 文件 | ~70 |
| 动态路由页 ([id]) | ~30 |
| 总页面组件 | ~100+ |
| 可复用组件 | 43 + 8 UI primitives |
| Server Actions 文件 | 每个模块一个 actions.ts |
| API 端点 | 47 个 |

---

## 4. 数据库模型

### 4.1 概览

- **Schema 文件**: `prisma/schema.prisma` (36KB)
- **模型总数**: 40+ 个
- **枚举总数**: 30+ 个
- **迁移**: `20260619_baseline`

### 4.2 核心业务模型

#### Tenant (租户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id, autoincrement | |
| name | String | 默认 "Local Workspace" |
| plan | String | FREE/PRO/ENTERPRISE |
| isActive | Boolean | 默认 true |
| createdAt/updatedAt | DateTime | |

#### User (用户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id, autoincrement | |
| name | String | |
| email | String @unique | |
| password | String | |
| role | String | ADMIN/MANAGER/SALES |
| tenantId | Int? | FK Tenant |
| isActive | Boolean | |

#### BusinessLine (业务线)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id, autoincrement | |
| name | String @unique | |
| code | String? @unique | |
| description | String? | |
| website | String? | |
| mainProducts | String? | |
| 关系 | has many | Lead, Customer, Project, Product, Order, FollowUpTemplate, ExternalSource |

#### Lead (线索)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| company | String (required) | |
| contactName | String (required) | |
| country/phone/email/whatsapp | String? | 联系方式 |
| source | LeadSource | 默认 MANUAL_OUTREACH |
| sourceWebsite | String? | |
| status | LeadStatus | 默认 NEW |
| temperature | LeadTemperature | 默认 WARM |
| grade | LeadGrade | 默认 C |
| requirement | String? | |
| interestProducts | String? | |
| inquiryContent | String? | |
| budget | Decimal?(12,2) | |
| currency | Currency | 默认 USD |
| expectedClosing | DateTime? | |
| nextFollowUp | DateTime? | |
| remark | String? | |
| businessLineId | Int (required) | FK BusinessLine |
| convertedCustomerId | Int? | FK Customer |
| ownerId/ownerName | Int?/String? | |
| tenantId | Int? | FK Tenant |
| aiScore | Int? | |
| aiSummary | String? | |
| aiTags | String[] | |
| 关系 | has many | FollowUp, Quote, Task, Project, Email, EmailMessage, LeadActivity, Message |

#### Customer (客户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| company | String (required) | |
| contactName | String (required) | |
| country/phone/email/whatsapp/website/address/industry | String? | 基本信息 |
| customerType | CustomerType | 默认 UNKNOWN |
| customerStatus | CustomerStatus | 默认 POTENTIAL |
| lifecycleStage | CustomerLifecycleStage | 默认 POTENTIAL |
| leadGrade | LeadGrade | 默认 C |
| source/sourceWebsite | LeadSource?/String? | |
| shortName/region/city/postalCode/companySize | String? | 扩展地址 |
| rating | Int? | 1-5 星级 |
| tags | String[] | |
| stage | String | 默认 "NEW" (UI 层面) |
| purchaseIntent | String | 默认 "UNKNOWN" |
| dealProbability | Int? | |
| expectedDealValue | Decimal?(12,2) | |
| expectedCloseDate | DateTime? | |
| lastContactAt/nextFollowUpAt | DateTime? | |
| lostReason | String? | |
| isArchived | Boolean | 默认 false |
| archivedAt | DateTime? | |
| customCode | String? | |
| ownerId/ownerName | Int?/String? | |
| poolEnteredAt/poolReason | DateTime?/String? | 公海字段 |
| aiScore/aiIntentLevel/lastAiActionAt | Int?/String?/DateTime? | AI 字段 |
| businessLineId | Int (required) | |
| 关系 | has many | Contact, Project, FollowUp, Quote, Task, Order, Invoice, Email, EmailMessage, CustomerActivity, Message |

#### Contact (联系人)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| customerId | Int (required) | FK Customer |
| name | String (required) | |
| position | String? | |
| email/whatsapp/phone/wechat/linkedin | String? | |
| isPrimary | Boolean | 默认 false |
| notes | String? | |
| firstName/lastName/nickname | String? | 扩展姓名字段 |
| jobTitle/department | String? | 扩展职位字段 |
| secondaryEmail/mobile | String? | |
| phoneCountryCode | String? | |
| preferredContactMethod/preferredLanguage/timezone | String? | 偏好字段 |
| 关系 | has many | Order, Quote, Email, EmailMessage, Message, ContactSocialProfile |

#### ContactSocialProfile (联系人社交档案)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| contactId | Int | FK Contact, onDelete Cascade |
| platform | String | |
| account | String | |
| profileUrl | String? | |
| isPrimary | Boolean | 默认 false |

#### Project (商机项目)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| name | String (required) | |
| description | String? | |
| status | ProjectStatus | 默认 REQUIREMENT_CONFIRMING |
| productCategory/productName/specs/quantity | String? | 产品信息 |
| usage/targetMarket/specialRequirements | String? | |
| amount | Decimal?(12,2) | |
| currency | Currency | 默认 USD |
| startDate/endDate | DateTime? | |
| businessLineId | Int (required) | |
| customerId | Int (required) | |
| leadId | Int? | |
| 关系 | has many | FollowUp, Quote, Task, Order |

#### Quote (报价)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| quoteNo | String @unique | 格式: Q-YYYYMMDD-NNNN |
| quoteTitle | String? | |
| productName/specs/quantity | String? | |
| unitPrice/totalPrice | Decimal?(12,2) | |
| exchangeRate | Decimal?(12,6) | |
| discountAmount | Decimal(12,2) | 默认 0 |
| currency | Currency | 默认 USD |
| paymentTerms/deliveryTime/validDays | String?/String?/Int? | |
| deliveryTerm/shippingTerm | String? | |
| validUntil | DateTime? | |
| content/remarks/terms | String? | |
| status | QuoteStatus | 默认 DRAFT |
| leadId/customerId/projectId/customerContactId | Int? | 关联实体 |
| 关系 | has many | QuoteItem, Order, Task, EmailMessage, Message |

#### QuoteItem (报价明细行)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| quoteId | Int (required) | FK Quote |
| productId | Int? | FK Product |
| itemName | String (required) | |
| specification | String? | |
| quantity/unit | Decimal?/String? | |
| unitPrice/totalPrice | Decimal?(12,2) | |
| notes | String? | |
| sortOrder | Int | 默认 0 |

#### Order (订单)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| orderNo | String @unique | 格式: O-YYYYMMDD-NNNN |
| orderTitle | String? | |
| customerId | Int (required) | |
| projectId/quoteId/contactId/businessLineId | Int? | |
| orderStatus | OrderStatus | 默认 DRAFT |
| totalAmount | Decimal?(12,2) | |
| exchangeRate | Decimal?(12,6) | |
| currency | Currency | 默认 USD |
| paymentTerm/deliveryTerm | String? | |
| expectedDeliveryDate | DateTime? | |
| subtotal/discountAmount/taxAmount/chargeAmount | Decimal? | 财务明细字段 |
| paidAmount/outstandingAmount | Decimal? | |
| costAmount/grossProfitAmount/grossProfitRate | Decimal? | |
| priceTerm/paymentMethod/shippingAddress | String? | |
| actualDeliveryDate | DateTime? | |
| isArchived/archivedAt | Boolean/DateTime? | |
| notes | String? | |
| 关系 | has many | OrderItem, OrderCharge, Invoice, Task, EmailMessage, Message |

#### OrderItem (订单明细行)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| orderId | Int (required) | |
| productId | Int? | |
| itemName | String (required) | |
| specification/productCode | String? | |
| quantity/unit/unitPrice/totalPrice | Decimal? | |
| discountType/discountValue/discountAmount | String?/Decimal? | |
| taxRate/taxAmount | Decimal? | |
| costPrice | Decimal? | |
| notes | String? | |
| sortOrder | Int | 默认 0 |

#### OrderCharge (订单附加费用)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| orderId | Int (required), onDelete Cascade | |
| type | String | 默认 "OTHER" |
| name | String (required) | |
| description | String? | |
| amount | Decimal(12,2) (required) | |
| taxable | Boolean | 默认 false |
| taxRate/taxAmount | Decimal? | |
| sortOrder | Int | 默认 0 |

#### FollowUp (跟进记录)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| method | FollowUpMethod | 默认 EMAIL |
| content | String (required) | |
| customerFeedback | String? | |
| nextAction | String? | |
| followUpDate | DateTime | 默认 now() |
| nextFollowUpDate | DateTime? | |
| remark | String? | |
| leadId/customerId/projectId | Int? | |

#### Task (任务)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| title | String (required) | |
| description | String? | |
| type | TaskType | 默认 FOLLOW_UP |
| status | TaskStatus | 默认 PENDING |
| priority | TaskPriority | 默认 MEDIUM |
| dueDate | DateTime? | |
| completedAt | DateTime? | |
| leadId/customerId/projectId/quoteId/orderId | Int? | |
| ownerId/ownerName | Int?/String? | |

#### Product (产品)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| name | String (required) | |
| category | String? | |
| englishKeywords/commonSpecs/application/targetMarket | String? | |
| notes | String? | |
| isActive | Boolean | 默认 true |
| businessLineId | Int (required) | |

#### FollowUpTemplate (跟进模板)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| title | String (required) | |
| scene | TemplateScene (required) | |
| subject | String? | |
| content | String (required) | |
| language | TemplateLanguage | 默认 EN |
| isActive | Boolean | 默认 true |
| notes | String? | |
| businessLineId | Int? | |

#### Document (文档)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| title | String (required) | |
| documentType | DocumentType (required) | |
| fileUrl/fileName | String? | |
| notes | String? | |
| relatedType | DocumentRelatedType (required) | CUSTOMER/PROJECT/QUOTE/ORDER |
| relatedId | Int | 多态关联 |

#### Invoice (发票)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| invoiceNo | String @unique | 格式: INV-NNNNNN |
| orderId | Int? | |
| customerId | Int (required) | |
| amount | Decimal(12,2) (required) | |
| currency | Currency | 默认 USD |
| status | InvoiceStatus | 默认 DRAFT |
| issuedAt/dueDate/paidAt | DateTime? | |
| notes | String? | |
| 关系 | has many | Payment |

#### Payment (付款)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| invoiceId | Int (required) | FK Invoice |
| amount | Decimal(12,2) (required) | |
| method | PaymentMethod | 默认 TT |
| receivedAt | DateTime | 默认 now() |
| notes | String? | |

### 4.3 邮件模型

| 模型 | 说明 | 状态 |
|------|------|------|
| EmailConfig | 旧版邮箱配置 | 已废弃 |
| Email | 旧版邮件记录 | 已废弃 |
| EmailAccount | 多账号邮箱配置 (GMAIL/OUTLOOK/ALIYUN/NETEASE/CUSTOM) | 使用中 |
| EmailMessage | 邮件消息 (支持线程、CRM 绑定) | 使用中 |
| EmailThread | 邮件线程 | 使用中 |

### 4.4 AI 模型

| 模型 | 说明 |
|------|------|
| AIAnalysis | AI 分析结果 ( targetType: LEAD/CUSTOMER/PROJECT/FOLLOW_UP/TEMPLATE ) |
| AIConfig | AI 模型配置 (provider/baseUrl/apiKey/model/vision*) |
| AIControlSettings | AI 控制设置 (开关、模块开关、执行模式、工作时间、速率限制) |
| AIPolicyRule | AI 策略规则 (HARD/SOFT, block_send/limit_rate 等) |
| AIExecutionLog | AI 执行日志 (actionType/entity/allowed/reason) |
| AILog | AI 日志 |

### 4.5 IM/消息模型

| 模型 | 说明 |
|------|------|
| IMPlatform | IM 平台配置 (飞书) |
| IMUser | IM 用户映射 |
| IMMessage | IM 消息记录 |
| Message | 统一消息 (email/whatsapp/webchat/manual) |
| ExternalSource | 外部来源 (WEBSITE_FORM/FACEBOOK_FORM/N8N 等) |
| WebhookLog | Webhook 日志 |

### 4.6 其他模型

| 模型 | 说明 |
|------|------|
| ActivityLog | 操作审计日志 |
| CalendarEvent | 日历事件 (task/meeting/holiday/reminder) |
| SalesGoal | 销售目标 (年/月/指标类型) |
| CustomerListView | 客户列表视图配置 |
| OrderListView | 订单列表视图配置 |
| PresetSegmentPreference | 预设客群偏好 |
| LeadActivity | 线索活动记录 |
| CustomerActivity | 客户活动记录 |
| CustomFieldDefinition | 自定义字段定义 |
| CustomFieldValue | 自定义字段值 |

### 4.7 枚举定义

#### Lead 枚举
| 枚举 | 值 |
|------|-----|
| LeadSource | MANUAL_OUTREACH, WEBSITE, FACEBOOK, TIKTOK, WHATSAPP, EMAIL, REFERRAL, EXHIBITION, OTHER |
| LeadStatus | NEW, CONTACTED, REQUIREMENT_CONFIRMING, QUOTING, NEGOTIATING, QUALIFIED, CONVERTED, WON, LOST, DORMANT |
| LeadTemperature | HOT, WARM, COLD |
| LeadGrade | A, B, C, D |

#### Customer 枚举
| 枚举 | 值 |
|------|-----|
| CustomerType | IMPORTER, DISTRIBUTOR, MANUFACTURER, TRADER, BRAND_OWNER, RETAILER, UNKNOWN |
| CustomerStatus | ACTIVE, POTENTIAL, INACTIVE, WON, LOST, BLACKLIST |
| CustomerLifecycleStage | POTENTIAL, INTENT, FIRST_DEAL, REPEAT_DEAL, VIP |

#### 业务枚举
| 枚举 | 值 |
|------|-----|
| ProjectStatus | REQUIREMENT_CONFIRMING, QUOTING, SAMPLE_TESTING, WAITING_FEEDBACK, NEGOTIATING, WON, LOST, PAUSED |
| FollowUpMethod | EMAIL, WHATSAPP, PHONE, MEETING, VIDEO_CALL, OTHER |
| TaskType | FOLLOW_UP, CALL, MEETING, QUOTE, SAMPLE, OTHER |
| TaskStatus | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| TaskPriority | LOW, MEDIUM, HIGH, URGENT |
| QuoteStatus | DRAFT, SENT, WAITING_FEEDBACK, REVISED, ACCEPTED, REJECTED, EXPIRED |
| OrderStatus | DRAFT, CONFIRMED, PRODUCTION, READY_TO_SHIP, SHIPPED, COMPLETED, CANCELLED |
| InvoiceStatus | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| PaymentMethod | TT, LC, PAYPAL, WESTERN_UNION, CASH, OTHER |
| Currency | USD, EUR, CNY |
| DocumentType | QUOTE, CONTRACT, ARTWORK, SAMPLE_PHOTO, PRODUCT_SPEC, PACKING_REQUIREMENT, OTHER |
| DocumentRelatedType | CUSTOMER, PROJECT, QUOTE, ORDER |
| TemplateScene | FIRST_REPLY, QUOTE_CONFIRMATION, QUOTE_FOLLOW_UP, SAMPLE_FOLLOW_UP, NO_REPLY_FOLLOW_UP, PRICE_NEGOTIATION, ORDER_CONFIRMATION, AFTER_SALES, OTHER |
| TemplateLanguage | EN, CN, BOTH |
| AIAnalysisTargetType | LEAD, CUSTOMER, PROJECT, FOLLOW_UP, TEMPLATE |
| ExternalSourceType | WEBSITE_FORM, FACEBOOK_FORM, TIKTOK_MANUAL, N8N, AI_MARKETING_SYSTEM, WHATSAPP_MANUAL, OTHER |
| WebhookStatus | SUCCESS, FAILED, UNAUTHORIZED, DUPLICATE, VALIDATION_ERROR |

---

## 5. LocalContext 逻辑

### 5.1 文件位置

`lib/local-context.ts`

### 5.2 核心逻辑

LocalContext **不是** React Context，而是一个服务端工具模块，提供硬编码的单用户身份常量。

```typescript
const LOCAL_WORKSPACE_ID = 1;
const LOCAL_USER_ID = 1;
```

### 5.3 导出函数

| 函数 | 说明 |
|------|------|
| `ensureLocalContext()` | 幂等初始化。若 Tenant(id=1) 不存在则创建 "Local Workspace"；若 User(id=1) 不存在则创建 "Local User" |
| `getLocalWorkspaceId()` | 返回常量 1 |
| `getLocalUserId()` | 返回常量 1 |

### 5.4 使用模式

```typescript
import { getLocalWorkspaceId, getLocalUserId } from "@/lib/local-context";
// 在 Server Action 或领域逻辑中
data: { ...formData, tenantId: getLocalWorkspaceId(), ownerId: getLocalUserId() }
```

### 5.5 认证模块

`lib/auth.ts`:

```typescript
export function getCurrentUser(): AuthUser {
  return { id: 1, name: "Local User", email: "local@localhost", role: "ADMIN", tenantId: null };
}
export function requireAuth(): AuthUser {
  return getCurrentUser();
}
```

中间件 `middleware.ts` 为透传，不做任何路由拦截。

---

## 6. 线索模块逻辑

### 6.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/leads/page.tsx` | 列表页 (服务端组件) |
| `app/(dashboard)/leads/actions.ts` | Server Actions |
| `app/(dashboard)/leads/new/page.tsx` | 新建页 |
| `app/(dashboard)/leads/[id]/page.tsx` | 详情页 |
| `app/(dashboard)/leads/[id]/edit/page.tsx` | 编辑页 |
| `components/LeadForm.tsx` | 表单组件 |
| `app/api/webhooks/leads/route.ts` | Webhook 导入 API |

### 6.2 Server Actions

| Action | 说明 | 校验 |
|--------|------|------|
| `createLead(formData)` | 创建线索 | 必填: company, contactName; 自动设置 tenantId, businessLineId; 记录 ActivityLog; 触发 `lead.created` 事件 |
| `updateLead(id, formData)` | 更新线索 | 活动日志记录 |
| `deleteLead(id)` | 删除线索 | 引用完整性检查: 若有 followUps/quotes/tasks/projects 关联则阻止 |
| `convertLeadToCustomer(id)` | 线索转客户 | **事务操作**: 1) 查找线索 2) 检查未转换 3) 创建 Customer 4) 创建主联系人 5) 更新线索状态为 CONVERTED + 设置 convertedCustomerId 6) 记录活动 |
| `updateLeadStatus(id, status)` | 更新线索状态 | 校验 10 种合法状态 |
| `addLeadActivity(leadId, type, content)` | 添加线索活动 | type: call/email/whatsapp/note |
| `updateLeadOwner(id, ownerName)` | 分配线索负责人 | |

### 6.3 线索状态流转

```
NEW -> CONTACTED -> REQUIREMENT_CONFIRMING -> QUOTING -> NEGOTIATING -> QUALIFIED -> CONVERTED (转客户)
                                                                              -> WON (直接成交)
                                                                              -> LOST (丢失)
                                                                              -> DORMANT (休眠)
```

### 6.4 AI 评分

在 `lib/ai/crm-analyzer.ts` 中实现规则评分:
- 联系方式完整度 (email/phone/whatsapp 各 15 分)
- 需求详细度 (requirement 20 分, inquiryContent 10 分)
- 跟进历史 (FollowUp 数量)
- 报价历史 (Quote 数量)
- 预算/预期成交额

结果保存到 `aiScore`, `aiSummary`, `aiTags` 字段。

### 6.5 Webhook 导入

`POST /api/webhooks/leads`:
1. 验证 API Key (通过 ExternalSource 表)
2. 按 email 去重
3. 自动 AI 分析
4. 记录 WebhookLog (含 IP, UserAgent)

---

## 7. 客户模块逻辑

### 7.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/customers/page.tsx` | 列表页 (带分页 10/20/50) |
| `app/(dashboard)/customers/actions.ts` | Server Actions |
| `app/(dashboard)/customers/new/page.tsx` | 新建页 |
| `app/(dashboard)/customers/[id]/page.tsx` | 详情页 (360 度视图) |
| `app/(dashboard)/customers/[id]/edit/page.tsx` | 编辑页 |
| `app/(dashboard)/customers/pool/page.tsx` | 公海页 |
| `app/(dashboard)/customers/dormant/page.tsx` | 沉睡客户页 |
| `app/(dashboard)/customers/segments/` | 客群页 |
| `app/(dashboard)/customers/views/actions.ts` | 视图 Server Actions |
| `components/CustomerForm.tsx` | 表单组件 |
| `components/CustomerListClient.tsx` | 客户列表客户端组件 (列配置) |
| `components/CustomerTimeline.tsx` | 客户时间线组件 |

### 7.2 Server Actions

| Action | 说明 |
|--------|------|
| `createCustomer(formData)` | 创建客户。必填: company, contactName |
| `updateCustomer(id, formData)` | 更新客户 |
| `deleteCustomer(id)` | 删除客户 (引用完整性检查) |
| `claimCustomer(id)` | 领取客户 (从公海，设置 ownerId, 清除公海日期) |
| `returnToPool(id, reason)` | 退回公海 (记录退回原因) |
| `autoReturnInactiveCustomers(days)` | 批量自动退回 (N 天无跟进) |
| `archiveCustomer(id)` | 归档客户 (soft archive + archivedAt) |
| `restoreCustomer(id)` | 恢复归档客户 |
| `addCustomerActivity(customerId, type, content)` | 添加客户活动 |
| `setPrimaryContact(customerId, contactId)` | 设置主联系人 (重置所有然后设置一个) |
| `addContactSocialProfile(contactId, platform, account, url)` | 添加社交档案 |
| `deleteContactSocialProfile(id)` | 删除社交档案 |

### 7.3 公海管理

**领取** (`claimCustomer`):
1. 查找客户 (必须处于公海状态)
2. 设置 ownerId = 当前用户
3. 清除 poolEnteredAt 和 poolReason
4. 记录活动日志

**退回** (`returnToPool`):
1. 设置 poolEnteredAt = now()
2. 设置 poolReason
3. 清除 ownerId
4. 记录活动日志

**自动退回** (`autoReturnInactiveCustomers`):
1. 查询最近 N 天无 FollowUp 的客户
2. 批量退回公海

### 7.4 沉睡客户检测

`getDormantCustomers()`:
- 查找 60+ 天无跟进的客户
- 按不活跃时长排序

### 7.5 客户详情 360 度视图

客户详情页聚合展示:
- 基本信息 (公司/联系方式/地址)
- AI 评分与分析
- 关联联系人列表
- 跟进记录时间线
- 关联报价列表
- 关联订单列表
- 关联项目列表
- 关联发票列表
- 活动日志

---

## 8. 联系人模块逻辑

### 8.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/contacts/actions.ts` | Server Actions |
| `app/(dashboard)/contacts/page.tsx` | 列表页 |
| `app/(dashboard)/contacts/new/page.tsx` | 新建页 |
| `app/(dashboard)/contacts/[id]/page.tsx` | 详情页 |
| `app/(dashboard)/contacts/[id]/edit/page.tsx` | 编辑页 |
| `components/ContactForm.tsx` | 表单组件 |

### 8.2 CRUD 逻辑

- **创建/更新/删除**: 标准 CRUD 操作
- **必填字段**: name, customerId
- **表单字段**: name, position, email, whatsapp, phone, wechat, linkedin, isPrimary, notes
- **Schema 扩展字段** (已存在于 Prisma Schema，但表单 UI 尚未完全覆盖): firstName, lastName, nickname, jobTitle, department, secondaryEmail, mobile, phoneCountryCode, preferredContactMethod, preferredLanguage, timezone

### 8.3 社交档案

通过客户模块的 `addContactSocialProfile` / `deleteContactSocialProfile` 管理。

---

## 9. 自定义字段逻辑

### 9.1 数据模型

**CustomFieldDefinition**:
- tenantId (Int?) -- 租户隔离
- entityType (String) -- "CUSTOMER" 或 "CONTACT"
- key (String) -- 匹配 `^[a-z_]+$`，与 tenantId+entityType 唯一
- label (String) -- 显示名
- fieldType (String) -- TEXT/TEXTAREA/NUMBER/CURRENCY/DATE/DATETIME/SELECT/MULTI_SELECT/CHECKBOX/URL/EMAIL/PHONE
- description/placeholder (String?)
- isRequired (Boolean) -- 默认 false
- isActive (Boolean) -- 默认 true (软删除)
- sortOrder (Int) -- 默认 0
- options (Json?) -- SELECT/MULTI_SELECT 的选项
- defaultValue (String?)

**CustomFieldValue**:
- fieldDefinitionId (Int) -- FK
- entityType (String)
- entityId (Int) -- 与 fieldDefinitionId+entityType 唯一
- value (String?) -- 所有值以字符串存储

### 9.2 Server Actions (在 customers/actions.ts 中)

| Action | 说明 |
|--------|------|
| `getCustomFieldDefinitions(entityType)` | 获取字段定义列表 |
| `createCustomFieldDefinition(data)` | 创建字段定义 (Zod 校验 key 格式) |
| `updateCustomFieldDefinition(id, data)` | 更新字段定义 |
| `deleteCustomFieldDefinition(id)` | 软删除 (isActive = false) |
| `setCustomFieldValue(fieldDefinitionId, entityType, entityId, value)` | Upsert 字段值 |
| `getCustomFieldValues(entityType, entityId)` | 获取字段值列表 |

### 9.3 实际使用状态

- **已实现**: TEXT 类型的完整 CRUD
- **Schema 支持但未完全实现 UI**: 其他 fieldType (NUMBER, DATE, SELECT 等)
- **动态列集成**: `lib/customer-list/field-registry.ts` 提供 `getCustomFieldColumns()` 动态生成 `custom:<id>` 前缀的列定义

---

## 10. 客户客群逻辑

### 10.1 预设客群

定义在 `lib/customer-segments/preset-segments.ts`，共 7 个:

| Key | 标签 | 分类 | 说明 |
|-----|------|------|------|
| `recently_created` | 新建客户 | new | 最近 N 天创建 (7/30/90) |
| `upcoming_follow_up` | 待跟进客户 | follow_up | nextFollowUpAt 在范围内 (今天/7 天/30 天) |
| `overdue_follow_up` | 逾期未跟进 | follow_up | nextFollowUpAt 已过期 (0/7/30 天) |
| `high_intent` | 高意向客户 | sales | purchaseIntent=HIGH 或 dealProbability 超阈值 (60/70/80%) |
| `inactive_customers` | 不活跃客户 | follow_up | 最近 N 天无联系 (30/60/90) |
| `quoted_not_won` | 报价未成交 | sales | 有报价但无确认订单 (跨表查询) |
| `won_customers` | 成交客户 | sales | stage=WON 或有确认订单 (跨表查询) |

### 10.2 查询构建器

`lib/customer-segments/segment-query-builder.ts`:
- 简单客群: 直接使用 Prisma where 子句
- 复杂客群 (`quoted_not_won`, `won_customers`): 多查询+去重+分页

### 10.3 用户偏好

`PresetSegmentPreference` 模型:
- 每个 tenant+user 对每个 segmentKey 有独立配置
- 配置项: isVisible, sortOrder, showOnDashboard, settings (JSON)
- API: `/api/customer-segments/preferences`

### 10.4 页面

| 路由 | 说明 |
|------|------|
| `/customers/segments` | 客群概览 (卡片列表) |
| `/customers/segments/[segment]` | 单客群详情 |
| `/customers/segments/[segment]/settings` | 客群设置编辑 |

---

## 11. 任务/跟进逻辑

### 11.1 任务模块

**Server Actions** (`app/(dashboard)/tasks/actions.ts`):

| Action | 说明 |
|--------|------|
| `createTask(formData)` | 创建任务。关联 lead/customer/project/quote/order |
| `updateTask(id, formData)` | 更新任务。若 status=COMPLETED 自动设置 completedAt |
| `deleteTask(id)` | 删除任务 |
| `completeTask(id)` | 标记完成 (status=COMPLETED, completedAt=now) |

**任务列表页** (`/tasks`):
- Tab 筛选: 全部/今日/逾期/本周/已完成
- 搜索: 标题/描述
- 优先级/状态 Badge 显示
- 逾期任务高亮

**逾期检测** (`getOverdueTasks()`):
- 查询 PENDING 状态且 dueDate < now() 的任务

### 11.2 跟进模块

**Server Actions** (`app/(dashboard)/follow-ups/actions.ts`):

| Action | 说明 |
|--------|------|
| `createFollowUp(formData)` | 创建跟进。若设置了 nextFollowUpDate，自动创建对应 Task |
| `updateFollowUp(id, formData)` | 更新跟进 |
| `deleteFollowUp(id)` | 删除跟进 |

### 11.3 自动化任务创建

**事件驱动** (`lib/domain/auto-tasks.ts`):

| 触发事件 | 自动任务 | 截止时间 | 优先级 |
|----------|----------|----------|--------|
| `lead.created` | createFollowUpTaskForLead | 1 天后 | HIGH |
| `quote.sent` | createFollowUpTaskForQuote | 1 天后 | MEDIUM |
| `order.confirmed` | createProductionTaskForOrder | 7 天后 | MEDIUM |

**幂等性**: 检查是否已存在相同类型的未完成任务，避免重复创建。

**AI 驱动** (`lib/ai/agents/followup-agent.ts`):
- `checkAndTriggerFollowUps()`: 查找 3 天以上无跟进的线索、7 天以上不活跃的客户，自动创建任务

### 11.4 日历集成

`CalendarEvent` 模型 + `/calendar` 页面:
- 事件类型: task/meeting/holiday/reminder
- 关联: customerId/leadId/projectId
- 视图: 周/月/列表

---

## 12. 报价模块逻辑

### 12.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/quotes/actions.ts` | 报价 CRUD |
| `app/(dashboard)/quotes/[id]/items/actions.ts` | 明细行 CRUD |
| `components/QuoteForm.tsx` | 报价表单 |
| `components/QuoteItemForm.tsx` | 明细行表单 |

### 12.2 Server Actions

**报价操作:**

| Action | 说明 |
|--------|------|
| `createQuote(formData)` | 创建报价。自动编号: Q-YYYYMMDD-NNNN。关联 lead/customer/project |
| `updateQuote(id, formData)` | 更新报价 |
| `deleteQuote(id)` | 删除报价 (引用完整性检查) |
| `updateQuoteStatus(id, status)` | 更新状态。**终态锁定**: ACCEPTED/REJECTED/EXPIRED 不可回退 |
| `recalculateQuoteTotals(id)` | 从 QuoteItem 汇总 totalPrice，应用 discountAmount |

**明细行操作:**

| Action | 说明 |
|--------|------|
| `createQuoteItem(quoteId, data)` | 创建明细行。自动计算 totalPrice = unitPrice * quantity |
| `updateQuoteItem(id, data)` | 更新明细行 + 触发总价重算 |
| `deleteQuoteItem(id)` | 删除明细行 + 触发总价重算 |

### 12.3 报价状态流转

```
DRAFT -> SENT -> WAITING_FEEDBACK -> REVISED -> ACCEPTED
                                            -> REJECTED
                                     -> EXPIRED
```

终态: ACCEPTED, REJECTED, EXPIRED (不可回退)

### 12.4 事件触发

当状态变为 SENT 时:
1. 触发 `quote.sent` 事件
2. 自动创建跟进任务 (1 天截止)
3. 自动对关联客户进行 deal scoring

---

## 13. 订单模块逻辑

### 13.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/orders/actions.ts` | 订单 CRUD |
| `app/(dashboard)/orders/[id]/items/actions.ts` | 明细行 CRUD |
| `app/(dashboard)/orders/views/actions.ts` | 列表视图 |
| `components/OrderForm.tsx` | 订单表单 |
| `components/OrderItemForm.tsx` | 明细行表单 |
| `components/OrderListClient.tsx` | 列表客户端组件 |
| `components/OrderColumnSettingsDialog.tsx` | 列设置对话框 |
| `lib/orders/calculator.ts` | 订单计算逻辑 |

### 13.2 Server Actions

**订单操作:**

| Action | 说明 |
|--------|------|
| `createOrder(formData)` | 创建订单。自动编号: O-YYYYMMDD-NNNN |
| `updateOrder(id, formData)` | 更新订单 |
| `deleteOrder(id)` | 删除订单 (引用完整性检查) |
| `updateOrderStatus(id, status)` | 更新状态。**终态锁定**: COMPLETED/CANCELLED 不可回退 |
| `createOrderFromQuote(quoteId, customerId)` | 报价转订单 (事务操作) |
| `recalculateOrderTotals(id)` | 从 OrderItem 汇总 |

**报价转订单流程** (`createOrderFromQuote`):
1. 校验报价状态为 ACCEPTED
2. 校验 customerId 存在
3. 防重复转换检查
4. 创建 Order (复制报价所有字段)
5. 复制所有 QuoteItem 到 OrderItem
6. 更新报价状态
7. 记录活动日志

**明细行操作:** 与报价明细行类似的 CRUD + 自动总价计算。

### 13.3 订单状态流转

```
DRAFT -> CONFIRMED -> PRODUCTION -> READY_TO_SHIP -> SHIPPED -> COMPLETED
                                                    -> CANCELLED
```

终态: COMPLETED, CANCELLED (不可回退)

### 13.4 财务字段

Order 模型包含丰富财务字段:
- subtotal, discountAmount, taxAmount, chargeAmount
- paidAmount, outstandingAmount
- costAmount, grossProfitAmount, grossProfitRate

**实际状态**: 这些字段已存在于 Schema 中，但当前 Server Actions 仅自动计算 totalAmount。更细粒度的财务字段 (成本/利润) 尚未在 Actions 中自动计算。

### 13.5 订单附加费用

`OrderCharge` 模型存在，但**未发现专用的 UI Actions 文件**。

### 13.6 列表视图

`/orders/views/` 提供完整的视图管理:
- 创建/更新/删除/设为默认
- 可配置列、筛选、排序、每页行数

---

## 14. 发票逻辑

### 14.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/api/finance/invoices/route.ts` | 列表/创建 API |
| `app/api/finance/invoices/[id]/route.ts` | 获取/更新/删除 API |
| `app/(dashboard)/finance/page.tsx` | 财务概览页 |
| `app/(dashboard)/finance/invoices/new/NewInvoiceForm.tsx` | 创建表单 |
| `app/(dashboard)/finance/invoices/[id]/page.tsx` | 发票详情 |
| `app/(dashboard)/finance/invoices/[id]/RecordPaymentForm.tsx` | 付款表单 |

### 14.2 逻辑

- **自动编号**: `INV-NNNNNN`
- **状态**: DRAFT -> SENT -> PAID / OVERDUE / CANCELLED
- **关联**: customerId (必填), orderId (可选)
- **自动填充**: 选择订单时自动填充 customerId 和 amount
- **财务概览**: 总开票额、已付、未付、逾期汇总
- **API 模式**: 通过 REST API 实现 (非 Server Actions)

---

## 15. 付款逻辑

### 15.1 文件

| 文件 | 说明 |
|------|------|
| `app/api/finance/payments/route.ts` | 创建付款 API |
| `app/(dashboard)/finance/invoices/[id]/RecordPaymentForm.tsx` | 付款表单 |

### 15.2 逻辑

1. 创建 Payment 记录 (amount, method, notes)
2. 汇总该发票所有 Payment 的总金额
3. 若 totalPaid >= invoice.amount:
   - 更新 invoice.status = PAID
   - 设置 invoice.paidAt = now()
4. 记录活动日志

**付款方式**: TT (电汇), LC (信用证), PayPal, Western Union, Cash, Other

**部分付款**: 数据模型支持 (多笔 Payment 记录)，但 UI 无明确的部分付款进度显示。

---

## 16. 产品/业务线逻辑

### 16.1 产品 (Product)

**Server Actions** (`app/(dashboard)/products/actions.ts`):

| Action | 说明 |
|--------|------|
| `createProduct(formData)` | 创建产品。必填: name。关联 businessLineId |
| `updateProduct(id, formData)` | 更新产品 |
| `deleteProduct(id)` | 删除产品 |

**字段**: name, category, englishKeywords, commonSpecs, application, targetMarket, notes, isActive

**被引用**: QuoteItem.productId, OrderItem.productId

### 16.2 业务线 (BusinessLine)

**Server Actions** (`app/(dashboard)/business-lines/actions.ts`):

| Action | 说明 |
|--------|------|
| `createBusinessLine(formData)` | 创建业务线。name 唯一, code 唯一 |
| `updateBusinessLine(id, formData)` | 更新业务线 |
| `deleteBusinessLine(id)` | 删除 (引用完整性: 有 Lead/Customer/Project 关联则阻止) |

**字段**: name (unique), code (unique), description, website, mainProducts

**组织层级**: 业务线是顶层组织实体 -- Lead, Customer, Project, Product, Order, FollowUpTemplate, ExternalSource 均关联 BusinessLine。

---

## 17. 商机项目逻辑

### 17.1 文件清单

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/projects/actions.ts` | Server Actions |
| `app/(dashboard)/projects/pipeline/page.tsx` | 管道视图 |
| `components/ProjectForm.tsx` | 表单组件 |

### 17.2 Server Actions

| Action | 说明 |
|--------|------|
| `createProject(formData)` | 创建项目。关联 businessLine + customer |
| `updateProject(id, formData)` | 更新项目 |
| `deleteProject(id)` | 删除 (引用完整性检查) |
| `updateProjectStatus(id, status)` | 更新状态 |
| `markProjectAsWon(id)` | 标记中标 |

### 17.3 项目状态流转

```
REQUIREMENT_CONFIRMING -> QUOTING -> SAMPLE_TESTING -> WAITING_FEEDBACK -> NEGOTIATING -> WON
                                                                          -> LOST
                                                                          -> PAUSED
```

### 17.4 管道视图

`/projects/pipeline`:
- Kanban 看板视图
- 7 个状态列
- 拖拽或点击移动

---

## 18. 邮件模块逻辑

### 18.1 核心服务

| 文件 | 说明 |
|------|------|
| `lib/email/service.ts` | 多账号邮件服务 (8KB) |
| `lib/email.ts` | 简单邮件辅助 |
| `lib/communication/message-service.ts` | 统一消息服务 |

### 18.2 邮箱账号管理

- **支持提供商**: GMAIL, OUTLOOK, ALIYUN, NETEASE, CUSTOM
- **配置项**: imapHost/Port, smtpHost/Port, smtpSecure, username, password
- **CRUD**: 通过 `app/api/email/accounts/` API

### 18.3 发送邮件

`POST /api/email/send`:
1. 连接 SMTP (Nodemailer)
2. 发送邮件
3. 保存 EmailMessage (direction=out, status=sent)
4. 创建或更新 EmailThread
5. 支持 CC、回复线程 (inReplyTo)
6. CRM 绑定 (lead/customer/contact/quote/order)

### 18.4 接收邮件 (IMAP 同步)

`POST /api/email/sync`:
1. 连接 IMAP (ImapFlow)
2. 获取 INBOX 邮件
3. 按 messageId 去重
4. 自动绑定 CRM 实体 (按发件人地址匹配 Contact/Customer/Lead)
5. 处理邮件线程 (inReplyTo)
6. 更新 EmailThread.lastMessageAt, messageCount

### 18.5 邮件线程

- EmailThread 模型聚合同一主题的多封邮件
- Thread 视图页面展示完整对话
- 自动通过 inReplyTo 头匹配创建/关联

### 18.6 CRM 自动绑定

收到邮件时:
1. 提取发件人/收件人地址
2. 在 Contact 表中匹配 email
3. 找到关联的 Customer
4. 设置 EmailMessage 的 customerId, contactId, leadId

### 18.7 统一消息服务

`lib/communication/message-service.ts`:
- `Message` 模型: channel (email/whatsapp/webchat/manual)
- 身份解析: 从消息地址解析出联系人/客户
- 时间线聚合: 汇总所有渠道的消息到客户时间线
- 消息分析: intent, sentiment, urgency

### 18.8 页面

| 路由 | 说明 |
|------|------|
| `/email` | 邮件中心 |
| `/email/accounts` | 邮箱账号管理 |
| `/email/compose` | 写邮件 |
| `/email/inbox` | 收件箱 |
| `/email/thread/[id]` | 邮件线程详情 |
| `/email/settings` | 邮件设置 |
| `/email/stats` | 邮件统计 |

---

## 19. AI 模块逻辑

### 19.1 核心文件

| 文件 | 说明 |
|------|------|
| `lib/ai/core.ts` | 统一 AI 引擎入口 |
| `lib/ai/client.ts` | OpenAI 兼容 API 客户端 |
| `lib/ai/types.ts` | 类型定义 |
| `lib/ai/prompts.ts` | 系统提示词 (15KB，含行业专家提示) |
| `lib/ai/actions.ts` | LLM 分析动作 (20KB) |
| `lib/ai/executor.ts` | IM 意图执行器 (28KB) |
| `lib/ai/parser.ts` | 响应解析 |
| `lib/ai/tools.ts` | Function Calling 工具定义 |
| `lib/ai/intent.ts` | 意图解析 |
| `lib/ai/vision.ts` | 视觉 AI |
| `lib/ai/crm-analyzer.ts` | 规则分析 |

### 19.2 专业代理

| 文件 | 说明 |
|------|------|
| `lib/ai/agents/sales-agent.ts` | 销售消息生成 |
| `lib/ai/agents/followup-agent.ts` | 自动跟进触发 |
| `lib/ai/agents/deal-scoring-agent.ts` | 成交概率评分 |

### 19.3 AI 控制系统

| 文件 | 说明 |
|------|------|
| `lib/ai/control/guard.ts` | 执行守卫 |

### 19.4 AI 分析类型

| 类型 | 输入 | 输出 |
|------|------|------|
| 线索分析 | Lead 数据 + FollowUp 记录 | summary, requirements, qualificationLevel, intent, buyerTypeGuess, riskPoints, missingInfo, suggestedQuestions, whatsappReply, emailReply, internalSalesNote |
| 客户分析 | Customer 数据 | 类似线索分析 |
| 项目分析 | Project 数据 | 项目评估 |
| 跟进回复 | FollowUp 内容 | 建议回复 |
| 模板改写 | 模板内容 | 优化后的模板 |

### 19.5 规则分析

**线索评分** (0-100):
- 联系方式完整度
- 互动指标
- 内容质量
- 状态权重

**销售建议生成**:
- WhatsApp 消息模板
- Email 消息模板
- 电话话术

### 19.6 IM Bot (飞书)

15 个 Function Calling 意图:

| 意图 | 说明 |
|------|------|
| `create_lead` | 创建线索 |
| `create_customer` | 创建客户 |
| `create_order` | 创建订单 |
| `create_quote` | 创建报价 |
| `add_followup` | 添加跟进 |
| `query_leads` | 查询线索 |
| `query_customers` | 查询客户 |
| `query_orders` | 查询订单 |
| `query_tasks` | 查询任务 |
| `query_pool` | 查询公海 |
| `update_order_status` | 更新订单状态 |
| `update_customer_grade` | 更新客户等级 |
| `complete_task` | 完成任务 |
| `claim_customer` | 领取客户 |
| `return_to_pool` | 退回公海 |

### 19.7 视觉 AI

- 从图片中提取客户信息 (名片、截图)
- 支持独立的 vision model 配置
- 可回退到主 AI 模型

### 19.8 AI 控制面板

**AIControlSettings**:
- aiEnabled: 全局开关
- salesAgentEnabled / emailAgentEnabled / whatsappAgentEnabled / followUpAgentEnabled / prospectingEnabled: 模块开关
- executionMode: MANUAL (人工审批) / APPROVAL (AI 建议+审批) / AUTO (全自动)
- workHoursStart/workHoursEnd: 工作时间
- maxContactsPerDay: 每日上限

**AIPolicyRule**:
- type: HARD (强制阻止) / SOFT (警告)
- action: block_send / limit_rate / block_blacklist / block_discount

**Guard 五步权限检查**:
1. 全局开关
2. 模块开关
3. 工作时间
4. 策略规则
5. 速率限制

### 19.9 统一 AI 核心

```typescript
analyze()  // 所有分析类型入口
decide()   // 所有决策类型入口
execute()  // 所有操作类型入口
```

所有操作经过权限守卫。

---

## 20. Event Bus 逻辑

### 20.1 文件

`lib/events/bus.ts`

### 20.2 支持的事件

| 事件 | 触发时机 |
|------|----------|
| `lead.created` | 创建新线索时 |
| `quote.sent` | 报价状态变为 SENT 时 |
| `order.confirmed` | 订单状态变为 CONFIRMED 时 |
| `customer.created` | 创建新客户时 |
| `task.created` | 创建新任务时 |
| `email.received` | 收到新邮件时 |

### 20.3 事件处理

**emit() 函数**:
1. 将事件记录到 ActivityLog 表
2. 根据事件类型路由到 handler

**当前 Handler**:

| 事件 | Handler | 行为 |
|------|---------|------|
| `lead.created` | `handleLeadCreated` | 1) 幂等创建跟进任务 (1 天截止, HIGH 优先级) 2) 自动 AI 评分 |
| `quote.sent` | `handleQuoteSent` | 1) 幂等创建跟进任务 (1 天截止, MEDIUM 优先级) 2) 自动 deal scoring |
| `order.confirmed` | `handleOrderConfirmed` | 1) 幂等创建生产跟进任务 (7 天截止, MEDIUM 优先级) |

**实现特征**:
- 使用动态 `import()` 加载依赖，保持 bus 模块轻量
- 幂等性: 检查是否已存在相同类型未完成任务
- 容错: handler 异常不阻塞主流程

---

## 21. ActivityLog 逻辑

### 21.1 文件

`lib/activity-log.ts`

### 21.2 数据模型

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | |
| action | String (required) | 如 "created", "updated", "deleted", "converted" |
| entityType | String (required) | 如 "Lead", "Customer", "Quote" |
| entityId | String? | 多态引用 (存为字符串) |
| entityName | String? | 实体显示名 |
| description | String? | 详细描述 |
| createdAt | DateTime | |

### 21.3 使用模式

```typescript
import { logActivity } from "@/lib/activity-log";
await logActivity({ action, entityType, entityId, entityName, description });
```

- **非阻塞**: 内部 try-catch 吞掉错误，不破坏主流程
- **全模块覆盖**: 所有 Server Actions 在关键操作后调用

### 21.4 查看

`/activity-logs` 页面展示操作日志列表。

---

## 22. 列表字段设置与视图

### 22.1 客户列表字段注册

`lib/customer-list/field-registry.ts` (10KB):

**字段分类**:
| 分类 | 包含字段 |
|------|----------|
| COMPANY | company, shortName, website, industry, companySize |
| CONTACT | contactName, email, phone, whatsapp |
| SALES | customerType, customerStatus, lifecycleStage, leadGrade, stage, purchaseIntent, dealProbability |
| DATES | createdAt, lastContactAt, nextFollowUpAt |
| AI | aiScore, aiIntentLevel |
| OWNER | ownerId, ownerName |
| CUSTOM | 动态自定义字段 (custom:<id>) |

### 22.2 订单列表字段注册

`lib/order-list/field-registry.ts` (11KB):

**字段分类**:
| 分类 | 包含字段 |
|------|----------|
| BASIC | orderNo, orderTitle, orderStatus |
| CUSTOMER | customerId, contactId |
| FINANCIAL | totalAmount, currency, paidAmount, outstandingAmount |
| DELIVERY | expectedDeliveryDate, actualDeliveryDate |
| DATES | createdAt |

### 22.3 列设置对话框

- `ColumnSettingsDialog.tsx`: 客户列表列设置
- `OrderColumnSettingsDialog.tsx`: 订单列表列设置

### 22.4 保存视图

**CustomerListView / OrderListView**:
- name, description, isDefault, isShared
- columns (Json): 可见列配置
- filters (Json): 筛选条件
- sort (Json): 排序配置
- pageSize (Int): 每页行数

Server Actions 在 `customers/views/actions.ts` 和 `orders/views/actions.ts` 中。

---

## 23. 归档/恢复/删除策略

### 23.1 客户归档

| 操作 | 说明 |
|------|------|
| `archiveCustomer(id)` | isArchived=true, archivedAt=now() |
| `restoreCustomer(id)` | isArchived=false, archivedAt=null |
| 查询排除 | 列表页默认不显示已归档客户 |

### 23.2 订单归档

Order 模型包含 isArchived/archivedAt 字段。
**状态**: Schema 支持，但 Server Actions 中未发现 archive/restore 实现。

### 23.3 删除策略

| 模块 | 删除方式 | 引用完整性 |
|------|----------|------------|
| 线索 | 物理删除 | 检查 FollowUp/Quote/Task/Project 关联，有则阻止 |
| 客户 | 物理删除 | 检查所有子实体关联 |
| 联系人 | 物理删除 | - |
| 项目 | 物理删除 | 检查 FollowUp/Quote/Task/Order 关联 |
| 报价 | 物理删除 | 检查 Order/Task/EmailMessage 关联 |
| 订单 | 物理删除 | 检查 Invoice/Task 关联 |
| 业务线 | 物理删除 | 检查 Lead/Customer/Project 关联 |
| 自定义字段 | 软删除 | isActive=false |

### 23.4 级联删除

- LeadActivity: onDelete Cascade (删除 Lead 时)
- CustomerActivity: onDelete Cascade (删除 Customer 时)
- ContactSocialProfile: onDelete Cascade (删除 Contact 时)
- OrderCharge: onDelete Cascade (删除 Order 时)

---

## 24. 备份与存储

### 24.1 数据库备份

**Windows 脚本**:
- `backup-db.bat`: PostgreSQL 数据库备份脚本
- `restore-db.bat`: 数据库恢复脚本

**Docker 环境**:
- PostgreSQL 16 Alpine 容器
- 数据通过 Docker volume 持久化

### 24.2 数据存储

- **数据库**: PostgreSQL (本地 Docker, Port 5433)
- **文件上传**: 当前无文件存储服务，Document 模型的 fileUrl 为手动填写
- **无云存储集成**: 无 S3/OSS/MinIO 集成

### 24.3 .env 配置

```
DATABASE_URL=postgresql://...:5432/crm_db
APP_URL=http://localhost:3003
AI_PROVIDER=OPENAI_COMPATIBLE
AI_BASE_URL=...
AI_API_KEY=...
AI_MODEL=...
```

---

## 25. 校验与错误处理

### 25.1 Zod 校验

**校验文件**:
- `lib/validations/customer.ts` (5.8KB)
- `lib/validations/order.ts` (4.8KB)

**客户校验**:
- company: 必填
- contactName: 必填
- email: 可选，格式校验
- phone: 可选
- 其他字段: 可选

**订单校验**:
- customerId: 必填
- orderStatus: 枚举校验
- totalAmount: 数值校验
- currency: 枚举校验

### 25.2 Server Action 错误处理

模式:
```typescript
export async function createXxx(formData: FormData) {
  try {
    // ... 业务逻辑
  } catch (error) {
    console.error("Failed to create xxx:", error);
    return { error: "操作失败" };
  }
}
```

### 25.3 引用完整性

删除操作前检查关联实体:
- 线索删除: 检查 followUps, quotes, tasks, projects
- 客户删除: 检查所有子实体
- 业务线删除: 检查 leads, customers, projects

### 25.4 终态锁定

报价和订单的终态不可回退:
- Quote: ACCEPTED, REJECTED, EXPIRED
- Order: COMPLETED, CANCELLED

### 25.5 幂等性检查

- 线索转换: 检查是否已转换
- 订单转换: 检查报价是否已关联订单
- 自动任务: 检查是否已存在相同类型未完成任务

---

## 26. 业务流程概览

### 26.1 核心销售流程

```
外部来源 (Webhook/Facebook/手动)
    |
    v
线索 (Lead)
    |-- AI 自动评分
    |-- 手动/自动跟进
    |
    v (convertLeadToCustomer)
客户 (Customer) + 联系人 (Contact)
    |-- 公海管理 (领取/释放)
    |-- 沉睡检测
    |-- 客群分类
    |
    v
商机项目 (Project)
    |-- 管道视图 (7 阶段)
    |
    v
报价 (Quote)
    |-- 明细行 (QuoteItem)
    |-- 发送 -> 自动跟进任务
    |-- 状态流转 (终态锁定)
    |
    v (createOrderFromQuote)
订单 (Order)
    |-- 明细行 (OrderItem)
    |-- 附加费用 (OrderCharge)
    |-- 确认 -> 自动生产任务
    |-- 状态流转 (终态锁定)
    |
    v
发票 (Invoice)
    |-- 付款 (Payment)
    |-- 自动检测全额付款
```

### 26.2 跟进流程

```
创建跟进 (FollowUp)
    |-- 设置 nextFollowUpDate
    |-- 自动创建 Task
    |
    v
AI 跟进代理 (Follow-up Agent)
    |-- 检测休眠线索 (3+ 天)
    |-- 检测不活跃客户 (7+ 天)
    |-- 自动创建任务
```

### 26.3 AI 流程

```
AI 分析请求
    |
    v
权限守卫 (Guard) -- 5 步检查
    |
    v (通过)
AI 核心 (Core)
    |-- analyze(): 分析类操作
    |-- decide(): 决策类操作
    |-- execute(): 执行类操作
    |
    v
LLM API (OpenAI 兼容)
    |-- 规则分析 (不调用 LLM)
    |-- LLM 分析 (调用 API)
    |-- 视觉分析 (图片)
```

### 26.4 邮件流程

```
发送邮件
    |-- SMTP (Nodemailer)
    |-- 保存 EmailMessage
    |-- 创建/更新 EmailThread
    |-- CRM 绑定

接收邮件
    |-- IMAP (ImapFlow)
    |-- 按 messageId 去重
    |-- 按地址匹配 CRM 实体
    |-- 处理线程
```

---

## 27. 业务规则清单

### 27.1 必填字段规则

| 模块 | 必填字段 |
|------|----------|
| 线索 | company, contactName, businessLineId |
| 客户 | company, contactName, businessLineId |
| 联系人 | name, customerId |
| 项目 | name, businessLineId, customerId |
| 报价 | quoteNo (自动) |
| 订单 | orderNo (自动), customerId |
| 发票 | invoiceNo (自动), customerId, amount |
| 付款 | invoiceId, amount |
| 任务 | title |
| 跟进 | content |
| 产品 | name, businessLineId |
| 业务线 | name (unique) |

### 27.2 编号规则

| 类型 | 格式 | 示例 |
|------|------|------|
| 报价号 | Q-YYYYMMDD-NNNN | Q-20260619-0001 |
| 订单号 | O-YYYYMMDD-NNNN | O-20260619-0001 |
| 发票号 | INV-NNNNNN | INV-000001 |

### 27.3 状态流转规则

| 实体 | 状态 | 终态 |
|------|------|------|
| 线索 | NEW -> CONTACTED -> REQUIREMENT_CONFIRMING -> QUOTING -> NEGOTIATING -> QUALIFIED -> CONVERTED/WON/LOST/DORMANT | - |
| 项目 | REQUIREMENT_CONFIRMING -> QUOTING -> SAMPLE_TESTING -> WAITING_FEEDBACK -> NEGOTIATING -> WON/LOST/PAUSED | - |
| 报价 | DRAFT -> SENT -> WAITING_FEEDBACK -> REVISED -> ACCEPTED/REJECTED/EXPIRED | ACCEPTED, REJECTED, EXPIRED |
| 订单 | DRAFT -> CONFIRMED -> PRODUCTION -> READY_TO_SHIP -> SHIPPED -> COMPLETED/CANCELLED | COMPLETED, CANCELLED |
| 发票 | DRAFT -> SENT -> PAID/OVERDUE/CANCELLED | - |

### 27.4 转换规则

| 转换 | 前置条件 | 结果 |
|------|----------|------|
| 线索 -> 客户 | 未被转换 | 创建 Customer + 主 Contact，线索状态=CONVERTED |
| 报价 -> 订单 | 报价状态=ACCEPTED | 创建 Order + 复制明细行 |

### 27.5 金额计算规则

| 场景 | 计算方式 |
|------|----------|
| 报价明细行 | totalPrice = unitPrice * quantity |
| 报价总计 | 汇总所有 QuoteItem.totalPrice - discountAmount |
| 订单明细行 | totalPrice = unitPrice * quantity |
| 订单总计 | 汇总所有 OrderItem.totalPrice |
| 付款检测 | totalPaid >= invoice.amount -> 状态=PAID |

### 27.6 公海规则

| 规则 | 说明 |
|------|------|
| 领取 | 设置 ownerId，清除公海字段 |
| 释放 | 设置 poolEnteredAt/poolReason，清除 ownerId |
| 自动释放 | 检查 N 天无跟进的客户，批量退回 |

### 27.7 AI 控制规则

| 规则 | 说明 |
|------|------|
| 全局开关 | aiEnabled=false 则所有 AI 功能禁用 |
| 模块开关 | 每个 agent 可独立开关 |
| 工作时间 | workHoursStart - workHoursEnd 期间才执行 |
| 策略规则 | HARD=强制阻止, SOFT=警告 |
| 速率限制 | maxContactsPerDay 每日上限 |

---

## 28. 手动测试点

详见 `docs/product/manual-test-points.json`。

---

## 29. 功能实现状态矩阵

### 29.1 核心模块

| 模块 | 后端 | 前端 | 完整度 | 备注 |
|------|------|------|--------|------|
| 线索 CRUD | 完成 | 完成 | 100% | 含 Webhook 导入 |
| 线索转客户 | 完成 | 完成 | 100% | 事务操作 |
| 线索 AI 评分 | 完成 | 完成 | 100% | 规则+LLM |
| 客户 CRUD | 完成 | 完成 | 100% | |
| 客户公海 | 完成 | 完成 | 100% | 领取/释放/自动释放 |
| 客户归档 | 完成 | 完成 | 100% | 软归档+恢复 |
| 沉睡客户 | 完成 | 完成 | 100% | 60 天检测 |
| 客户视图 | 完成 | 完成 | 100% | 列配置+筛选+排序 |
| 客户客群 | 完成 | 完成 | 100% | 7 种预设 |
| 联系人 CRUD | 完成 | 完成 | 95% | 扩展字段 Schema 有但 UI 未完全覆盖 |
| 社交档案 | 完成 | 完成 | 100% | |
| 商机项目 | 完成 | 完成 | 100% | 含管道视图 |
| 跟进记录 | 完成 | 完成 | 100% | 含自动任务创建 |
| 任务管理 | 完成 | 完成 | 100% | 含逾期检测 |

### 29.2 业务模块

| 模块 | 后端 | 前端 | 完整度 | 备注 |
|------|------|------|--------|------|
| 报价 CRUD | 完成 | 完成 | 100% | 含明细行 |
| 报价状态锁定 | 完成 | 完成 | 100% | 终态不可回退 |
| 订单 CRUD | 完成 | 完成 | 100% | 含明细行 |
| 报价转订单 | 完成 | 完成 | 100% | 事务操作 |
| 订单视图 | 完成 | 完成 | 100% | |
| 订单财务字段 | Schema | 部分 | 60% | subtotal/discount/tax/cost/profit 未自动计算 |
| 订单附加费用 | Schema | 无 | 30% | OrderCharge 有模型无 UI Actions |
| 发票管理 | 完成 | 完成 | 100% | |
| 付款记录 | 完成 | 完成 | 100% | 自动检测全额付款 |
| 产品管理 | 完成 | 完成 | 100% | |
| 业务线管理 | 完成 | 完成 | 100% | |
| 文档管理 | 完成 | 完成 | 100% | 多态关联 |
| 跟进模板 | 完成 | 完成 | 100% | |
| 汇率计算器 | 完成 | 完成 | 100% | 40+ 币种 |

### 29.3 AI 模块

| 模块 | 后端 | 前端 | 完整度 | 备注 |
|------|------|------|--------|------|
| AI 分析 (LLM) | 完成 | 完成 | 100% | 线索/客户/项目/跟进/模板 |
| AI 评分 (规则) | 完成 | 完成 | 100% | |
| AI 销售建议 | 完成 | 完成 | 100% | |
| AI 视觉分析 | 完成 | 完成 | 100% | 名片/截图提取 |
| AI 控制面板 | 完成 | 完成 | 100% | |
| AI 策略规则 | 完成 | 完成 | 100% | |
| AI 执行日志 | 完成 | 完成 | 100% | |

### 29.4 邮件/IM 模块

| 模块 | 后端 | 前端 | 完整度 | 备注 |
|------|------|------|--------|------|
| 邮箱账号管理 | 完成 | 完成 | 100% | 多提供商 |
| 发送邮件 | 完成 | 完成 | 100% | |
| 接收邮件 | 完成 | 完成 | 100% | IMAP 同步 |
| 邮件线程 | 完成 | 完成 | 100% | |
| CRM 自动绑定 | 完成 | - | 100% | |
| 邮件统计 | 完成 | 完成 | 100% | |
| 飞书 IM | 完成 | 完成 | 100% | 15 意图 |
| 统一消息 | 完成 | 部分 | 70% | 后端完成，前端集成有限 |

### 29.5 系统模块

| 模块 | 后端 | 前端 | 完整度 | 备注 |
|------|------|------|--------|------|
| 自定义字段 | 完成 | 部分 | 70% | 后端完整，前端仅 TEXT 类型 |
| 活动日志 | 完成 | 完成 | 100% | |
| Event Bus | 完成 | - | 100% | 3 个事件处理器 |
| CSV 导入 | 完成 | 完成 | 100% | |
| CSV 导出 | 完成 | 完成 | 100% | |
| 数据报表 | 完成 | 完成 | 100% | 6 种图表 |
| 目标追踪 | 完成 | 完成 | 100% | |
| 日历 | 完成 | 完成 | 100% | |
| Webhook | 完成 | 完成 | 100% | |
| 系统健康检查 | 完成 | 完成 | 100% | |
| 数据备份 | 完成 | 脚本 | 100% | .bat 脚本 |

### 29.6 认证/权限

| 模块 | 后端 | 前端 | 完整度 | 备注 |
|------|------|------|--------|------|
| 单用户认证 | 硬编码 | - | 20% | 无真实认证 |
| 角色模型 | Schema | - | 10% | ADMIN/MANAGER/SALES 存在但未使用 |
| 路由保护 | 透传 | - | 0% | middleware 不拦截 |

---

## 30. 已知限制

### 30.1 功能限制

| 限制 | 说明 | 影响 |
|------|------|------|
| 单用户模式 | 硬编码 user id=1，无真实认证 | 无法多用户协作 |
| 无文件存储 | Document.fileUrl 为手动填写 | 无法上传实际文件 |
| 无实时推送 | 无 WebSocket/SSE | 无实时通知 |
| 无国际化 | UI 仅中文 | 无法支持其他语言 |
| 自定义字段类型 | 仅 TEXT 类型可用 | 其他字段类型 Schema 有但 UI 未实现 |

### 30.2 技术限制

| 限制 | 说明 |
|------|------|
| 订单财务字段 | subtotal/discountAmount/taxAmount/costAmount/grossProfit 等字段在 Schema 中但 Actions 未自动计算 |
| 订单附加费用 | OrderCharge 有模型但无 UI Actions |
| 联系人扩展字段 | firstName/lastName 等扩展字段在 Schema 中但表单未完全覆盖 |
| 统一消息 | 后端 Message 模型完成，前端集成有限 |
| 导出文件下载 | API 导出端点存在但前端下载流程需验证 |
| 无 PWA 支持 | 无 Service Worker 或 manifest |
| 无离线模式 | 完全依赖网络和本地数据库 |
| 无移动端适配 | UI 未针对移动端优化 |

### 30.3 安全限制

| 限制 | 说明 |
|------|------|
| 无认证保护 | 所有路由无需登录即可访问 |
| 无 CSRF 防护 | Server Actions 无 CSRF token |
| 无速率限制 | API 端点无速率限制 |
| AI API Key 明文 | AIConfig.apiKey 以明文存储 |
| 无 HTTPS 强制 | 本地 HTTP 运行 |

### 30.4 数据限制

| 限制 | 说明 |
|------|------|
| 无数据迁移 | 仅基线迁移，无版本化迁移策略 |
| 无数据清理 | 无定期清理 ActivityLog/WebhookLog 策略 |
| 备份为手动 | 无自动定时备份 |
| 无数据导入验证 | CSV 导入校验有限 |

---

> 本文档基于 v0.1.0 代码库生成，所有功能描述以实际代码为准。
