# 项目结构

Multi-Business CRM 基于 Next.js 16 App Router 构建，目录结构如下。

## 根目录概览

```
multi-business-crm/
├── app/                    # Next.js App Router 页面和 API
├── components/             # React 组件（UI 原语 + 业务组件）
├── lib/                    # 核心库代码（Prisma、AI、Auth、事件等）
├── prisma/                 # Prisma Schema 和迁移文件
├── scripts/                # 辅助脚本
├── docs/                   # 项目文档
├── public/                 # 静态资源
├── backups/                # 数据库备份文件（gitignore）
├── .env.example            # 环境变量模板
├── docker-compose.yml      # Docker 编排配置
├── Dockerfile              # 容器构建文件
├── middleware.ts            # Next.js 认证中间件
├── prisma.config.ts        # Prisma 配置（加载 .env）
├── backup-db.bat           # Windows 备份脚本
├── restore-db.bat          # Windows 恢复脚本
├── package.json            # 依赖和脚本
├── VERSION                 # 版本号文件
├── CHANGELOG.md            # 变更日志
└── tsconfig.json           # TypeScript 配置
```

## app/ — 页面和路由

采用 Next.js 16 App Router 的 `(dashboard)` 路由组。

```
app/
├── (dashboard)/              # 主布局路由组
│   ├── layout.tsx            # Dashboard 共享布局（Header + Sidebar）
│   ├── dashboard/            # 首页仪表盘
│   ├── leads/                # 线索管理（CRUD + 详情页 + 编辑页）
│   ├── customers/            # 客户管理（含公海池、休眠客户）
│   ├── contacts/             # 联系人管理
│   ├── projects/             # 项目管理（含管道视图）
│   ├── quotes/               # 报价单（含嵌套报价项）
│   ├── orders/               # 订单（含嵌套订单项）
│   ├── tasks/                # 任务管理
│   ├── follow-ups/           # 跟进记录
│   ├── products/             # 产品目录
│   ├── business-lines/       # 业务线管理
│   ├── templates/            # 跟进模板
│   ├── documents/            # 文档管理
│   ├── email/                # 邮件（收件箱、撰写、账户、统计、线程）
│   ├── calendar/             # 日历视图
│   ├── reports/              # 报表（图表）
│   ├── finance/              # 财务（发票、付款）
│   ├── goals/                # 销售目标
│   ├── ai-analyses/          # AI 分析结果
│   ├── ai-control-panel/     # AI 控制面板
│   ├── ai-settings/          # AI 配置
│   ├── ai-test/              # AI 测试界面
│   ├── external-sources/     # 外部来源管理
│   ├── webhook-logs/         # Webhook 日志
│   ├── webhook-test/         # Webhook 测试
│   ├── imports/              # 数据导入
│   ├── exports/              # 数据导出
│   ├── activity-logs/        # 活动日志
│   ├── search/               # 全局搜索
│   ├── settings/             # 系统设置
│   ├── system-health/        # 系统健康检查
│   ├── workbench/            # 工作台
│   ├── integration-guides/   # 集成指南（n8n、飞书、Docker 等）
│   └── maintenance-guide/    # 维护指南
├── api/                      # API Routes（详见 05-api-routes.md）
├── login/                    # 登录页
├── layout.tsx                # 根布局
├── globals.css               # 全局样式
└── not-found.tsx             # 404 页面
```

## components/ — 组件库

全部手写，无第三方 UI 库依赖。

```
components/
├── ui/                       # UI 原语组件
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── CopyButton.tsx
│   ├── DataTable.tsx
│   ├── DetailField.tsx
│   ├── EmptyState.tsx
│   ├── FormField.tsx
│   └── StatusBadge.tsx
├── Header.tsx                # 顶部导航
├── Sidebar.tsx               # 侧边栏导航
├── PageHeader.tsx            # 页面标题区
├── RightPanel.tsx            # 右侧面板
├── StatCard.tsx              # 统计卡片
├── Badge.tsx                 # 标签
├── SearchFilterBar.tsx       # 搜索过滤栏
├── SearchInput.tsx           # 搜索输入
├── CsvImportButton.tsx       # CSV 导入按钮
├── CurrencyPopup.tsx         # 币种选择弹窗
├── ConfirmDeleteButton.tsx   # 删除确认按钮
├── ImportSection.tsx         # 导入区域
├── LogoutButton.tsx          # 退出按钮
├── GenerateApiKeyButton.tsx  # API Key 生成按钮
├── WebhookTestForm.tsx       # Webhook 测试表单
├── ScheduleWidget.tsx        # 日程组件
├── CustomerTimeline.tsx      # 客户时间线
├── LeadForm.tsx              # 线索表单
├── CustomerForm.tsx          # 客户表单
├── ContactForm.tsx           # 联系人表单
├── ProjectForm.tsx           # 项目表单
├── QuoteForm.tsx             # 报价表单
├── QuoteItemForm.tsx         # 报价项表单
├── OrderForm.tsx             # 订单表单
├── OrderItemForm.tsx         # 订单项表单
├── ProductForm.tsx           # 产品表单
├── TaskForm.tsx              # 任务表单
├── FollowUpForm.tsx          # 跟进表单
├── TemplateForm.tsx          # 模板表单
├── DocumentForm.tsx          # 文档表单
├── ExternalSourceForm.tsx    # 外部来源表单
├── AIAnalysisButton.tsx      # AI 分析按钮
├── AIAnalysisResult.tsx      # AI 分析结果展示
├── AIAnalyzeButton.tsx       # AI 分析触发按钮
├── AISalesButton.tsx         # AI 销售建议按钮
├── AITestForm.tsx            # AI 测试表单
└── TemplateAISection.tsx     # 模板 AI 区域
```

## lib/ — 核心库

```
lib/
├── prisma.ts                # Prisma Client 单例（PrismaPg adapter）
├── auth.ts                  # JWT 认证（hashPassword, verifyToken, requireAuth）
├── activity-log.ts          # 活动日志记录（"use server"）
├── enums.ts                 # 枚举标签映射、选项数组、状态颜色（270 行）
├── format.ts                # 格式化工具（日期、金额、枚举标签、报价编号生成）
├── email.ts                 # 旧版邮件（已废弃，迁移到 lib/email/service.ts）
├── webhook.ts               # API Key 生成、哈希、验证
├── events/
│   └── bus.ts               # Event Bus — 事件分发和 ActivityLog
├── ai/
│   ├── core.ts              # AI 入口：analyze / decide / execute / log
│   ├── client.ts            # OpenAI 兼容 HTTP 客户端（60s 超时）
│   ├── types.ts             # AI 类型定义、配置读取
│   ├── parser.ts            # AI JSON 响应解析器
│   ├── prompts.ts           # 5 个 Prompt 构建器 + 行业特定 Prompt
│   ├── crm-analyzer.ts      # 规则评分（无 LLM 依赖）
│   ├── vision.ts            # Vision AI 图片识别
│   ├── intent.ts            # LLM Function Calling 意图解析
│   ├── tools.ts             # 16 个 IM Bot 工具定义
│   ├── executor.ts          # 意图执行引擎
│   ├── actions.ts           # AI Server Actions（11 个）
│   ├── control/
│   │   └── guard.ts         # AI 权限守卫（5 步检查）
│   └── agents/
│       ├── index.ts         # Agent 导出
│       ├── sales-agent.ts   # 销售建议生成
│       ├── deal-scoring-agent.ts  # 成交概率评分
│       └── followup-agent.ts      # 自动跟进任务
├── domain/
│   └── auto-tasks.ts        # 自动任务创建逻辑
├── email/
│   └── service.ts           # 现代邮件服务（IMAP/SMTP）
├── communication/
│   └── message-service.ts   # 统一消息服务
├── im/
│   └── feishu.ts            # 飞书签名验证 + 消息发送
└── generated/
    └── prisma/              # Prisma 生成客户端（不要手动编辑）
```

## prisma/ — 数据库

```
prisma/
├── schema.prisma            # 数据库模型定义（1187 行，34 个 Model，26 个 Enum）
└── migrations/              # 数据库迁移文件
```

## scripts/ — 辅助脚本

```
scripts/
└── (辅助脚本)
```

## 文件数量统计

| 目录 | 估计文件数 | 说明 |
|------|-----------|------|
| app/(dashboard)/ | 100+ 页面 | 含列表、详情、编辑、内联 actions |
| app/api/ | 47 路由 | REST API 端点 |
| components/ | 46 | UI 组件 |
| lib/ | 25+ | 核心库文件 |
| prisma/ | schema + migrations | 数据模型和迁移 |
| docs/ | 80+ | 已有文档 |
