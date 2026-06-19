# Docker 部署

## 前提条件

- 服务器：2GB RAM 以上，20GB 磁盘以上
- Docker Engine 20.10+
- Docker Compose V2
- Git

## 部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置生产环境变量：

```env
# 数据库密码（使用强密码）
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD

# JWT 密钥（使用随机生成的长字符串）
JWT_SECRET=YOUR_RANDOM_JWT_SECRET

# 应用 URL（使用实际域名或服务器 IP）
APP_URL=https://your-domain.com
```

生成随机 JWT_SECRET 的方法：

```bash
# Linux / macOS
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 3. 构建并启动服务

```bash
docker compose up -d --build
```

首次构建大约需要 3-5 分钟。后续启动仅需几秒。

### 4. 初始化数据库

```bash
# 运行数据库迁移
docker compose exec app npx prisma migrate deploy

# （可选）导入种子数据
docker compose exec app npm run db:seed
```

### 5. 验证部署

```bash
# 查看服务状态
docker compose ps

# 查看应用日志
docker compose logs -f app
```

访问 http://your-server-ip:3000 确认应用正常运行。

默认登录：
- **邮箱：** admin@example.com
- **密码：** password123

> **提醒：** 生产环境应立即修改默认密码并删除测试用户。

## docker-compose.yml 结构

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: crm-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-crm_password_change_me}
      POSTGRES_DB: open_crm
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    container_name: crm-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD:-crm_password_change_me}@db:5432/open_crm?schema=public
      - JWT_SECRET=${JWT_SECRET:-change-this-in-production}
      - APP_URL=${APP_URL:-http://localhost:3000}
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

### 服务架构

```
Internet
    |
    v
[Port 3000] --> crm-app (Next.js standalone)
                    |
                    v (internal: db:5432)
              [Port 5433] --> crm-postgres (PostgreSQL 16)
                                  |
                                  v
                          postgres_data (volume)
```

### 端口说明

| 端口 | 服务 | 用途 |
|------|------|------|
| 3000 | crm-app | CRM 应用访问 |
| 5433 | crm-postgres | 数据库（可选暴露） |

如果数据库不需要从主机访问，可以移除 db 服务的 `ports` 配置。

## Dockerfile 多阶段构建

项目 Dockerfile 使用三阶段构建，产出精简的生产镜像：

```dockerfile
FROM node:18-alpine AS base

# 阶段 1: 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 阶段 2: 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 阶段 3: 生产运行
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

**关键特性：**
- 以非 root 用户 `nextjs` 运行
- 仅复制运行时必要的文件
- 基于 `node:18-alpine` 最小化镜像体积

## 数据管理

### 数据持久化

数据库数据通过 Docker named volume `postgres_data` 存储，容器重启后数据保留。

```bash
# 查看数据卷
docker volume ls | grep postgres

# 查看数据卷详情
docker volume inspect multi-business-crm_postgres_data
```

### 数据库备份

```bash
# 备份到文件
docker compose exec -T db pg_dump -U postgres open_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# 查看备份大小
ls -lh backup_*.sql
```

### 数据库恢复

```bash
# 恢复数据库
docker compose exec -T db psql -U postgres open_crm < backup_20260101_120000.sql
```

### 连接数据库

```bash
# 通过 Docker 连接 PostgreSQL
docker compose exec db psql -U postgres -d open_crm

# 查看所有表
\dt

# 退出
\q
```

## 常用运维命令

### 服务管理

```bash
docker compose up -d              # 启动服务
docker compose down               # 停止服务
docker compose restart            # 重启服务
docker compose ps                 # 查看状态
docker compose logs -f app        # 应用日志
docker compose logs -f db         # 数据库日志
```

### 代码更新

```bash
git pull
docker compose up -d --build      # 重新构建并启动
```

### 数据库迁移

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma generate
```

## 故障排查

### 容器无法启动

```bash
# 查看容器状态
docker compose ps -a

# 查看退出容器的日志
docker compose logs crm-app
```

### 数据库连接超时

```bash
# 测试数据库是否就绪
docker compose exec db pg_isready -U postgres

# 查看数据库容器健康状态
docker inspect --format='{{.State.Health.Status}}' crm-postgres
```

### 磁盘空间不足

```bash
# 查看 Docker 磁盘使用
docker system df

# 清理未使用的镜像和缓存
docker system prune -a
```
