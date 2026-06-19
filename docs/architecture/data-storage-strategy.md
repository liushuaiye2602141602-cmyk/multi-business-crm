# 推荐数据存储架构

本文档描述 Multi-Business CRM 在生产环境中推荐的数据存储架构，基于当前架构的演进建议。

## 当前架构

```
应用 (Next.js)
    ↕
PostgreSQL 16 (Docker Volume)
```

**特点**：
- 单一 PostgreSQL 实例承载所有数据
- Docker Volume 持久化存储
- 无文件系统存储
- 无外部存储服务

**限制**：
- 无水平扩展能力
- 无文件存储（附件、图片）
- 备份依赖 pg_dump
- 无读写分离

## 结构化数据

### PostgreSQL 配置

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| 数据库 | Docker PostgreSQL 16 | 云数据库（阿里云 RDS / AWS RDS） |
| 持久化 | Docker named volume | 云数据库自动持久化 |
| 备份 | `backup-db.bat` 手动 | 每日自动备份 + 异地备份 |
| 迁移 | `npx prisma migrate dev` | `npx prisma migrate deploy` |

### 备份策略

```
每日 02:00 自动备份 → 本地 + 异地（S3/OSS）
保留最近 30 天
每月 1 日保留全年快照
加密存储（AES-256）
```

## 推荐生产架构

### 阶段 1：基础加固（当前优先级）

```
┌──────────────────────┐
│   Nginx 反向代理      │
│   SSL + 静态资源缓存  │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   Next.js 应用       │
│   (Node.js 进程)     │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   PostgreSQL 16      │
│   本地 SSD 存储      │
│   定时备份 → S3      │
└──────────────────────┘
```

**改进点**：
- Nginx 反向代理 + SSL
- 定时备份到 S3 或兼容存储
- 数据库使用 SSD

### 阶段 2：扩展能力

```
┌──────────────────────┐
│   Nginx 反向代理      │
│   + CDN（静态资源）   │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   Next.js 应用       │
│   (多实例负载均衡)    │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   PostgreSQL 16      │
│   Primary + Replica  │
│   (读写分离)          │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   S3 / MinIO         │
│   (文件存储)          │
└──────────────────────┘
```

**改进点**：
- 读写分离减轻数据库压力
- S3 对象存储用于文件上传
- CDN 加速静态资源

### 阶段 3：高可用

```
┌──────────────────────┐
│   Load Balancer      │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   App Server × N     │
│   (水平扩展)          │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   PostgreSQL Cluster │
│   (主从 + 自动故障切换)│
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   Redis              │
│   (缓存 + Session)   │
├──────────────────────┤
│   S3 / OSS           │
│   (文件 + 备份)       │
└──────────────────────┘
```

## 文件和附件

### 当前状态

当前系统**不存储任何文件到文件系统**：
- Document 模型仅存储元数据和 `fileUrl`（指向外部 URL）
- 邮件附件不存储在本地
- 没有图片上传功能

### 生产环境推荐

```
对象存储（R2/OSS/S3）
  └── tenant/{tenantId}/{entity}/{entityId}/{category}/{fileId}/{filename}
```

| 方案 | 适用环境 | 说明 |
|------|----------|------|
| S3 | AWS 部署 | 原生集成 |
| OSS | 阿里云部署 | 国内访问快 |
| MinIO | 自建部署 | S3 兼容 API |
| 本地 Volume | 开发环境 | 简单但不可扩展 |

### 文件上传流程

```
用户上传 → API Route 接收
         → 上传到 S3/MinIO
         → 返回文件 URL
         → 存储 URL 到数据库 Document 表
         → 文件 URL 供后续访问
```

### 规则

- 数据库只存文件元数据（fileName, fileSize, mimeType, objectKey）
- 不存文件内容
- 私有文件使用签名 URL（有效期 1 小时）
- 按 tenantId 隔离
- 文件大小限制：单文件 50MB
- 允许类型：pdf, doc, docx, xls, xlsx, jpg, png, gif

## 缓存数据

| 目录 | 用途 | 可删除 | 恢复方式 |
|------|------|--------|---------|
| `.next/` | Next.js 缓存 | 是 | `npm run dev` |
| `node_modules/` | npm 依赖 | 是 | `npm install` |
| `tsconfig.tsbuildinfo` | TS 增量 | 是 | 自动重建 |
| `lib/generated/` | Prisma 客户端 | 是 | `npx prisma generate` |

**不存业务数据。**

## 密钥配置

| 环境 | 存储方式 |
|------|---------|
| 开发环境 | `.env` 文件（不提交 Git） |
| 生产环境 | 环境变量 / Secret Manager |
| Docker | `docker-compose.yml` 环境变量 |
| CI/CD | GitHub Secrets / Vercel 环境变量 |

**永远不提交到 Git。**

## 数据库优化建议

### 索引优化

当前已有的索引：
- `@@index([tenantId])` 在多个模型上
- `@@unique` 在唯一字段上

建议添加：

```sql
-- 高频查询字段
CREATE INDEX idx_lead_owner ON "Lead"("ownerId");
CREATE INDEX idx_lead_status ON "Lead"("status");
CREATE INDEX idx_customer_owner ON "Customer"("ownerId");
CREATE INDEX idx_quote_status ON "Quote"("status");
CREATE INDEX idx_order_status ON "Order"("status");
CREATE INDEX idx_task_status ON "Task"("status");
CREATE INDEX idx_task_due ON "Task"("dueDate");

-- 复合索引
CREATE INDEX idx_lead_owner_status ON "Lead"("ownerId", "status");
CREATE INDEX idx_customer_owner_status ON "Customer"("ownerId", "customerStatus");
```

### 连接池

Prisma 默认使用连接池，生产环境建议配置：

```env
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=30"
```

### 查询优化

- 避免 N+1 查询（使用 `include` 预加载关联数据）
- 列表查询使用分页（`skip` + `take`）
- 搜索使用数据库级别的 `contains`（而非应用层过滤）

## 缓存策略

### 建议缓存层级

| 层级 | 技术 | 用途 |
|------|------|------|
| CDN | CloudFlare / 阿里云 CDN | 静态资源 |
| 应用缓存 | 内存 / Redis | 枚举数据、配置 |
| 数据库查询缓存 | PostgreSQL 内置 | 频繁查询结果 |

### 可缓存数据

- `lib/enums.ts` 中的枚举映射（变动极少）
- AIConfig（配置数据，变更不频繁）
- BusinessLine 列表
- 产品目录
