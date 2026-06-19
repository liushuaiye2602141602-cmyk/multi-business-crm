# 17 - Docker Data Persistence

> 审计日期：2026-06-19

## Docker 配置

| 项目 | 配置 |
|------|------|
| PostgreSQL 服务名 | `db` |
| 容器名 | `crm-postgres` |
| 镜像 | `postgres:16-alpine` |
| 数据挂载 | `/var/lib/postgresql/data` |

## Volume 分析

| 检查项 | 结果 |
|--------|------|
| 是否配置 named volume | ❌ 否（docker-compose.yml 中无 volumes 定义） |
| Volume 名称 | Docker 自动生成的 UUID 匿名 Volume |
| 挂载路径 | `/var/lib/postgresql/data` |
| 是否使用本机绑定目录 | ❌ 否 |
| docker compose down 后是否保留 | ✅ 是（匿名 Volume 默认保留） |
| docker compose down -v 后是否保留 | ❌ **否，数据会丢失** |
| 数据是否仅在容器内 | ❌ 在匿名 Volume 中，容器删除后仍保留 |

## 当前 Docker Volume 状态

```
匿名 Volume：88d1123cf129c6ad76812e05c36314d774416e98d85ad8e296f5e9e5000c4abc
挂载路径：/var/lib/postgresql/data
状态：运行中
```

## 风险评估

| 场景 | 风险 | 说明 |
|------|------|------|
| `docker compose down` | 🟢 安全 | Volume 保留 |
| `docker compose down -v` | 🔴 **高风险** | Volume 被删除，数据丢失 |
| `docker rm crm-postgres` | 🟢 安全 | Volume 保留 |
| `docker volume prune` | 🔴 **高风险** | 未使用的 Volume 被清理 |
| `docker system prune --volumes` | 🔴 **高风险** | 所有 Volume 被清理 |
| 电脑重装系统 | 🔴 **高风险** | Docker Volume 随系统丢失 |

## 备份脚本分析

| 脚本 | 功能 | 状态 |
|------|------|------|
| `backup-db.bat` | `pg_dump` 导出 SQL 文件到 `backups/` 目录 | ✅ 可用 |
| `restore-db.bat` | 从 SQL 文件恢复到数据库 | ✅ 可用 |

**注意：** 备份脚本导出的是 SQL 文件到项目目录的 `backups/` 文件夹，但该文件夹不存在且未被 Git 跟踪。备份文件会随项目目录一起保存。

## 结论

**风险级别：🟡 中等**

数据存储在 Docker 匿名 Volume 中，`docker compose down` 不会丢失数据。但如果执行 `docker compose down -v` 或 `docker volume prune`，数据会永久丢失。建议迁移到命名 Volume。
