# 数据存储

## 存储架构

Multi-Business CRM 当前采用纯数据库存储方案，无文件系统存储。

### 当前存储方式

```
┌──────────────────────────────────────┐
│           PostgreSQL 16              │
│                                      │
│  业务数据  ←  所有 CRM 数据           │
│  用户数据  ←  用户、权限、租户         │
│  AI 数据   ←  分析结果、策略、日志     │
│  邮件数据  ←  账户、消息、线程         │
│  IM 数据   ←  平台、用户、消息         │
│  活动日志  ←  所有操作记录             │
│  Webhook   ←  请求/响应日志           │
│                                      │
│  存储位置: Docker Volume              │
│  Volume 名: postgres_data            │
└──────────────────────────────────────┘
```

### 不使用文件存储

当前系统**不存储任何文件到文件系统**：

- 文档记录（Document 模型）仅存储元数据和 `fileUrl`（指向外部 URL）
- 邮件附件不存储在本地
- 没有图片上传功能（图片通过 Vision AI 直接处理，不持久化）

## 数据库配置

### 连接参数

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/crm?schema=public"
```

### Docker 配置

```yaml
# docker-compose.yml
db:
  image: postgres:16-alpine
  ports:
    - "5433:5432"
  environment:
    POSTGRES_DB: crm
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

### Prisma 配置

- ORM: Prisma 7.8.0
- 驱动适配器: `@prisma/adapter-pg`（PrismaPg）
- 生成客户端路径: `lib/generated/prisma/`
- 连接管理: `lib/prisma.ts`（单例模式）

## 数据模型大小

| 类别 | 模型数 | 说明 |
|------|--------|------|
| 核心 CRM | 10 | Lead, Customer, Contact, Project, FollowUp 等 |
| 销售文档 | 4 | Quote, QuoteItem, Order, OrderItem |
| 财务 | 2 | Invoice, Payment |
| 任务与活动 | 5 | Task, CalendarEvent, SalesGoal, ActivityLog, FollowUp |
| 产品与模板 | 3 | Product, FollowUpTemplate, Document |
| 邮件 | 5 | EmailAccount, EmailMessage, EmailThread + 2 DEPRECATED |
| AI | 6 | AIConfig, AIAnalysis, AILog, AIControlSettings, AIPolicyRule, AIExecutionLog |
| IM | 3 | IMPlatform, IMUser, IMMessage |
| 消息 | 1 | Message |
| 租户 | 2 | Tenant, User |
| 外部接入 | 2 | ExternalSource, WebhookLog |
| **合计** | **34** | |

## 预估数据增长

| 数据类型 | 日增长量（估） | 月增长量 |
|----------|---------------|----------|
| 线索 | 10-50 条 | 300-1,500 条 |
| 客户 | 5-20 条 | 150-600 条 |
| 报价单 | 5-10 条 | 150-300 条 |
| 订单 | 2-5 条 | 60-150 条 |
| 邮件消息 | 20-100 条 | 600-3,000 条 |
| 活动日志 | 50-200 条 | 1,500-6,000 条 |
| AI 分析 | 10-30 条 | 300-900 条 |

## 数据保留策略

### 当前状态

没有自动数据清理机制。所有数据永久保留。

### 建议保留周期

| 数据类型 | 建议保留 | 清理方式 |
|----------|----------|----------|
| 业务数据（Lead、Customer、Order） | 永久 | 不清理 |
| ActivityLog | 90 天 | 定期归档 |
| WebhookLog | 30 天 | 定期删除 |
| AIExecutionLog | 90 天 | 定期归档 |
| AILog | 90 天 | 定期归档 |
| IMMessage | 180 天 | 定期归档 |
| EmailMessage | 永久 | 不清理 |

### 清理脚本（建议）

```sql
-- 删除 90 天前的活动日志
DELETE FROM "ActivityLog" WHERE "createdAt" < NOW() - INTERVAL '90 days';

-- 删除 30 天前的 Webhook 日志
DELETE FROM "WebhookLog" WHERE "createdAt" < NOW() - INTERVAL '30 days';
```

## 备份策略

详见 `docs/data/04-backup.md`。

- 备份工具：`backup-db.bat`（pg_dump）
- 备份位置：`backups/` 目录
- 备份频率：建议每日
- 保留数量：建议保留最近 7-30 天的备份
