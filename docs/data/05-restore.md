# 数据库恢复

## 恢复工具

项目提供 `restore-db.bat` Windows 批处理脚本自动执行恢复。

## 恢复流程

### 自动恢复（推荐）

```bash
# 运行恢复脚本
restore-db.bat
```

脚本执行步骤：

1. 检查 Docker 是否运行
2. 确保 PostgreSQL 容器已启动
3. 列出所有可用备份文件
4. 提示用户选择要恢复的备份文件
5. **要求输入 `YES` 确认**（防止误操作）
6. **自动备份当前数据**（恢复前的安全措施）
7. 执行 `psql` 恢复数据库

### 手动恢复

```bash
# 1. 确保 PostgreSQL 容器运行中
docker-compose up -d db

# 2. （可选）备份当前数据
docker-compose exec db pg_dump -U postgres -d crm > backups/pre_restore_$(date +%Y%m%d_%H%M%S).sql

# 3. 恢复数据库
docker-compose exec db psql -U postgres -d crm < backups/crm_backup_YYYYMMDD_HHMMSS.sql

# 4. 重新生成 Prisma Client（如有 Schema 变更）
npx prisma generate
```

## 恢复前检查

### 确认备份文件

```bash
# 列出所有备份
ls -la backups/

# 检查备份文件大小（确认不是空文件）
ls -lh backups/*.sql

# 查看备份文件内容（前 20 行）
head -20 backups/crm_backup_*.sql
```

### 确认数据库状态

```bash
# 检查当前数据库连接
docker-compose exec db psql -U postgres -d crm -c "SELECT count(*) FROM \"Lead\";"

# 检查数据库版本
docker-compose exec db psql -U postgres -c "SELECT version();"
```

## 恢复后验证

恢复完成后，逐项验证：

### 1. 数据完整性

```bash
# 检查各表数据量
docker-compose exec db psql -U postgres -d crm -c "
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
```

### 2. 应用功能

- [ ] 登录正常
- [ ] 线索列表加载正常
- [ ] 客户列表加载正常
- [ ] 报价单数据正常
- [ ] 订单数据正常
- [ ] AI 功能正常
- [ ] 邮件账户配置保留

### 3. 数据库连接

```bash
# 测试 Prisma 连接
npx prisma db pull --print
```

## 从压缩格式恢复

如果备份使用了 `-Fc`（压缩格式）：

```bash
# pg_dump -Fc 格式的备份
docker-compose exec db pg_restore -U postgres -d crm --verbose < backups/crm_backup.dump
```

## 跨环境恢复

### 从生产恢复到开发

```bash
# 1. 复制生产备份文件到本地 backups/ 目录
# 2. 修改 DATABASE_URL 为本地数据库
# 3. 执行恢复
docker-compose exec db psql -U postgres -d crm < backups/production_backup.sql
```

### 注意事项

- 生产数据可能包含敏感信息
- 确保开发环境的 JWT_SECRET 不会用于验证生产 Token
- 恢复后建议重置所有用户密码

## 常见恢复错误

### 表已存在

```
ERROR: relation "Lead" already exists
```

解决：

```bash
# 先删除数据库再重建
docker-compose exec db dropdb -U postgres crm
docker-compose exec db createdb -U postgres crm
docker-compose exec db psql -U postgres -d crm < backups/crm_backup.sql
```

### 权限错误

```
ERROR: permission denied for schema public
```

解决：

```bash
docker-compose exec db psql -U postgres -c "GRANT ALL ON SCHEMA public TO postgres;"
```

### 编码问题

确保备份和恢复使用相同的编码（UTF-8）：

```bash
docker-compose exec db psql -U postgres -d crm -c "SHOW server_encoding;"
```

## 灾难恢复

如果数据库完全损坏：

```bash
# 1. 停止应用
docker-compose stop app

# 2. 删除损坏的数据
docker-compose down -v

# 3. 重新启动数据库
docker-compose up -d db

# 4. 等待数据库就绪
docker-compose exec db pg_isready

# 5. 从最新备份恢复
docker-compose exec db psql -U postgres -d crm < backups/latest_backup.sql

# 6. 启动应用
docker-compose up -d app

# 7. 验证
```
