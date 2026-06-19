# 数据库设置

## PostgreSQL 版本

推荐 PostgreSQL 16，最低支持 14。

## Docker 方式（推荐）

```bash
docker run -d \
  --name open-crm-postgres \
  -e POSTGRES_PASSWORD=YOUR_PASSWORD \
  -e POSTGRES_DB=open_crm \
  -p 5433:5432 \
  postgres:16
```

## 数据库连接

编辑 `.env`：

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/open_crm?schema=public"
```

## 初始化

```bash
npx prisma generate    # 生成 Prisma Client
npx prisma db push     # 推送数据库结构
```

## 常用命令

| 命令 | 用途 | 风险 |
|------|------|------|
| `npx prisma generate` | 生成客户端 | 安全 |
| `npx prisma db push` | 推送结构变更 | 中等（开发环境） |
| `npx prisma migrate dev` | 创建迁移 | 安全（开发环境） |
| `npx prisma migrate deploy` | 部署迁移 | 安全 |
| `npx prisma studio` | 数据库管理界面 | 安全 |

## 禁止在生产环境执行

以下命令会清空数据库，生产环境严禁使用：

- `npx prisma migrate reset` — 会清空数据库
- `npx prisma db push --force-reset` — 会清空数据库
