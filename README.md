# Open CRM System

一个基于 Next.js + TypeScript + Prisma + PostgreSQL 构建的现代化开源 CRM 系统模板。

[English](README.en.md) | 中文

## 项目截图

> 截图待补充

## 核心功能

### 工作台
- 日程管理（周/月/列表视图）
- 目标追踪与完成度
- 数据看板（转化漏斗、收入统计）
- 全局搜索

### 客户增长
- 线索管理（状态流转：新建 → 联系 → 合格 → 转化/流失）
- 客户库（360° 档案）
- 客户公海（认领/退回）
- 沉睡客户检测（60天未跟进）
- 联系人管理
- 商机项目管理
- 跟进记录与任务

### 业务管理
- 报价管理（含明细项、状态流转）
- 订单管理（草稿 → 确认 → 生产 → 发货 → 完成）
- 产品目录
- 文档管理
- 跟进模板
- 业务线管理
- 汇率计算器（40+ 种货币）

### 财务管理
- 发票管理（草稿 → 已发 → 已付 → 逾期）
- 收款记录
- 财务概览

### 数据报表
- 销售漏斗
- 订单趋势
- 客户分布
- 来源分析
- 业务线对比
- 跟进效率

### AI 系统
- AI Core Engine（统一入口）
- AI Control Guard（执行守卫）
- 16 种自然语言意图
- AI 评分与分析
- 自动任务生成
- AI 控制面板（开关/模式/策略）

### 邮件系统
- 多账号支持（Gmail/Outlook/阿里/网易/自定义）
- SMTP 发送 / IMAP 接收
- 邮件线程
- 邮件统计
- CRM 自动绑定

### IM 集成
- 飞书机器人（长连接模式）
- 自然语言操作
- 截图识图
- 统一消息模型

### 外部接入
- Webhook 支持
- 外部来源管理
- 接入指南（n8n、独立站）

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| 后端 | Next.js API Routes, Prisma ORM |
| 数据库 | PostgreSQL 16 (Docker) |
| AI | OpenAI 兼容 API |
| 邮件 | Nodemailer + ImapFlow |
| IM | 飞书 SDK（长连接模式） |
| 认证 | JWT + bcryptjs |
| 部署 | Docker Compose |

## 快速开始

### 环境要求

- Node.js 18+
- Docker 和 Docker Compose
- npm 或 yarn

### 安装步骤

**Windows (PowerShell):**

```powershell
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
npm install
Copy-Item .env.example .env
# 编辑 .env，设置数据库密码
docker run -d --name open-crm-postgres -e POSTGRES_PASSWORD=YOUR_PASSWORD -e POSTGRES_DB=open_crm -p 5433:5432 postgres:16
npx prisma generate
npx prisma db push
npm run dev
```

**Linux/macOS (Bash):**

```bash
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
npm install
cp .env.example .env
# 编辑 .env，设置数据库密码
docker run -d --name open-crm-postgres -e POSTGRES_PASSWORD=YOUR_PASSWORD -e POSTGRES_DB=open_crm -p 5433:5432 postgres:16
npx prisma generate
npx prisma db push
npm run dev
```

访问 http://localhost:3003

### 默认测试账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | password123 | 管理员 |

> 生产环境必须修改默认密码

### Docker 快速启动

```bash
cp .env.example .env
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

## 项目结构

```
├── app/                    # Next.js 页面和 API
│   ├── (dashboard)/        # 仪表盘路由组（100+ 页面）
│   ├── api/                # API 路由（47 个端点）
│   └── login/              # 登录页
├── components/             # React 组件（46 个）
├── lib/                    # 工具库
│   ├── ai/                 # AI Core Engine + Agents + Control
│   ├── communication/      # 统一通信服务
│   ├── email/              # 邮件服务
│   ├── im/                 # 飞书集成
│   ├── events/             # Event Bus
│   └── generated/prisma/   # Prisma 生成代码（可重新生成）
├── prisma/                 # 数据库 Schema + 迁移
├── scripts/                # 工具脚本
├── docs/                   # 文档
└── public/                 # 静态资源
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

| 变量 | 必填 | 说明 |
|------|------|------|
| DATABASE_URL | 是 | PostgreSQL 连接字符串 |
| JWT_SECRET | 是 | JWT 签名密钥 |
| APP_URL | 否 | 应用地址（默认 http://localhost:3003） |

## AI 配置

访问 http://localhost:3003/ai-settings 配置 AI 模型（可选）。

支持 OpenAI、DeepSeek、Moonshot、MiMo、智谱、通义千问等。

## 邮箱配置

访问 http://localhost:3003/email/accounts 添加邮箱账号。

支持 Gmail、Outlook、阿里企业邮箱、腾讯企业邮箱等。

## 飞书机器人

```bash
npm run feishu:bot
```

## 数据存储

- **业务数据**：PostgreSQL（Docker Volume）
- **文件上传**：当前未实现（需接入对象存储）
- **缓存**：`.next/`（可删除重建）
- **依赖**：`node_modules/`（可重新安装）

## 安全

- `.env` 不提交到 GitHub
- 生产环境必须更换默认密码
- 邮箱密码建议使用应用专用密码
- API Key 建议使用环境变量

## 文档

- [完整文档](docs/README.md)
- [快速开始](docs/getting-started/)
- [用户手册](docs/user-guide/)
- [API 文档](docs/api/)
- [部署指南](docs/deployment/)
- [贡献指南](CONTRIBUTING.md)
- [路线图](ROADMAP.md)

## 许可证

MIT License
