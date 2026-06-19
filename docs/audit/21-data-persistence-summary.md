# 21 - Data Persistence Summary

> 审计日期：2026-06-19

## 用简单语言回答所有问题

### 1. 新增的客户数据保存在哪里？

保存在 **PostgreSQL 数据库**中，数据库运行在 **Docker 容器**里，数据存储在 **Docker 匿名 Volume** 中。

### 2. 报价和订单数据保存在哪里？

同上，保存在 PostgreSQL 数据库中（Docker Volume）。

### 3. 邮件数据保存在哪里？

保存在 PostgreSQL 数据库中（EmailMessage 表）。

### 4. AI 执行日志保存在哪里？

保存在 PostgreSQL 数据库中（AIExecutionLog、AILog 表）。

### 5. 上传的附件保存在哪里？

**当前没有文件上传功能。** Document 模型有字段但无上传实现。

### 6. 数据是否保存在 D 盘项目目录里？

**否。** 数据保存在 Docker 管理的 Volume 中，不在 `D:\web_project\multi-business-crm` 目录内。

### 7. 删除 D:\web_project\multi-business-crm 会不会丢数据？

**不会丢失数据库数据。** 但会丢失：
- 项目代码
- `.env` 配置
- `backups/` 目录中的备份文件（如果存在）
- Docker Compose 配置

### 8. 删除 .next 会不会丢业务数据？

**不会。** `.next` 只是 Next.js 的编译缓存，不含任何业务数据。

### 9. 删除 node_modules 会不会丢业务数据？

**不会。** `node_modules` 只是 npm 依赖包，不含任何业务数据。

### 10. 电脑重装系统后数据是否还在？

**取决于 Docker Volume 是否被保留。** 如果重装系统时保留了 Docker 数据，数据仍在。如果 Docker 被完全清除，数据丢失（除非之前执行过备份脚本）。

### 11. 项目部署到服务器后数据保存在哪里？

取决于部署方式：
- **Docker 部署**：Docker Volume（需配置命名 Volume）
- **Vercel 部署**：需使用外部数据库（如 Vercel Postgres、Supabase）
- **VPS 部署**：Docker Volume 或本地 PostgreSQL

### 12. 当前存储架构是否安全？

**🟡 中等风险。** 数据库使用 Docker 匿名 Volume，无自动备份，无异地备份。生产环境需要迁移。

### 13. 当前是否缺少文件存储模块？

**是，完全缺失。** 无文件上传、无对象存储集成、无附件管理。

### 14. 当前是否缺少数据库备份机制？

**有手动备份脚本，但缺少自动备份。** `backup-db.bat` 可用，但需要手动执行。

### 15. 当前是否缺少附件备份机制？

**是，完全缺失。** 无文件存储功能，无需附件备份。

### 16. 当前最大的丢失数据风险是什么？

**Docker 匿名 Volume 被误删。** 如果执行 `docker compose down -v` 或 `docker volume prune`，所有数据永久丢失且无法恢复。

### 17. 上线前必须补齐哪些存储能力？

| 优先级 | 能力 | 说明 |
|--------|------|------|
| P0 | 命名 Docker Volume | 防止 Volume 被误删 |
| P0 | 自动数据库备份 | 每日定时 pg_dump |
| P0 | 文件存储模块 | 对象存储集成 |
| P1 | 异地备份 | 备份到云端 |
| P1 | 备份验证 | 定期测试恢复 |
| P2 | 加密备份 | SQL 文件加密 |

---

## 最终回答

| 问题 | 答案 |
|------|------|
| 当前数据库类型 | PostgreSQL 16 |
| 数据库实际保存位置 | Docker 匿名 Volume |
| 文件实际保存位置 | 无文件存储功能 |
| 删除项目目录是否会丢失数据 | 数据库数据不会，但代码和配置会丢失 |
| 当前缺失的存储能力 | 文件上传/存储、自动备份、异地备份 |
| P0 风险 | Docker 匿名 Volume 可能被误删导致数据永久丢失 |
| 建议的生产环境存储方案 | 云数据库（RDS）+ 对象存储（R2/OSS）+ 自动备份 |
