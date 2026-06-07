# Multi Business CRM

个人多业务外贸 CRM 工作台，基于 OKKI / 小满外贸 CRM 理念设计。

## 核心功能

### 客户增长
- **线索池** - 管理来自独立站、社媒、Webhook、手动开发的潜在客户
- **客户库** - 沉淀有效客户资料，360 度客户档案
- **商机项目** - 管理客户需求、产品项目、报价阶段和成交状态
- **商机漏斗** - 可视化项目阶段分布
- **跟进记录** - 记录每次客户沟通和下一步动作
- **今日任务** - 管理客户跟进任务和逾期提醒

### 业务管理
- **报价记录** - 管理报价信息、金额、状态
- **产品目录** - 管理产品信息
- **跟进模板** - 管理常用外贸跟进话术
- **业务线管理** - 管理多条业务线

### AI 助手
- **AI 测试** - 测试 AI 分析功能
- **AI 分析记录** - 查看所有 AI 分析结果
- **AI 设置** - 配置 AI 连接

### 外部接入
- **外部来源** - 管理 Webhook 外部线索入口
- **Webhook 测试** - 测试 Webhook 接口
- **Webhook 日志** - 查看 Webhook 调用记录
- **接入指南** - n8n、独立站、AI 营销系统接入说明

### 系统工具
- **全局搜索** - 快速查找所有数据
- **数据导入** - CSV 批量导入
- **数据导出** - CSV 批量导出
- **系统健康检查** - 检查系统运行状态
- **维护指南** - 系统维护和备份恢复

## 本地启动

### 方式一：使用启动脚本（推荐）

```bash
# Windows
双击 start-crm.bat
```

### 方式二：手动启动

```bash
# 1. 启动 PostgreSQL 容器
docker start multi-business-crm-postgres

# 2. 启动项目
npm run dev
```

访问地址：http://localhost:3003

## 环境配置

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5433/multi_business_crm?schema=public"

# AI 配置（可选）
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://your-api-url.com/v1"
AI_API_KEY="your-api-key"
AI_MODEL="your-model-name"
```

## 数据库备份

### 备份

```bash
# 使用备份脚本
双击 backup-db.bat

# 手动备份
docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm > backup.sql
```

### 恢复

```bash
# 使用恢复脚本
双击 restore-db.bat

# 手动恢复
cat backup.sql | docker exec -i multi-business-crm-postgres psql -U postgres multi_business_crm
```

## 常见问题

### 端口 3003 被占用

```bash
# 查看占用进程
netstat -ano | findstr :3003

# 关闭进程
taskkill /PID [进程ID] /F
```

### 数据库连接失败

```bash
# 检查容器状态
docker ps

# 启动容器
docker start multi-business-crm-postgres
```

### AI 功能失败

检查 `.env` 文件中 AI 配置是否正确：
- AI_PROVIDER
- AI_BASE_URL
- AI_API_KEY
- AI_MODEL

## 危险命令

**以下命令会导致数据丢失，绝对不要随便执行：**

- `npx prisma db push --force-reset` - 清空数据库
- `npx prisma migrate reset` - 重置数据库
- `docker rm -f multi-business-crm-postgres` - 删除容器

## 正常开发命令

```bash
npx prisma generate    # 生成 Prisma Client
npm run build          # 构建项目
npm run dev            # 启动开发服务器
npx prisma studio      # 打开数据库管理界面
```

## 技术栈

- **前端**: Next.js 15, React 19, Tailwind CSS
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: PostgreSQL (Docker)
- **AI**: OpenAI Compatible API
- **UI**: Lucide Icons, 自定义组件

## 许可证

个人项目，仅供学习使用。
