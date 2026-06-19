# AI 系统概览 (AI Overview)

## 系统架构

AI 系统由四个核心组件构成，协同完成从数据接收到智能执行的全流程。

```
┌──────────────────────────────────────────────────────┐
│                     Event Bus                        │
│              (lib/events/bus.ts)                     │
│                                                     │
│  lead.created → followup-agent / deal-scoring-agent │
│  quote.sent   → followup-agent / deal-scoring-agent │
│  order.confirmed → followup-agent                   │
│  email.received / email.sent                        │
└──────────────┬───────────────────────────────────────┘
               │ emit(event)
               ▼
┌──────────────────────────────────────────────────────┐
│                  AI Core Engine                      │
│               (lib/ai/core.ts)                      │
│                                                     │
│  analyze() / decide() / execute() / log()           │
│                                                     │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │ crm-     │ │ intent.ts    │ │ vision.ts       │  │
│  │ analyzer │ │ (Function    │ │ (Image Analysis)│  │
│  │          │ │  Calling)    │ │                 │  │
│  └──────────┘ └──────────────┘ └─────────────────┘  │
└──────────────┬───────────────────────────────────────┘
               │ checkAIPermission()
               ▼
┌──────────────────────────────────────────────────────┐
│                 Control Guard                        │
│            (lib/ai/control/guard.ts)                │
│                                                     │
│  1. Global Toggle  2. Module Toggle                 │
│  3. Work Hours     4. Policy Rules (HARD/SOFT)      │
│  5. Rate Limits                                    │
└──────────────┬───────────────────────────────────────┘
               │ allowed / blocked
               ▼
┌──────────────────────────────────────────────────────┐
│                   Execution                          │
│                                                     │
│  Agents:                                            │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │ sales-     │ │ deal-scoring │ │ followup-     │  │
│  │ agent      │ │ agent        │ │ agent         │  │
│  └────────────┘ └──────────────┘ └───────────────┘  │
│                                                     │
│  Intent Executor (16 intents for IM Bot):           │
│  create_lead, create_customer, create_order, etc.   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              AIExecutionLog                   │   │
│  │              AILog                            │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## 核心组件

### 1. AI Core Engine (`lib/ai/core.ts`)

统一入口，所有 AI 操作必须通过以下四个方法：

| 方法 | 用途 |
|------|------|
| `analyze(input)` | 分析线索、客户、交易，检查权限后路由到具体分析器 |
| `decide(context)` | 跟进决策、销售建议、评分 |
| `execute(action, params)` | 通用执行器，路由命名操作到具体实现 |
| `log(event)` | 统一日志接口 |

### 2. Control Guard (`lib/ai/control/guard.ts`)

五步权限检查系统，确保 AI 行为在安全边界内：

1. **全局开关** — `aiEnabled` 是否开启
2. **模块开关** — 对应模块 Agent 是否启用
3. **工时检查** — 是否在工作时间内
4. **策略规则** — HARD 规则强制阻止，SOFT 规则按模式决定
5. **速率限制** — 每日操作次数是否超限

### 3. Event Bus (`lib/events/bus.ts`)

事件驱动系统，将 CRM 事件路由到 AI 处理：

| 事件 | 触发的 AI 操作 |
|------|--------------|
| `lead.created` | 自动创建跟进任务 + AI 交易评分 |
| `quote.sent` | 自动创建跟进任务 + AI 交易评分 |
| `order.confirmed` | 自动创建生产跟进任务（无 AI） |
| `email.received` | 邮件 Agent 处理 |
| `customer.created` | 客户分析 |

### 4. AI Agents

| Agent | 文件 | 功能 |
|-------|------|------|
| Sales Agent | `lib/ai/agents/sales-agent.ts` | 生成销售消息（WhatsApp/Email/Phone） |
| Deal Scoring Agent | `lib/ai/agents/deal-scoring-agent.ts` | 交易概率评分（规则引擎，0-100 分） |
| Follow-up Agent | `lib/ai/agents/followup-agent.ts` | 自动检测并创建跟进任务 |

## 支持的 AI 操作

### CRM 分析

- **线索分析** — 评估线索质量、提取需求、生成评分
- **客户分析** — 意向等级、客户类型推测、风险点识别
- **交易评分** — 基于多维度规则的成交概率评估
- **跟进回复建议** — 根据上下文生成回复草稿
- **模板重写** — 根据场景改写跟进模板

### IM Bot 意图

飞书/Telegram Bot 支持 16 种意图：

`create_lead`, `create_customer`, `create_order`, `add_followup`, `query_leads`, `query_customers`, `query_orders`, `query_tasks`, `update_order_status`, `update_customer_grade`, `complete_task`, `create_quote`, `query_pool`, `claim_customer`, `return_to_pool`, `help`

### Vision（图片分析）

- 从截图中提取客户信息并自动创建线索
- 支持独立的 Vision Model 配置

## 数据模型

| 模型 | 说明 |
|------|------|
| `AIConfig` | LLM Provider 配置（Base URL, API Key, Model） |
| `AIControlSettings` | 每租户 AI 控制设置（开关、模式、工时） |
| `AIPolicyRule` | 策略规则（HARD/SOFT） |
| `AIAnalysis` | AI 分析结果存储 |
| `AIExecutionLog` | AI 执行审计日志 |
| `AILog` | AI 操作日志 |

## 相关文件

| 文件路径 | 说明 |
|---------|------|
| `lib/ai/core.ts` | 核心引擎入口 |
| `lib/ai/client.ts` | OpenAI 兼容 HTTP 客户端 |
| `lib/ai/types.ts` | 类型定义和配置加载 |
| `lib/ai/prompts.ts` | 系统 Prompt 和行业专家 |
| `lib/ai/crm-analyzer.ts` | CRM 数据分析 |
| `lib/ai/vision.ts` | 图片分析 |
| `lib/ai/intent.ts` | IM 意图解析 |
| `lib/ai/tools.ts` | IM 工具定义 |
| `lib/ai/executor.ts` | 意图执行器 |
| `lib/ai/actions.ts` | 规则引擎 |
| `lib/ai/control/guard.ts` | 权限 Guard |
| `lib/ai/agents/sales-agent.ts` | 销售 Agent |
| `lib/ai/agents/deal-scoring-agent.ts` | 交易评分 Agent |
| `lib/ai/agents/followup-agent.ts` | 跟进 Agent |
| `lib/events/bus.ts` | 事件总线 |
