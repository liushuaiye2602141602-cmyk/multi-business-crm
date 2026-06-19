# 数据库问题

## 连接被拒绝（Connection Refused）

### 症状

```
Error: connect ECONNREFUSED 127.0.0.1:5433
```

### 原因与解决

**PostgreSQL 容器未启动**：

```bash
# 检查容器状态
docker-compose ps

# 启动数据库
docker-compose up -d db

# 等待健康检查通过
docker-compose logs -f db
```

**端口不匹配**：

确认 `.env` 中的 `DATABASE_URL` 端口与 `docker-compose.yml` 映射一致：

```yaml
# docker-compose.yml
db:
  ports:
    - "5433:5432"  # 宿主机:5433 → 容器:5432
```

```env
# .env
DATABASE_URL="postgresql://postgres:password@localhost:5433/crm?schema=public"
```

**密码错误**：

```bash
# 检查 docker-compose.yml 中的密码配置
# 确认与 DATABASE_URL 中的密码一致
```

## 迁移错误（Migration Errors）

### 症状

```
Error: P3009: migrate found failed migration(s)
```

### 解决

```bash
# 查看迁移状态
npx prisma migrate status

# 标记失败的迁移为已解决（谨慎使用）
npx prisma migrate resolve --rolled-back <migration_name>

# 或重置所有迁移（会丢失数据！）
npx prisma migrate reset

# 然后重新运行
npx prisma migrate dev
```

### 表已存在

```bash
# 如果表已存在但未记录在迁移历史中
npx prisma migrate deploy --skip-generate

# 或手动标记
npx prisma migrate resolve --applied <migration_name>
```

### Schema 与数据库不同步

```bash
# 查看差异
npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma

# 创建新迁移修复差异
npx prisma migrate dev --name fix-sync
```

## 种子数据问题（Seed Failures）

### 种子脚本不存在

`prisma seed` 需要在 `package.json` 中配置：

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

### 种子数据插入失败

```bash
# 重置数据库后重新运行种子
npx prisma migrate reset --force
npx prisma db seed
```

## 数据库性能问题

### 查询慢

```bash
# 启用 Prisma 查询日志
# 在 lib/prisma.ts 中添加
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

# 检查慢查询后关闭日志
```

### 连接池耗尽

Prisma 默认使用连接池。如果出现连接耗尽错误：

```env
# 在 DATABASE_URL 中添加连接池参数
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=30"
```

## 数据恢复

如果数据库损坏或需要恢复：

```bash
# 使用备份恢复
# Windows
restore-db.bat

# 手动恢复
docker-compose exec db psql -U postgres -d crm -f /backups/backup.sql
```

详见 `docs/data/05-restore.md`。
