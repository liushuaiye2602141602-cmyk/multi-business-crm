# 系统架构

Multi-Business CRM 采用分层架构设计，核心分为四个层次，通过 Event Bus 实现层间解耦。

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│                   Control Layer                      │
│   AI Control Guard · Policy Rules · Execution Mode  │
│              (MANUAL / APPROVAL / AUTO)              │
├─────────────────────────────────────────────────────┤
│                  AI Core Engine                       │
│   analyze() · decide() · execute() · agents         │
│   Vision · Intent · Sales/Deal/FollowUp Agents      │
├─────────────────────────────────────────────────────┤
│                 Communication Hub                    │
│   Email (IMAP/SMTP) · IM Bot (Feishu) · Webhook    │
│          Unified Message · External Source            │
├─────────────────────────────────────────────────────┤
│                    CRM Core                          │
│   Lead · Customer · Contact · Project · Quote       │
│   Order · Task · FollowUp · Product · BusinessLine  │
│              Event Bus · ActivityLog                 │
└─────────────────────────────────────────────────────┘
          ↕ PostgreSQL 16 (Prisma ORM) ↕
```

## 四层说明

### 1. CRM Core（业务核心层）

系统的基础层，包含所有核心业务模型和逻辑。

- **主要实体**：Lead、Customer、Contact、Project、Quote、Order、Task、FollowUp、Product、BusinessLine
- **Event Bus**：`lib/events/bus.ts` 负责事件分发和 ActivityLog 记录
- **多业务线架构**：BusinessLine 是组织实体的核心维度，所有业务数据挂靠在特定业务线下

### 2. Communication Hub（通信枢纽层）

负责外部通信和数据接入。

- **Email 系统**：`lib/email/service.ts`，支持 IMAP/SMTP，多供应商（Gmail/Outlook/阿里云/网易/自定义）
- **IM Bot**：`lib/im/feishu.ts`，通过飞书 WebSocket 长连接实现机器人交互
- **Webhook**：`lib/webhook.ts`，接收外部系统推送的 Lead 数据
- **统一消息**：`lib/communication/message-service.ts`，跨渠道消息存储与分析

### 3. AI Core Engine（AI 核心引擎）

所有 AI 操作的统一入口和执行引擎。

- **入口**：`lib/ai/core.ts` 提供 `analyze()` / `decide()` / `execute()` / `log()` 四个核心方法
- **Agent 模块**：`lib/ai/agents/` 下的 sales-agent、deal-scoring-agent、followup-agent
- **Vision**：`lib/ai/vision.ts`，支持图片识别提取客户信息
- **Intent**：`lib/ai/intent.ts`，基于 LLM function calling 的意图解析

### 4. Control Layer（控制层）

AI 操作的安全护栏和执行策略控制。

- **Guard**：`lib/ai/control/guard.ts`，5 步权限检查（全局开关 → 模块开关 → 工作时间 → 策略规则 → 速率限制）
- **策略规则**：HARD（硬性拦截）/ SOFT（软性提示）两种级别
- **执行模式**：MANUAL（仅建议）/ APPROVAL（需审批）/ AUTO（自动执行）

## Event Bus 数据流

```
用户操作 → Server Action / API Route
         → 调用业务逻辑
         → emit('event.name', payload)
         → bus.ts 记录 ActivityLog
         → 触发 Handler（switch/case 路由）
         → Handler 执行副作用（创建 FollowUp / AI 评分等）
```

当前已接线的事件：
- `lead.created` → 自动创建 FollowUp 任务 + AI 评分
- `quote.sent` → 自动创建 FollowUp 任务 + 成交评分
- `order.confirmed` → 自动创建生产跟进任务

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | Next.js 16.2.7 (App Router) + React 19 |
| 样式 | Tailwind CSS 4（纯手写组件，无 UI 库） |
| ORM | Prisma 7.8.0（PrismaPg adapter） |
| 数据库 | PostgreSQL 16 |
| 认证 | JWT（cookie-based） + bcryptjs |
| 部署 | Docker + docker-compose |

## 关键设计决策

1. **Server Actions 优先**：CRUD 操作主要通过 `"use server"` 函数实现（53 个文件），而非 API Route
2. **无前端 UI 框架**：所有组件手写，避免对第三方 UI 库的依赖
3. **单 Event Bus**：所有事件通过单一 `bus.ts` 文件路由，简单直接
4. **AI 深度集成**：AI 不是外挂模块，而是通过 Event Bus 与业务流程深度耦合
5. **Multi-tenant 支持**：核心模型通过 `tenantId` 字段实现租户隔离
