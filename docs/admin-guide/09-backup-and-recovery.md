# 备份与恢复 (Backup & Recovery)

## 概述

系统提供 Windows 批处理脚本用于 PostgreSQL 数据库的备份与恢复。数据库通过 Docker 容器运行。

## 备份脚本 (backup-db.bat)

### 使用方法

```batch
backup-db.bat
```

### 执行流程

1. **检查 Docker 状态** — 确认 Docker Desktop 正在运行
2. **启动 PostgreSQL 容器** — 如果 `multi-business-crm-postgres` 容器未运行则启动
3. **执行 pg_dump** — 使用 `pg_dump` 导出数据库
4. **保存备份文件** — 存储在 `backups/` 目录，文件名包含时间戳

### 备份文件位置

```
项目根目录/backups/
  ├── backup_20260619_143022.sql
  ├── backup_20260618_100045.sql
  └── ...
```

### 手动备份 (pg_dump)

```bash
# 进入 Docker 容器执行
docker exec -t multi-business-crm-postgres pg_dump -U postgres crm_database > backup_$(date +%Y%m%d).sql

# 或直接使用 pg_dump（如果已安装）
pg_dump -h localhost -U postgres -d crm_database -f backup.sql
```

## 恢复脚本 (restore-db.bat)

### 使用方法

```batch
restore-db.bat
```

### 执行流程

1. **列出可用备份** — 显示 `backups/` 目录下所有 `.sql` 文件
2. **选择备份文件** — 输入文件序号
3. **确认操作** — 需要输入 "YES" 确认
4. **安全备份** — 恢复前自动备份当前数据
5. **执行恢复** — 使用 `psql` 导入备份文件

### 恢复后操作

恢复完成后需要手动执行：

```bash
# 重新生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run dev
```

## Docker Volume 备份

除了 SQL 导出，还可以备份 Docker Volume：

```bash
# 查看 volume 名称
docker volume ls | grep postgres

# 备份 volume
docker run --rm -v multi-business-crm-postgres_data:/data -v $(pwd)/backups:/backup ubuntu tar czf /backup/volume_$(date +%Y%m%d).tar.gz /data

# 恢复 volume
docker run --rm -v multi-business-crm-postgres_data:/data -v $(pwd)/backups:/backup ubuntu tar xzf /backup/volume_20260619.tar.gz -C /
```

## 定期备份建议

| 频率 | 方法 | 保留期 |
|------|------|--------|
| 每日 | `backup-db.bat` | 7 天 |
| 每周 | Docker Volume 备份 | 30 天 |
| 部署前 | 手动 pg_dump | 永久保留 |

## 前提条件

- Docker Desktop 已安装并运行
- PostgreSQL 容器名称为 `multi-business-crm-postgres`
- 容器内的数据库用户为 `postgres`

## 故障排查

| 问题 | 解决方案 |
|------|---------|
| Docker 未运行 | 启动 Docker Desktop |
| 容器不存在 | 运行 `docker-compose up -d postgres` |
| 权限不足 | 确认 Docker 有访问 `backups/` 目录的权限 |
| 磁盘空间不足 | 清理旧备份文件 |
