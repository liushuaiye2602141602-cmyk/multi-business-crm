# 多业务外贸 CRM 工作台

> 基于 OKKI / 小满外贸 CRM 理念设计，集成 AI 助手、飞书 IM、邮件管理等功能的个人外贸管理系统。

## ✨ 功能特性

### 📊 工作台
- **日程管理** — 月历视图，事件创建、颜色标记、完成标记
- **目标追踪** — 销售目标设定与完成度跟踪
- **数据看板** — 核心指标一览
- **全局搜索** — 快速查找所有数据

### 👥 客户增长
- **线索池** — 管理来自各渠道的潜在客户
- **客户库** — 360° 客户档案
- **客户公海** — 无人负责的客户，支持认领和退回
- **沉睡客户** — 自动检测长期无跟进的客户
- **商机项目** — 管理客户需求、报价阶段和成交状态
- **跟进记录** — 记录每次客户沟通
- **今日任务** — 待办事项管理

### 📋 业务管理
- **报价记录** — 管理报价信息和明细
- **订单管理** — 订单全流程追踪（草稿→确认→生产→发货→完成）
- **财务管理** — 发票管理、收款记录、财务概览
- **产品目录** — 产品信息管理
- **汇率计算器** — 8 种货币实时换算
- **文档资料** — 合同、发票、设计稿等文件管理
- **跟进模板** — 常用外贸话术模板

### 🤖 AI 助手
- **16 种意图识别** — 通过自然语言完成业务操作
- **AI 分析** — 线索分析、客户复盘、项目分析、跟进回复生成
- **AI 设置** — 预设模型一键配置，支持 OpenAI/DeepSeek/Moonshot/MiMo/智谱/通义千问

### 📱 IM 集成（飞书）
- **飞书机器人** — 长连接模式，无需公网域名
- **自然语言操作** — 在飞书中直接创建线索、客户、订单
- **截图识图** — 发送客户资料截图，AI 自动提取信息并录入
- **AI 指令列表**：

| 指令示例 | 功能 |
|---------|------|
| `添加线索，ABC公司，美国，john@abc.com` | 创建线索 |
| `添加客户，XYZ集团，英国` | 创建客户 |
| `建个订单，客户ABC，产品XX，数量100` | 创建订单 |
| `给ABC加跟进：今天电话沟通了价格` | 添加跟进 |
| `ABC公司的订单进度怎么样` | 查询订单 |
| `把订单ORD-000001改成已确认` | 更新订单状态 |
| `ABC公司升级为A级客户` | 更新客户等级 |
| `帮我给ABC公司报个价` | 创建报价单 |
| `查看公海客户` | 查询公海 |
| `认领ABC公司` | 从公海认领客户 |
| `帮助` | 查看所有功能 |

### ✉️ 邮件管理
- **邮件中心** — 收件箱 + 已发送
- **写邮件** — 关联客户/线索发送
- **邮件统计** — 发送量、接收量、送达率
- **SMTP/IMAP 配置** — 支持 Gmail、QQ 邮箱、163 等

### 📈 数据报表
- **销售漏斗** — 线索→客户→项目→成交，各阶段转化率
- **订单趋势** — 近 12 个月订单量和金额
- **客户分布** — 按国家/地区分布
- **来源分析** — 各渠道线索数量对比
- **业务线对比** — 各业务线业绩对比
- **跟进效率** — 本月跟进统计

### 🔗 外部接入
- **Webhook** — 接收来自独立站、n8n 等外部线索
- **接入指南** — 飞书、n8n、独立站、AI 营销系统接入说明

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 16, React 19, Tailwind CSS 4, Lucide Icons |
| 后端 | Next.js API Routes, Prisma ORM |
| 数据库 | PostgreSQL (Docker) |
| AI | OpenAI Compatible API (支持任意兼容模型) |
| IM | 飞书 SDK (长连接模式) |
| 邮件 | Nodemailer (SMTP) + ImapFlow (IMAP) |
| 图表 | Recharts |

## 🚀 本地启动

### 前置要求

- Node.js 18+
- Docker (用于 PostgreSQL)
- npm 或 yarn

### 安装步骤

**1. 克隆项目**

```bash
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
```

**2. 安装依赖**

```bash
npm install
```

**3. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接：

```env
DATABASE_URL="postgresql://postgres:你的密码@localhost:5433/multi_business_crm?schema=public"
```

**4. 启动 PostgreSQL**

```bash
docker run -d \
  --name multi-business-crm-postgres \
  -e POSTGRES_PASSWORD=你的密码 \
  -e POSTGRES_DB=multi_business_crm \
  -p 5433:5432 \
  postgres:16
```

**5. 初始化数据库**

```bash
npx prisma db push
npx prisma generate
```

**6. 导入示例数据（可选）**

```bash
npm run db:seed
```

**7. 启动项目**

```bash
npm run dev
```

访问 http://localhost:3003

### 一键启动（Windows）

双击 `start-crm.bat` 即可自动启动。

## ⚙️ AI 配置

启动后访问 http://localhost:3003/ai-settings，在页面上直接配置：

1. 选择模型提供商（预设：OpenAI、DeepSeek、Moonshot、MiMo、智谱、通义千问）
2. 填入 API Key
3. 点击「测试连接」验证
4. 保存

### .env 方式配置（可选）

```env
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://api.deepseek.com/v1"
AI_API_KEY="sk-xxx"
AI_MODEL="deepseek-chat"

# 视觉模型（用于截图识图，可选）
VISION_API_KEY=sk-xxx
VISION_BASE_URL=https://api.openai.com/v1
VISION_MODEL=gpt-4o
```

## 📱 飞书机器人配置

### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/) → 创建企业自建应用
2. 添加应用能力 → 机器人
3. 权限管理 → 开通 `im:message` 和 `im:message:send_as_bot`

### 2. 配置长连接

1. 事件与回调 → 订阅方式 → 选择「长连接」
2. 添加事件：`im.message.receive_v1`

### 3. 在 CRM 中配置

1. 访问 http://localhost:3003/im-settings
2. 添加飞书平台，填入 App ID 和 App Secret

### 4. 启动机器人

```bash
npm run feishu:bot
```

看到 `✅ 飞书长连接启动中...` 即表示成功。

## 📧 邮件配置

1. 访问 http://localhost:3003/email/settings
2. 配置 SMTP（发送）和 IMAP（接收）
3. Gmail 需使用[应用专用密码](https://myaccount.google.com/apppasswords)

## 📁 项目结构

```
multi-business-crm/
├── app/                     # Next.js 页面
│   ├── (dashboard)/         # 仪表盘路由组
│   │   ├── calendar/        # 日程管理
│   │   ├── customers/       # 客户管理（含公海、沉睡客户）
│   │   ├── orders/          # 订单管理
│   │   ├── finance/         # 财务管理
│   │   ├── email/           # 邮件管理
│   │   ├── reports/         # 数据报表
│   │   ├── goals/           # 目标追踪
│   │   ├── currency/        # 汇率计算器
│   │   ├── ai-settings/     # AI 设置
│   │   ├── im-settings/     # IM 设置
│   │   └── ...
│   └── api/                 # API 路由
├── components/              # React 组件
├── lib/                     # 工具库
│   ├── ai/                  # AI 模块（工具定义、意图解析、执行器）
│   ├── im/                  # IM 模块（飞书工具）
│   ├── prisma.ts            # Prisma 客户端
│   └── ...
├── prisma/                  # 数据库 Schema 和迁移
├── scripts/                 # 脚本
│   └── feishu-bot.ts        # 飞书机器人启动脚本
├── docs/                    # 设计文档
└── .env.example             # 环境变量示例
```

## 🗄️ 数据库备份

```bash
# 备份
docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm > backup.sql

# 恢复
cat backup.sql | docker exec -i multi-business-crm-postgres psql -U postgres multi_business_crm
```

## ⚠️ 注意事项

- `.env` 文件包含敏感信息，请勿提交到公开仓库
- 飞书机器人的 App ID/Secret 请妥善保管
- 建议定期备份数据库
- 首次使用请先配置 AI 和飞书（可选），CRM 基础功能无需 AI 也能正常使用

## 📄 许可证

MIT License
