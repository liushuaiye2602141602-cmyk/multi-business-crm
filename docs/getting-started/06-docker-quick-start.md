# Docker 快速启动

## 前提条件

- Docker Engine 20.10+
- Docker Compose V2

确认安装：

```bash
docker --version
docker compose version
```

## 一键启动

### 1. 克隆项目

```bash
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少修改以下变量：

```env
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
JWT_SECRET=YOUR_RANDOM_SECRET_KEY
APP_URL=http://localhost:3000
```

> **重要：** `POSTGRES_PASSWORD` 和 `JWT_SECRET` 必须在生产环境使用强随机值。

### 3. 启动服务

```bash
docker compose up -d
```

首次启动会拉取镜像并构建应用，可能需要 3-5 分钟。构建完成后自动启动。

### 4. 初始化数据库

```bash
# 运行数据库迁移
docker compose exec app npx prisma migrate deploy

# （可选）导入种子数据
docker compose exec app npm run db:seed
```

### 5. 访问应用

打开浏览器访问 http://localhost:3000

默认登录：
- **邮箱：** admin@example.com
- **密码：** password123

## docker-compose.yml 说明

项目根目录下的 `docker-compose.yml` 定义了两个服务：

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

### 服务说明

| 服务 | 容器名 | 镜像 | 主机端口 | 说明 |
|------|--------|------|----------|------|
| db | crm-postgres | postgres:16-alpine | 5433 | PostgreSQL 数据库 |
| app | crm-app | 本地构建 | 3000 | Next.js 应用 |

### 端口映射

- **3000** -- CRM 应用（Docker 生产模式）
- **5433** -- PostgreSQL 数据库（主机端口，容器内部为 5432）

> **注意：** 开发模式下应用运行在 3003 端口，Docker 生产模式运行在 3000 端口。

### 数据持久化

数据库数据通过 Docker named volume `postgres_data` 持久化，容器重启后数据不会丢失。

## 常用 Docker 命令

### 服务管理

```bash
# 启动服务（后台运行）
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 查看应用日志
docker compose logs -f app

# 查看数据库日志
docker compose logs -f db
```

### 数据库操作

```bash
# 运行迁移
docker compose exec app npx prisma migrate deploy

# 生成 Prisma Client
docker compose exec app npx prisma generate

# 打开 Prisma Studio
docker compose exec app npx prisma studio

# 导入种子数据
docker compose exec app npm run db:seed

# 连接数据库命令行
docker compose exec db psql -U postgres -d open_crm
```

### 重建应用

```bash
# 代码变更后重新构建
docker compose up -d --build

# 强制重新构建（不使用缓存）
docker compose build --no-cache
docker compose up -d
```

### 数据备份与恢复

```bash
# 备份数据库
docker compose exec db pg_dump -U postgres open_crm > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T db psql -U postgres open_crm < backup.sql
```

## 清理环境

```bash
# 停止并删除容器、网络
docker compose down

# 停止并删除容器、网络、数据卷（会删除数据库数据！）
docker compose down -v

# 删除构建缓存
docker system prune
```

> **警告：** `docker compose down -v` 会删除所有数据库数据，仅在确认不需要数据时使用。

## 故障排查

### 容器启动失败

```bash
# 查看容器状态和退出码
docker compose ps -a

# 查看详细日志
docker compose logs app
docker compose logs db
```

### 数据库连接问题

应用容器内通过服务名 `db` 连接数据库。如果应用日志显示数据库连接失败：

```bash
# 确认数据库容器健康
docker compose exec db pg_isready -U postgres

# 测试连接
docker compose exec db psql -U postgres -d open_crm -c "SELECT 1"
```

### 端口冲突

如果 3000 或 5433 端口已被占用：

```bash
# 查看端口占用
# Windows
netstat -ano | findstr :3000

# macOS / Linux
lsof -i :3000
```

修改 `docker-compose.yml` 中的端口映射，或停止冲突服务。

### 构建失败

```bash
# 清理后重新构建
docker compose down
docker compose build --no-cache
docker compose up -d
```
