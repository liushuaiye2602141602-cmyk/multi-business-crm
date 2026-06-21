# Multi Business CRM | 多业务外贸 CRM

> **English** | **中文**

---

## English

A personal multi-business foreign trade CRM workstation, inspired by OKKI/小满 foreign trade CRM design.

### Features

- **Lead Management** - Import, track, and convert leads
- **Customer 360** - Complete customer profile with history
- **Project Pipeline** - Visual project stage management
- **Quote Management** - Create and track quotes
- **Order Management** - From quote to order
- **Follow-up Tracking** - Schedule and track follow-ups
- **Task Management** - Daily tasks and reminders
- **AI Analysis** - AI-powered lead analysis and suggestions
- **Webhook Integration** - Receive leads from external systems
- **Product Catalog** - Manage product information
- **Document Management** - Track related documents
- **CSV Import/Export** - Bulk data operations
- **Global Search** - Search across all data

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/multi-business-crm.git
   cd multi-business-crm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and optional AI config
   ```

4. Start Docker PostgreSQL:
   ```bash
   docker start multi-business-crm-postgres
   ```

5. Initialize database:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

6. Start the application:
   ```bash
   npm run dev
   ```

7. Open http://localhost:3003

### Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Docker)
- **AI**: OpenAI Compatible API

### Environment Variables

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/multi_business_crm?schema=public"

# Optional AI Configuration
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://your-api-url.com/v1"
AI_API_KEY="your-api-key"
AI_MODEL="your-model-name"
```

### Project Structure

```
multi-business-crm/
├── app/                    # Next.js App Router
│   └── (dashboard)/        # Dashboard layout
│       ├── workbench/      # Today's workbench
│       ├── dashboard/      # Data dashboard
│       ├── leads/          # Lead management
│       ├── customers/      # Customer management
│       ├── projects/       # Project pipeline
│       ├── follow-ups/     # Follow-up tracking
│       ├── quotes/         # Quote management
│       ├── orders/         # Order management
│       ├── tasks/          # Task management
│       ├── products/       # Product catalog
│       ├── templates/      # Follow-up templates
│       └── ...             # Other modules
├── components/             # UI components
├── lib/                    # Utilities and services
│   ├── ai/                 # AI integration
│   ├── kernel/             # Execution kernel
│   └── im/                 # IM integration
├── prisma/                 # Database schema and migrations
└── scripts/                # Utility scripts
```

### License

MIT

---

## 中文

个人多业务外贸 CRM 工作台，参考 OKKI/小满 外贸 CRM 设计理念。

### 功能特性

- **线索管理** - 导入、跟踪、转化线索
- **客户 360** - 完整客户档案和历史
- **项目漏斗** - 可视化项目阶段管理
- **报价管理** - 创建和跟踪报价
- **订单管理** - 从报价到订单
- **跟进跟踪** - 安排和跟踪客户跟进
- **任务管理** - 每日任务和提醒
- **AI 分析** - AI 驱动的线索分析和建议
- **Webhook 集成** - 从外部系统接收线索
- **产品目录** - 管理产品信息
- **文档管理** - 跟踪相关文档
- **CSV 导入导出** - 批量数据操作
- **全局搜索** - 跨所有数据搜索

### 快速开始

1. 克隆仓库：
   ```bash
   git clone https://github.com/yourusername/multi-business-crm.git
   cd multi-business-crm
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 设置环境：
   ```bash
   cp .env.example .env
   # 编辑 .env 设置数据库连接和可选 AI 配置
   ```

4. 启动 Docker PostgreSQL：
   ```bash
   docker start multi-business-crm-postgres
   ```

5. 初始化数据库：
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

6. 启动应用：
   ```bash
   npm run dev
   ```

7. 打开 http://localhost:3003

### 技术栈

- **前端**: Next.js 15, React 19, Tailwind CSS
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: PostgreSQL (Docker)
- **AI**: OpenAI Compatible API

### 环境变量

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/multi_business_crm?schema=public"

# 可选 AI 配置
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://your-api-url.com/v1"
AI_API_KEY="your-api-key"
AI_MODEL="your-model-name"
```

### 项目结构

```
multi-business-crm/
├── app/                    # Next.js App Router
│   └── (dashboard)/        # 仪表盘布局
│       ├── workbench/      # 今日工作台
│       ├── dashboard/      # 数据看板
│       ├── leads/          # 线索管理
│       ├── customers/      # 客户管理
│       ├── projects/       # 项目漏斗
│       ├── follow-ups/     # 跟进记录
│       ├── quotes/         # 报价管理
│       ├── orders/         # 订单管理
│       ├── tasks/          # 任务管理
│       ├── products/       # 产品目录
│       ├── templates/      # 跟进模板
│       └── ...             # 其他模块
├── components/             # UI 组件
├── lib/                    # 工具和服务
│   ├── ai/                 # AI 集成
│   ├── kernel/             # 执行内核
│   └── im/                 # IM 集成
├── prisma/                 # 数据库模型和迁移
└── scripts/                # 工具脚本
```

### 许可证

MIT
