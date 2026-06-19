# 数据库备份

## 备份工具

项目提供 `backup-db.bat` Windows 批处理脚本自动执行备份。

## 备份流程

### 自动备份（推荐）

```bash
# 直接运行备份脚本
backup-db.bat
```

脚本执行步骤：

1. 检查 Docker 是否运行
2. 确保 PostgreSQL 容器已启动
3. 创建 `backups/` 目录（如不存在）
4. 执行 `pg_dump` 导出完整数据库
5. 保存为带时间戳的文件：`backups/crm_backup_YYYYMMDD_HHMMSS.sql`

### 手动备份

```bash
# 1. 确保 PostgreSQL 容器运行中
docker-compose up -d db

# 2. 执行 pg_dump
docker-compose exec db pg_dump -U postgres -d crm > backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 备份文件格式

备份文件为纯 SQL 文本格式（`pg_dump` 默认 plain text），包含：

- 所有表结构（CREATE TABLE）
- 所有数据（INSERT）
- 索引和约束
- 序列

## 备份配置

### 备份目录

默认保存在项目根目录下的 `backups/` 文件夹。确保 `.gitignore` 中包含：

```
backups/
```

### 数据库连接参数

脚本使用 `docker-compose.yml` 中的配置：

| 参数 | 默认值 |
|------|--------|
| 容器名 | db |
| 数据库名 | crm |
| 用户名 | postgres |
| 端口 | 5433 |

## 备份频率建议

| 环境 | 建议频率 | 保留数量 |
|------|----------|----------|
| 开发环境 | 按需 | 5 个 |
| 生产环境 | 每日 | 30 个 |
| 生产环境（高频操作） | 每 12 小时 | 30 个 |

## 备份验证

定期验证备份文件的完整性：

```bash
# 检查备份文件大小（应大于 0）
ls -la backups/*.sql

# 验证 SQL 语法（在临时数据库中恢复测试）
docker-compose exec db createdb -U postgres test_restore
docker-compose exec db psql -U postgres -d test_restore < backups/crm_backup_latest.sql
docker-compose exec db dropdb -U postgres test_restore
```

## 异地备份

生产环境建议将备份同步到异地存储：

```bash
# 示例：使用 rsync 同步到远程服务器
rsync -avz backups/ user@backup-server:/backups/crm/

# 示例：使用 AWS S3
aws s3 sync backups/ s3://your-bucket/crm-backups/
```

## 备份脚本自定义

如果需要自定义备份参数，可以修改 `backup-db.bat`：

```batch
# 常用 pg_dump 参数
--format=custom    # 压缩格式（推荐生产环境使用）
--no-owner         # 不包含所有者信息
--no-privileges    # 不包含权限信息
--verbose          # 显示详细信息
```

使用压缩格式备份：

```bash
docker-compose exec db pg_dump -U postgres -d crm -Fc > backups/crm_backup.dump
```

恢复压缩格式：

```bash
docker-compose exec db pg_restore -U postgres -d crm < backups/crm_backup.dump
```
