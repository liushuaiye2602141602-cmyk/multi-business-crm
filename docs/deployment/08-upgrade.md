# 版本升级

## 升级前准备

### 1. 备份数据库

升级前务必备份数据库，以便出现问题时恢复：

```bash
# Docker 环境
docker compose exec -T db pg_dump -U postgres open_crm > backup_before_upgrade_$(date +%Y%m%d_%H%M%S).sql

# 非 Docker 环境
pg_dump -U postgres open_crm > backup_before_upgrade_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 查看变更日志

```bash
# 查看项目版本
cat VERSION

# 查看变更日志
cat CHANGELOG.md
```

关注以下内容：
- 数据库 schema 变更（需要迁移）
- 环境变量变更（需要更新 .env）
- 破坏性变更（Breaking Changes）
- 新增依赖

### 3. 确认当前状态

```bash
# 查看当前数据库迁移状态
docker compose exec app npx prisma migrate status
```

确认所有迁移已应用，数据库处于最新状态。

## Docker 环境升级

### 拉取最新代码

```bash
git pull origin main
```

### 检查配置变更

```bash
# 对比环境变量变更
diff .env.example .env

# 对比 docker-compose 变更
git diff HEAD~1 docker-compose.yml

# 对比 Dockerfile 变更
git diff HEAD~1 Dockerfile
```

如果 `.env.example` 新增了变量，在 `.env` 中添加对应配置。

### 重新构建并部署

```bash
# 停止当前服务
docker compose down

# 重新构建镜像并启动
docker compose up -d --build
```

### 运行数据库迁移

```bash
# 部署数据库迁移
docker compose exec app npx prisma migrate deploy

# 重新生成 Prisma Client
docker compose exec app npx prisma generate
```

### 验证升级

```bash
# 查看服务状态
docker compose ps

# 查看应用日志
docker compose logs -f app
```

访问应用确认功能正常。

## 非 Docker 环境升级

### 拉取最新代码

```bash
git pull origin main
```

### 安装新依赖

```bash
npm ci
```

### 重新生成 Prisma Client

```bash
npx prisma generate
```

### 运行数据库迁移

```bash
npx prisma migrate deploy
```

### 重新构建

```bash
npm run build
```

### 重启应用

```bash
# 如果使用 PM2
pm2 restart crm

# 如果使用 systemd
sudo systemctl restart crm

# 如果使用 nohup
# 先停止旧进程，再启动新进程
```

## 升级失败回滚

### 数据库回滚

如果数据库迁移导致问题，从备份恢复：

```bash
# Docker 环境
docker compose exec -T db psql -U postgres open_crm < backup_before_upgrade_20260101_120000.sql

# 非 Docker 环境
psql -U postgres open_crm < backup_before_upgrade_20260101_120000.sql
```

### 应用回滚

```bash
# 回退到上一个版本
git log --oneline -5
git checkout <previous-commit-hash>

# 重新构建
docker compose up -d --build
```

## 版本号管理

项目使用语义化版本号（Semantic Versioning）：

| 版本号格式 | 说明 | 示例 |
|-----------|------|------|
| MAJOR.MINOR.PATCH | 主版本.次版本.修订版本 | 0.1.0 |
| MAJOR | 重大变更，可能包含破坏性更新 | 1.0.0 |
| MINOR | 新功能，向后兼容 | 0.2.0 |
| PATCH | Bug 修复 | 0.1.1 |

查看当前版本：

```bash
cat VERSION
```

## 升级检查清单

- [ ] 备份数据库
- [ ] 查看变更日志
- [ ] 确认数据库迁移状态
- [ ] 拉取最新代码
- [ ] 更新 .env（如有新变量）
- [ ] 重新构建应用
- [ ] 运行数据库迁移
- [ ] 验证应用功能
- [ ] 监控应用日志

## 常见问题

### 迁移冲突

如果数据库已手动修改过 schema，可能与迁移文件冲突：

```bash
# 查看迁移状态
npx prisma migrate status

# 如果有失败的迁移，手动解决冲突后标记为已应用
npx prisma migrate resolve --applied <migration_name>
```

### Prisma Client 版本不匹配

升级后如果出现 Prisma Client 相关错误：

```bash
# 删除旧的生成文件
rm -rf lib/generated/prisma

# 重新生成
npx prisma generate
```

### 构建缓存问题

如果升级后出现异常行为，清除构建缓存：

```bash
# 清除 Next.js 缓存
rm -rf .next

# 清除 Docker 构建缓存
docker builder prune

# 重新构建
docker compose up -d --build
```
