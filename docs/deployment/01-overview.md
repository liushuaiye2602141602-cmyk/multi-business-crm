# 部署概览

## 部署方案对比

| 方案 | 适用场景 | 复杂度 | 数据库 |
|------|----------|--------|--------|
| [Docker Compose](02-docker.md) | 个人服务器、小团队 | 低 | 容器内 PostgreSQL |
| [Ubuntu VPS + Docker](03-ubuntu-vps.md) | 生产环境、需要域名 | 中 | 容器内 PostgreSQL |
| Vercel | 快速原型验证 | 低 | 外部 PostgreSQL |

## 推荐方案

### 首选：Docker Compose + VPS

这是推荐的生产部署方案，使用项目提供的 `Dockerfile` 和 `docker-compose.yml`，在 VPS 上一键部署：

```bash
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
cp .env.example .env
# 编辑 .env 设置生产环境变量
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

**优势：**
- 与本地开发环境一致
- 数据库和应用都在服务器上
- 部署和升级流程简单
- 适合中小规模使用

### 替代方案：Vercel

Vercel 部署适用于快速演示和测试，但有以下限制：

**限制：**

- 不支持长时运行的后台任务
- Serverless 函数有执行时间限制（默认 10 秒）
- 需要外部 PostgreSQL 数据库（如 Supabase、Neon、Vercel Postgres）
- Prisma migrations 需要单独执行
- 不支持 WebSocket 连接
- 文件存储需要外部服务（S3 等）

**Vercel 部署步骤：**

1. 推送代码到 GitHub
2. 在 Vercel Dashboard 导入项目
3. 配置环境变量 `DATABASE_URL` 和 `JWT_SECRET`
4. 配置外部 PostgreSQL 数据库
5. 部署

> 如果选择 Vercel，需要同步调整 AI 功能、IM 集成等模块的部署策略。

## 项目文件说明

项目提供了以下部署相关文件：

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 多阶段构建配置（deps -> builder -> runner） |
| `docker-compose.yml` | 服务编排（PostgreSQL + 应用） |
| `.dockerignore` | Docker 构建排除文件 |
| `.env.example` | 环境变量模板 |
| `backup-db.bat` | 数据库备份脚本（Windows） |
| `restore-db.bat` | 数据库恢复脚本（Windows） |
| `start-crm.bat` | Windows 快速启动脚本 |

## 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Next.js | 16.2.7 | 应用框架（standalone 模式） |
| PostgreSQL | 16 | 数据库 |
| Prisma | 7.8.0 | ORM |
| Docker | 20.10+ | 容器化 |
| Nginx | latest | 反向代理（可选） |

## 部署检查清单

在部署前，确认以下项目已准备就绪：

- [ ] 服务器满足最低系统要求（2GB RAM, 20GB 磁盘）
- [ ] Docker 和 Docker Compose 已安装
- [ ] `.env` 文件已配置（生产密码、JWT_SECRET、APP_URL）
- [ ] 域名已解析到服务器 IP（如需 HTTPS）
- [ ] 防火墙已开放 80、443 端口
- [ ] 数据库备份策略已制定

详细部署步骤请参考对应章节：
- [Docker 部署](02-docker.md) -- 完整 Docker 部署指南
- [Ubuntu VPS 部署](03-ubuntu-vps.md) -- Ubuntu 服务器部署
- [Nginx 反向代理](05-reverse-proxy.md) -- 配置反向代理
- [HTTPS 配置](06-https.md) -- 配置 SSL/TLS
- [生产环境](07-production-environment.md) -- 生产环境清单
