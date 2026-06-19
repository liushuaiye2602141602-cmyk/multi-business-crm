# Docker 问题

## 容器无法启动

### 症状

```
docker-compose up -d
# 容器立即退出或反复重启
```

### 排查

```bash
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs app
docker-compose logs db

# 查看最近的退出原因
docker inspect <container_id> --format='{{.State.ExitCode}}'
```

### 常见原因

**端口被占用**：

```bash
# 检查端口 3000（app）和 5433（db）
netstat -ano | findstr :3000
netstat -ano | findstr :5433

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3001:3000"  # 改用 3001
  - "5434:5432"  # 改用 5434
```

**环境变量缺失**：

```bash
# 确认 .env 文件存在于项目根目录
# 确认 docker-compose.yml 中正确引用了环境变量
```

**Docker 资源不足**：

```bash
# 检查 Docker Desktop 资源设置
# 建议至少分配 4GB RAM
```

## Volume 问题

### 数据库数据丢失

```bash
# 检查 Volume 是否存在
docker volume ls | grep postgres

# 查看 Volume 详情
docker volume inspect multi-business-crm_postgres_data

# 确认 docker-compose.yml 中 Volume 配置正确
volumes:
  postgres_data:    # 命名 Volume，数据持久化
```

**注意**：`docker-compose down` 不会删除 Volume。`docker-compose down -v` 会删除 Volume（数据丢失！）。

### Volume 权限问题

```bash
# Linux 下可能出现权限问题
# 修复 PostgreSQL 数据目录权限
docker-compose exec db chown -R postgres:postgres /var/lib/postgresql/data
```

## 端口冲突

### 与本地 PostgreSQL 冲突

如果本地已安装 PostgreSQL 并占用 5432 端口：

```yaml
# docker-compose.yml 中已映射为 5433
db:
  ports:
    - "5433:5432"  # 宿主机 5433 → 容器 5432
```

确保 `.env` 中的 `DATABASE_URL` 使用 5433：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/crm?schema=public"
```

### 与本地 Next.js 冲突

如果 `npm run dev` 和 Docker 同时运行，会占用相同端口：

```bash
# 方案 1：停止本地 dev server
# 方案 2：修改 Docker 端口映射
ports:
  - "3001:3000"
```

## 构建问题

### Docker 构建失败

```bash
# 清除构建缓存
docker-compose build --no-cache

# 检查 Dockerfile 语法
docker build -t test-build .
```

### 构建时间过长

```bash
# 利用 Docker BuildKit 缓存
DOCKER_BUILDKIT=1 docker-compose build
```

## 数据库连接问题

### 容器间通信

```bash
# 应用容器连接数据库容器时，使用服务名而非 localhost
# docker-compose.yml 中的 DATABASE_URL 应使用：
DATABASE_URL="postgresql://postgres:password@db:5432/crm?schema=public"
#                                              ^^
#                                              服务名 'db'
```

### 健康检查失败

```bash
# 查看数据库健康检查状态
docker-compose ps
# db 容器的 STATUS 列显示 (healthy) 或 (unhealthy)

# 手动检查数据库是否就绪
docker-compose exec db pg_isready -U postgres
```

## 日志查看

```bash
# 查看所有容器日志
docker-compose logs

# 实时查看应用日志
docker-compose logs -f app

# 查看最近 100 行日志
docker-compose logs --tail 100 app

# 查看特定时间后的日志
docker-compose logs --since "2025-01-15T10:00:00" app
```
