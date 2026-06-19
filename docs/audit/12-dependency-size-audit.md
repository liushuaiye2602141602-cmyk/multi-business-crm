# 12 - Dependency Size Audit

> 审计日期：2026-06-19

## 依赖概览

| 类型 | 数量 |
|------|------|
| 直接依赖 | 14 |
| 开发依赖 | 13 |
| **总计** | **27** |

## 直接依赖 (14)

| 包名 | 用途 | 大小贡献 |
|------|------|---------|
| `next` | Next.js 框架 | 大 |
| `react` / `react-dom` | React 核心 | 大 |
| `@prisma/client` | Prisma ORM 客户端 | 中 |
| `@prisma/adapter-pg` | PostgreSQL 适配器 | 小 |
| `prisma` | Prisma CLI | 中 |
| `pg` | PostgreSQL 驱动 | 小 |
| `lucide-react` | 图标库 | 中 |
| `recharts` | 图表库 | 中 |
| `nodemailer` | SMTP 发送 | 小 |
| `imapflow` | IMAP 接收 | 小 |
| `bcryptjs` | 密码加密 | 小 |
| `jsonwebtoken` | JWT 认证 | 小 |
| `@larksuiteoapi/node-sdk` | 飞书 SDK | 中 |

## 开发依赖 (13)

| 包名 | 用途 |
|------|------|
| `typescript` | TypeScript 编译器 |
| `@types/node` | Node.js 类型 |
| `@types/react` / `@types/react-dom` | React 类型 |
| `@types/nodemailer` | Nodemailer 类型 |
| `@types/bcryptjs` | bcryptjs 类型 |
| `@types/jsonwebtoken` | JWT 类型 |
| `@types/pg` | PostgreSQL 类型 |
| `eslint` / `eslint-config-next` | 代码检查 |
| `tailwindcss` / `@tailwindcss/postcss` | CSS 框架 |
| `tsx` | TypeScript 执行器 |

## 潜在问题

| 问题 | 说明 |
|------|------|
| `@electric-sql/pglite` | 隐含依赖，包含大量 .tar.gz PostgreSQL 扩展，占用 node_modules 大量空间 |
| `@prisma/dev` | 包含开发运行时资源，也是 node_modules 大的原因之一 |
| 无重复依赖 | 所有依赖都有明确用途 |

## 结论

依赖数量合理（27 个），无重复依赖。node_modules 大小（860 MB）主要由 Next.js、Prisma 和 PostgreSQL 相关包贡献，属于正常水平。
