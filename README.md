<div align="center">

# Open CRM System

**一个现代化的开源 CRM 系统模板**

A Modern Open-Source CRM System Template

---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)](https://tailwindcss.com/)

**[English](#english)** | **[中文](#中文)**

</div>

---

<a name="中文"></a>

## 🇨🇳 中文

### 📖 项目简介

Open CRM System 是一个基于 Next.js + TypeScript + Prisma + PostgreSQL 构建的现代化开源 CRM 系统模板。灵活可定制，适用于任何行业和业务模式。

### ✨ 功能模块

| 模块 | 功能 |
|------|------|
| 📊 **工作台** | 日程管理、目标追踪、数据看板、全局搜索 |
| 👥 **客户增长** | 线索池、客户库、联系人、商机项目、跟进记录、今日任务 |
| 🏊 **客户公海** | 公海管理、认领/退回、沉睡客户检测 |
| 📋 **业务管理** | 报价记录、订单管理、产品目录、跟进模板、文档管理 |
| 💰 **财务管理** | 发票管理、收款记录、财务概览 |
| 📈 **数据报表** | 销售漏斗、订单趋势、客户分布、来源分析、业务线对比 |
| 🤖 **AI 助手** | 16 种自然语言意图、AI 分析、截图识图、自动分析线索 |
| 📱 **IM 集成** | 飞书机器人（长连接）、自然语言操作、截图识别 |
| ✉️ **邮件管理** | SMTP 发送、IMAP 接收、邮件统计 |
| 🔗 **外部接入** | Webhook、n8n 集成、接入指南 |

### 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| 后端 | Next.js API Routes, Prisma ORM |
| 数据库 | PostgreSQL (Docker) |
| AI | OpenAI 兼容 API |
| 邮件 | Nodemailer + ImapFlow |
| IM | 飞书 SDK（长连接模式） |

### 🚀 快速开始

#### 环境要求
- Node.js 18+
- Docker
- npm

#### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/liushuaiye2602141602-cmyk/multi-business-crm.git
cd multi-business-crm

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库密码

# 4. 启动 PostgreSQL
docker run -d \
  --name open-crm-postgres \
  -e POSTGRES_PASSWORD=你的密码 \
  -e POSTGRES_DB=open_crm \
  -p 5433:5432 \
  postgres:16

# 5. 初始化数据库
npx prisma db push
npx prisma generate

# 6. 导入示例数据（可选）
npm run db:seed

# 7. 启动项目
npm run dev
```

访问 http://localhost:3003

#### Windows 一键启动

双击 `start-crm.bat` 即可。

### 📁 项目结构

```
├── app/                    # Next.js 页面和 API 路由
│   ├── (dashboard)/        # 仪表盘路由组
│   │   ├── calendar/       # 日程管理
│   │   ├── customers/      # 客户管理（含公海、沉睡客户）
│   │   ├── orders/         # 订单管理
│   │   ├── finance/        # 财务管理
│   │   ├── email/          # 邮件管理
│   │   ├── reports/        # 数据报表
│   │   ├── goals/          # 目标追踪
│   │   └── ...
│   └── api/                # API 路由
├── components/             # React 组件
├── lib/                    # 工具库（AI、IM、邮件、Prisma）
├── prisma/                 # 数据库 Schema 和迁移
├── scripts/                # 工具脚本
└── public/                 # 静态资源
```

### 🤖 AI 指令（飞书）

| 指令示例 | 功能 |
|---------|------|
| `添加线索，ABC公司，美国，john@abc.com` | 创建线索 |
| `添加客户，XYZ集团，英国` | 创建客户 |
| `建个订单，客户ABC，产品XX，数量100` | 创建订单 |
| `给ABC加跟进：今天电话沟通了价格` | 添加跟进 |
| `把订单ORD-000001改成已确认` | 更新订单状态 |
| `查看公海客户` | 查询公海 |
| `帮助` | 查看所有功能 |

### 📄 文档

- [贡献指南](CONTRIBUTING.md)
- [路线图](ROADMAP.md)
- [版本策略](docs/architecture/versioning-strategy.md)
- [v0.1.0 Release Notes](docs/releases/v0.1.0.md)

### 📄 许可证

[MIT License](LICENSE)

---

<a name="english"></a>

## 🇬🇧 English

### 📖 About

Open CRM System is a modern, open-source CRM template built with Next.js, TypeScript, Prisma, and PostgreSQL. Designed for flexibility — customize it for any industry or business model.

### ✨ Features

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Calendar, goal tracking, data overview, global search |
| 👥 **Lead & Customer** | Lead pipeline, customer profiles, contacts, opportunities, follow-ups, tasks |
| 🏊 **Customer Pool** | Public pool, claim/return, dormant customer detection |
| 📋 **Sales** | Quotes, orders, product catalog, templates, documents |
| 💰 **Finance** | Invoices, payment tracking, financial overview |
| 📈 **Reports** | Sales funnel, order trends, customer distribution, source analysis |
| 🤖 **AI Assistant** | 16 natural language intents, AI analysis, vision OCR, auto-analysis |
| 📱 **IM Integration** | Feishu bot (long connection), natural language commands, screenshot recognition |
| ✉️ **Email** | SMTP sending, IMAP receiving, email statistics |
| 🔗 **External** | Webhook, n8n integration, integration guides |

### 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Docker) |
| AI | OpenAI-compatible API |
| Email | Nodemailer + ImapFlow |
| IM | Feishu SDK (Long Connection) |

### 🚀 Quick Start

#### Prerequisites
- Node.js 18+
- Docker
- npm

#### Installation

```bash
# 1. Clone the repository
git clone https://github.com/liushuaiye2602141602-cmyk/multi-business-crm.git
cd multi-business-crm

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database password

# 4. Start PostgreSQL
docker run -d \
  --name open-crm-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=open_crm \
  -p 5433:5432 \
  postgres:16

# 5. Initialize database
npx prisma db push
npx prisma generate

# 6. (Optional) Seed demo data
npm run db:seed

# 7. Start development server
npm run dev
```

Visit http://localhost:3003

#### Windows Quick Start

Double-click `start-crm.bat`.

### 📁 Project Structure

```
├── app/                    # Next.js pages and API routes
│   ├── (dashboard)/        # Dashboard route group
│   │   ├── calendar/       # Calendar management
│   │   ├── customers/      # Customer management + pool + dormant
│   │   ├── orders/         # Order management
│   │   ├── finance/        # Invoice & payment management
│   │   ├── email/          # Email center + stats
│   │   ├── reports/        # Data reports with charts
│   │   ├── goals/          # Sales goal tracking
│   │   └── ...
│   └── api/                # API routes
├── components/             # React components
├── lib/                    # Utilities (AI, IM, email, Prisma)
├── prisma/                 # Database schema and migrations
├── scripts/                # Utility scripts
└── public/                 # Static assets
```

### 🤖 AI Commands (Feishu)

| Command Example | Action |
|----------------|--------|
| `Add lead, ABC Corp, USA, john@abc.com` | Create lead |
| `Add customer, XYZ Group, UK` | Create customer |
| `Create order for ABC, product XX, qty 100` | Create order |
| `Add follow-up for ABC: called about pricing` | Add follow-up |
| `Mark order ORD-000001 as confirmed` | Update order status |
| `Show pool customers` | Query customer pool |
| `Help` | Show all commands |

### 📄 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)
- [Versioning Strategy](docs/architecture/versioning-strategy.md)
- [v0.1.0 Release Notes](docs/releases/v0.1.0.md)

### 📄 License

[MIT License](LICENSE)

---

<div align="center">

**[↑ 回到顶部 Back to Top](#open-crm-system)**

Made with ❤️ by the Open CRM Community

</div>
