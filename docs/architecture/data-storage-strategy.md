# Data Storage Strategy

> 审计日期：2026-06-19

## 一、结构化数据

### PostgreSQL

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

## 二、文件和附件

### 开发环境

```
storage/
  ├── tenant/
  │   ├── {tenantId}/
  │   │   ├── customers/{customerId}/documents/
  │   │   ├── quotes/{quoteId}/attachments/
  │   │   ├── orders/{orderId}/attachments/
  │   │   └── emails/{emailId}/attachments/
```

### 生产环境

```
对象存储（R2/OSS/S3）
  └── tenant/{tenantId}/{entity}/{entityId}/{category}/{fileId}/{filename}
```

### 规则

- 数据库只存文件元数据（fileName, fileSize, mimeType, objectKey）
- 不存文件内容
- 私有文件使用签名 URL（有效期 1 小时）
- 按 tenantId 隔离
- 文件大小限制：单文件 50MB
- 允许类型：pdf, doc, docx, xls, xlsx, jpg, png, gif

## 三、缓存数据

| 目录 | 用途 | 可删除 | 恢复方式 |
|------|------|--------|---------|
| `.next/` | Next.js 缓存 | ✅ | `npm run dev` |
| `node_modules/` | npm 依赖 | ✅ | `npm install` |
| `tsconfig.tsbuildinfo` | TS 增量 | ✅ | 自动重建 |
| `lib/generated/` | Prisma 客户端 | ✅ | `npx prisma generate` |

**不存业务数据。**

## 四、密钥配置

| 环境 | 存储方式 |
|------|---------|
| 开发环境 | `.env` 文件（不提交 Git） |
| 生产环境 | 环境变量 / Secret Manager |
| Docker | `docker-compose.yml` 环境变量 |
| CI/CD | GitHub Secrets / Vercel 环境变量 |

**永远不提交到 Git。**
