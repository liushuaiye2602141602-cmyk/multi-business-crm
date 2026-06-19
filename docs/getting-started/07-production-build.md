# 生产构建

## 概述

生产构建将 Next.js 应用编译为独立（standalone）模式，生成精简的可部署包。配合 Docker 多阶段构建，产出最小化的生产镜像。

## 构建步骤

### 1. 确保环境正确

```bash
# 安装依赖
npm ci

# 确认 Prisma Client 已生成
npx prisma generate
```

### 2. 执行构建

```bash
npm run build
```

构建过程包含：

1. **TypeScript 编译** -- 检查类型错误
2. **ESLint 检查** -- 代码规范检查
3. **Next.js 编译** -- 页面和 API 路由编译
4. **Standalone 输出** -- 生成独立运行包

构建成功后，输出目录为 `.next/`，其中 `.next/standalone/` 包含可独立运行的生产包。

### 3. Standalone 输出结构

项目 `next.config.ts` 已配置 `output: "standalone"`：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

standalone 模式会自动将所有依赖打包到 `.next/standalone/` 中，无需 `node_modules` 目录即可运行。

构建产物关键文件：

```
.next/
  standalone/
    server.js          # 生产服务器入口
    node_modules/      # 打包后的依赖
    .next/             # 编译后的应用代码
  static/              # 静态资源
  public/              # 公共文件
```

### 4. 本地测试生产构建

```bash
# 启动生产服务器（端口 3003）
npm run start
```

或手动运行 standalone 服务器：

```bash
node .next/standalone/server.js
```

> **注意：** standalone 模式默认监听 3000 端口，而 `npm run start` 使用 3003 端口。

## Docker 多阶段构建

项目的 `Dockerfile` 使用三阶段构建，最大化缓存效率：

### 阶段说明

```
Stage 1: deps      -- 安装依赖（基于 node:18-alpine）
Stage 2: builder   -- 编译应用（生成 Prisma Client + Next.js 构建）
Stage 3: runner    -- 生产运行（精简镜像，非 root 用户）
```

### Dockerfile 详解

```dockerfile
FROM node:18-alpine AS base

# --- 阶段 1: 安装依赖 ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- 阶段 2: 构建应用 ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- 阶段 3: 生产运行 ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir -p /app/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]
```

### 构建优化要点

| 阶段 | 优化点 |
|------|--------|
| deps | 仅复制 `package.json` + `package-lock.json`，依赖不变时使用缓存 |
| builder | 复制完整源码 + 依赖，执行 Prisma generate 和 Next.js build |
| runner | 仅复制必要的运行时文件（standalone + static + public + prisma） |

### Prisma 运行时文件

生产镜像需要以下 Prisma 文件才能正常运行数据库查询：

- `prisma/schema.prisma` -- 数据库 schema 定义
- `node_modules/.prisma/` -- Prisma 引擎和类型定义
- `node_modules/@prisma/` -- Prisma 运行时包

### 安全特性

- **非 root 用户** -- 以 `nextjs` 用户（uid 1001）运行
- **Alpine 基础镜像** -- 最小化攻击面
- **NODE_ENV=production** -- 启用生产优化

## 构建生产 Docker 镜像

```bash
# 构建镜像
docker build -t multi-business-crm:latest .

# 运行镜像
docker run -d \
  --name crm-prod \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_DB_HOST:5432/open_crm?schema=public" \
  -e JWT_SECRET="YOUR_JWT_SECRET" \
  -e APP_URL="https://your-domain.com" \
  multi-business-crm:latest
```

## 生产环境变量

生产构建需要配置以下环境变量：

| 变量 | 必需 | 说明 |
|------|------|------|
| DATABASE_URL | 是 | PostgreSQL 连接字符串 |
| JWT_SECRET | 是 | JWT 签名密钥（必须使用强随机值） |
| APP_URL | 是 | 生产环境应用 URL（如 https://your-domain.com） |
| NODE_ENV | 是 | 设置为 `production` |

可选变量：

| 变量 | 说明 |
|------|------|
| AI_PROVIDER | AI 服务提供商 |
| AI_BASE_URL | AI API 地址 |
| AI_API_KEY | AI API Key |
| AI_MODEL | AI 模型名称 |

## 构建常见问题

### Prisma Client 未生成

```
Error: @prisma/client did not initialize yet
```

在构建前确保执行了 `npx prisma generate`。

### 内存不足

Next.js 构建可能需要较多内存。如果构建失败并显示内存相关错误：

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Docker 构建超时

首次构建可能需要较长时间。使用以下命令并增加超时：

```bash
docker build --progress=plain -t multi-business-crm .
```
