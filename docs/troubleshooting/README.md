# 问题排查指南

本目录包含 Multi-Business CRM 常见问题的排查方案。

## 问题分类索引

| 文档 | 范围 | 适用场景 |
|------|------|----------|
| [01-installation.md](./01-installation.md) | 安装与启动 | npm ci 失败、Prisma 未生成、端口冲突 |
| [02-database.md](./02-database.md) | 数据库 | 连接失败、迁移错误、种子数据 |
| [03-email.md](./03-email.md) | 邮件系统 | SMTP 认证失败、IMAP 超时、同步问题 |
| [04-ai-api.md](./04-ai-api.md) | AI 与 API | API 401、超时、模型未找到、Guard 拦截 |
| [06-docker.md](./06-docker.md) | Docker 部署 | 容器启动失败、Volume 问题、端口冲突 |
| [07-build-cache.md](./07-build-cache.md) | 构建缓存 | .next 膨胀、tsbuildinfo、Turbopack 缓存 |

## 快速诊断流程

```
问题出现
    │
    ├── 安装/启动失败 → 01-installation.md
    │
    ├── 数据库错误 → 02-database.md
    │
    ├── 邮件功能异常 → 03-email.md
    │
    ├── AI 功能异常 → 04-ai-api.md
    │
    ├── Docker 问题 → 06-docker.md
    │
    └── 构建问题 → 07-build-cache.md
```

## 通用排查步骤

遇到任何问题时，建议先执行以下通用检查：

```bash
# 1. 检查 Node.js 版本
node --version     # 需要 >= 18

# 2. 检查 npm 依赖
npm ls

# 3. 检查 Prisma 状态
npx prisma migrate status

# 4. 检查环境变量
cat .env | grep -v "^#" | grep -v "^$"

# 5. 检查 Docker 状态
docker ps
docker-compose ps

# 6. 查看应用日志
# 开发模式：终端输出
# Docker 模式：docker-compose logs app
```

## 获取帮助

如果本文档未覆盖您的问题：

1. 搜索已有的 GitHub Issues
2. 查看 `docs/` 目录中的相关文档
3. 在 GitHub 上创建新的 Issue，包含：
   - 问题描述
   - 复现步骤
   - 环境信息（Node.js 版本、操作系统、Docker 版本）
   - 相关日志输出
