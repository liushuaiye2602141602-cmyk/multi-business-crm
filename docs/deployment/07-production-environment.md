# 生产环境

## 生产环境清单

在将应用部署到生产环境前，确认以下所有项目已准备就绪。

### 安全配置

- [ ] `JWT_SECRET` 已设置为强随机值（至少 32 字符）
- [ ] `POSTGRES_PASSWORD` 已设置为强密码
- [ ] 默认测试用户（admin@example.com）已禁用或删除
- [ ] `.env` 文件权限设置为 600（仅所有者可读写）
- [ ] 已配置 HTTPS（参见 [HTTPS 配置](06-https.md)）
- [ ] 数据库端口 5433 不对外暴露（已从 docker-compose.yml 移除或防火墙拦截）

### 数据库配置

- [ ] 数据库已执行 `prisma migrate deploy`
- [ ] 数据库已创建定期备份任务
- [ ] 备份文件存储在独立位置（非数据库同一磁盘）
- [ ] 备份恢复流程已测试

### 应用配置

- [ ] `APP_URL` 设置为生产域名（如 https://your-domain.com）
- [ ] `NODE_ENV` 设置为 `production`
- [ ] `restart: unless-stopped` 已配置（docker-compose.yml 已默认设置）
- [ ] Nginx 反向代理已配置

### 监控

- [ ] 应用日志可正常查看（`docker compose logs`）
- [ ] 服务器资源监控已配置（CPU、内存、磁盘）
- [ ] 数据库连接监控已配置

## 环境变量

### 必需变量

| 变量 | 说明 | 生产环境要求 |
|------|------|-------------|
| DATABASE_URL | PostgreSQL 连接字符串 | 使用强密码，限制仅本机访问 |
| JWT_SECRET | JWT 签名密钥 | 使用 `openssl rand -base64 32` 生成 |
| APP_URL | 应用访问地址 | 使用 HTTPS URL |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| NODE_ENV | 运行环境 | `production` |
| AI_PROVIDER | AI 服务提供商 | 无 |
| AI_BASE_URL | AI API 地址 | 无 |
| AI_API_KEY | AI API Key | 无 |
| AI_MODEL | AI 模型名称 | 无 |
| VISION_API_KEY | 视觉 AI API Key | 无 |
| VISION_BASE_URL | 视觉 AI API 地址 | 无 |
| VISION_MODEL | 视觉 AI 模型名称 | 无 |

### 生成安全密钥

```bash
# JWT_SECRET
openssl rand -base64 32

# 数据库密码
openssl rand -base64 24
```

## 数据库管理

### 生产环境迁移

```bash
# 部署迁移（安全，不会清空数据）
docker compose exec app npx prisma migrate deploy
```

### 严禁使用的命令

以下命令会清空数据库，生产环境绝对不能执行：

```bash
# 危险！会清空所有数据
npx prisma migrate reset
npx prisma db push --force-reset
```

### Prisma Studio

如果需要在生产环境查看数据库，可以临时启用 Prisma Studio：

```bash
# 临时运行（记得使用后关闭）
docker compose exec app npx prisma studio
```

> **注意：** Prisma Studio 默认监听 5555 端口，不要暴露到公网。仅用于临时调试。

## 数据备份

### 手动备份

```bash
# 备份数据库
docker compose exec -T db pg_dump -U postgres open_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh backup_*.sql
```

### 自动备份

设置 cron 定时任务（每天凌晨 3 点备份）：

```bash
sudo crontab -e
```

```cron
0 3 * * * cd /path/to/multi-business-crm && docker compose exec -T db pg_dump -U postgres open_crm > /var/backups/crm/backup_$(date +\%Y\%m\%d).sql 2>/dev/null
```

### 备份保留策略

建议保留最近 30 天的备份：

```cron
0 4 * * * find /var/backups/crm -name "backup_*.sql" -mtime +30 -delete
```

### 恢复备份

```bash
docker compose exec -T db psql -U postgres open_crm < backup_20260101_030000.sql
```

> **恢复前务必先备份当前数据！**

## 监控

### 服务健康检查

```bash
# 查看容器状态
docker compose ps

# 查看容器资源使用
docker stats --no-stream
```

### 日志管理

```bash
# 实时查看应用日志
docker compose logs -f app

# 查看最近 100 行日志
docker compose logs --tail 100 app

# 查看特定时间段日志
docker compose logs --since="2026-01-01T00:00:00" app
```

### 系统资源监控

```bash
# 磁盘使用
df -h

# 内存使用
free -h

# Docker 磁盘使用
docker system df
```

## 性能调优

### Docker 资源限制

可在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

### 数据库连接池

应用使用 Prisma 的连接池，默认配置适用于中小规模使用。如有需要，可在 `DATABASE_URL` 中添加连接池参数：

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db:5432/open_crm?schema=public&connection_limit=10&pool_timeout=10"
```

## 日志查看

### 应用日志

```bash
# Next.js 应用日志
docker compose logs app

# 实时跟踪
docker compose logs -f app
```

### 数据库日志

```bash
# PostgreSQL 日志
docker compose logs db
```

### Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```
