# API Routes

项目使用 Next.js App Router 的 `app/api/` 目录提供 REST API，共约 47 个路由端点。

## 路由结构

```
app/api/
├── auth/                    # 认证（3 个）
├── ai/                      # AI 功能（7 个）
├── ai-control/              # AI 控制（5 个）
├── email/                   # 邮件（9 个）
├── finance/                 # 财务（5 个）
├── communication/           # 统一消息（3 个）
├── im/                      # IM 机器人（5 个）
├── import/                  # 数据导入（3 个）
├── export/                  # 数据导出（11 个）
├── webhooks/                # 外部 Webhook（1 个）
└── calendar-events/         # 日历事件（1 个）
```

## REST 约定

### HTTP 方法

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 查询资源 | `GET /api/email/accounts` |
| POST | 创建资源 / 触发操作 | `POST /api/ai/analyze-lead` |
| PUT | 更新资源 | `PUT /api/ai-control/settings` |
| DELETE | 删除资源 | `DELETE /api/ai-control/rules/[id]` |

### 路径命名

- 资源名用复数：`/accounts`、`/leads`、`/messages`
- 单个资源用动态段：`/accounts/[id]`、`/rules/[id]`
- 操作类端点用动词：`/send`、`/sync`、`/analyze-lead`

### 响应格式

```json
// 成功
{ "data": [...], "total": 100 }

// 单个资源
{ "data": { "id": "...", "name": "..." } }

// 错误
{ "error": "错误描述" }
```

## 认证

所有 API Route（除 `/api/auth/*` 外）需要 `auth_token` cookie。Middleware 自动拦截未认证请求。

## 路由清单

### Auth — 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### AI — 人工智能

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/analyze-lead` | 线索 AI 分析 |
| POST | `/api/ai/analyze-image` | Vision AI 图片分析 |
| POST | `/api/ai/auto-action` | 自动触发 AI 动作 |
| POST | `/api/ai/chat` | AI 对话 |
| GET | `/api/ai/config` | 获取 AI 配置 |
| POST | `/api/ai/config` | 更新 AI 配置 |
| POST | `/api/ai/sales-suggest` | 销售建议 |
| POST | `/api/ai/test` | 测试 AI 分析 |

### AI Control — AI 控制

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-control/settings` | 获取控制设置 |
| PUT | `/api/ai-control/settings` | 更新控制设置 |
| GET | `/api/ai-control/rules` | 获取策略规则列表 |
| POST | `/api/ai-control/rules` | 创建策略规则 |
| PUT | `/api/ai-control/rules/[id]` | 更新策略规则 |
| DELETE | `/api/ai-control/rules/[id]` | 删除策略规则 |
| GET | `/api/ai-control/logs` | 获取执行日志 |

### Email — 邮件

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/email/accounts` | 获取邮件账户列表 |
| POST | `/api/email/accounts` | 添加邮件账户 |
| PUT | `/api/email/accounts/[id]` | 更新邮件账户 |
| DELETE | `/api/email/accounts/[id]` | 删除邮件账户 |
| POST | `/api/email/send` | 发送邮件 |
| GET | `/api/email/inbox` | 获取收件箱 |
| POST | `/api/email/sync` | 同步邮件 |
| GET | `/api/email/threads` | 获取邮件线程列表 |
| GET | `/api/email/threads/[id]` | 获取线程详情 |
| GET | `/api/email/emails` | 获取邮件列表 |
| GET | `/api/email/config` | 获取邮件配置 |

### Finance — 财务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/finance/invoices` | 获取发票列表 |
| POST | `/api/finance/invoices` | 创建发票 |
| GET | `/api/finance/invoices/[id]` | 获取发票详情 |
| PUT | `/api/finance/invoices/[id]` | 更新发票 |
| GET | `/api/finance/payments` | 获取付款记录 |
| POST | `/api/finance/payments` | 创建付款记录 |

### Communication — 统一消息

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/communication/messages` | 获取消息列表 |
| POST | `/api/communication/messages` | 发送消息 |
| GET | `/api/communication/identity` | 身份解析 |
| GET | `/api/communication/timeline/[customerId]` | 客户时间线 |

### IM — 即时通讯

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/im/feishu/webhook` | 飞书 Webhook 端点 |
| GET | `/api/im/messages` | 获取 IM 消息 |
| POST | `/api/im/messages` | 发送 IM 消息 |
| GET | `/api/im/platforms` | 获取平台列表 |
| POST | `/api/im/platforms` | 添加平台 |
| PUT | `/api/im/platforms/[id]` | 更新平台 |
| DELETE | `/api/im/platforms/[id]` | 删除平台 |

### Import — 数据导入

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/import/leads` | 导入线索 CSV |
| POST | `/api/import/customers` | 导入客户 CSV |
| POST | `/api/import/products` | 导入产品 CSV |

### Export — 数据导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/export/leads` | 导出线索 |
| GET | `/api/export/customers` | 导出客户 |
| GET | `/api/export/products` | 导出产品 |
| GET | `/api/export/quotes` | 导出报价单 |
| GET | `/api/export/projects` | 导出项目 |
| GET | `/api/export/tasks` | 导出任务 |
| GET | `/api/export/follow-ups` | 导出跟进记录 |
| GET | `/api/export/ai-analyses` | 导出 AI 分析 |
| GET | `/api/export/webhook-logs` | 导出 Webhook 日志 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/webhooks/leads` | 外部线索 Webhook |
| GET | `/api/calendar-events` | 日历事件 |

## 添加新 API Route 的模式

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const data = await prisma.example.findMany()
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const data = await prisma.example.create({ data: body })
  return NextResponse.json({ data }, { status: 201 })
}
```
