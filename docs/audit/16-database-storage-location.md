# 16 - Database Storage Location

> 审计日期：2026-06-19

## 数据库类型

**PostgreSQL 16** (Alpine Linux)

## 连接信息（脱敏）

| 项目 | 值 |
|------|-----|
| 数据库类型 | PostgreSQL |
| 主机类型 | Docker 容器（内部服务名 `db`） |
| 端口 | 5433（宿主机）→ 5432（容器内） |
| 数据库名 | `open_crm` |
| 用户名 | `postgres` |
| 密码 | ***REDACTED*** |
| Schema | `public` |

## 数据保存位置

所有业务数据保存在 **Docker 匿名 Volume** 中：

```
容器路径：/var/lib/postgresql/data
Volume：Docker 自动生成的匿名 Volume（UUID 格式）
```

## 各类数据保存位置

| 数据 | 保存位置 | 说明 |
|------|---------|------|
| Lead 数据 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| Customer 数据 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| Contact 数据 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| Quote 数据 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| Order 数据 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| Task 数据 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| Email 记录 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| AI 日志 | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| ActivityLog | PostgreSQL（Docker Volume） | 通过 Prisma 写入 |
| 多租户数据 | PostgreSQL（Docker Volume） | tenantId 字段隔离 |

## 关键问题回答

| 问题 | 回答 |
|------|------|
| 数据是否存放在项目文件夹中？ | **否**，在 Docker Volume 中 |
| 删除项目文件夹是否丢失数据？ | **否**，数据在 Docker Volume 中 |
| 删除 node_modules 是否影响数据？ | **否** |
| 删除 .next 是否影响数据？ | **否** |
| 重新部署后数据是否保留？ | **取决于 Docker Volume 是否保留** |
| Docker 容器删除后数据是否保留？ | **取决于 Volume 是否删除** |

## ⚠️ 风险：Docker 匿名 Volume

当前使用的是 Docker **匿名 Volume**（UUID 格式），而非**命名 Volume**。

- `docker compose down` → Volume 保留 ✅
- `docker compose down -v` → **数据丢失** ❌
- `docker rm` + `docker volume prune` → **数据丢失** ❌
- `docker system prune --volumes` → **数据丢失** ❌

**建议：** 迁移到命名 Volume（在 docker-compose.yml 中配置 `volumes: postgres_data:/var/lib/postgresql/data`）
