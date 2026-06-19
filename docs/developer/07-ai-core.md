# AI Core Engine

AI Core Engine 是系统中所有 AI 操作的统一入口，位于 `lib/ai/` 目录。

## 文件结构

```
lib/ai/
├── core.ts              # 入口：analyze() / decide() / execute() / log()
├── client.ts            # OpenAI 兼容 HTTP 客户端
├── types.ts             # 类型定义 + 配置读取
├── parser.ts            # AI JSON 响应解析
├── prompts.ts           # Prompt 构建器（5 个通用 + 3 个行业）
├── crm-analyzer.ts      # 规则评分（无 LLM）
├── vision.ts            # Vision AI（图片识别）
├── intent.ts            # 意图解析（Function Calling）
├── tools.ts             # 16 个 IM Bot 工具定义
├── executor.ts          # 意图执行引擎
├── actions.ts           # Server Actions（11 个）
├── control/
│   └── guard.ts         # AI 权限守卫（5 步检查）
└── agents/
    ├── index.ts         # Agent 导出
    ├── sales-agent.ts   # 销售建议
    ├── deal-scoring-agent.ts  # 成交概率评分
    └── followup-agent.ts      # 自动跟进
```

## core.ts — 统一入口

`core.ts` 是所有 AI 操作的唯一入口，提供四个核心方法：

### analyze() — AI 分析

```typescript
export async function analyze(targetType: string, targetId: string, prompt: string)
```

用于分析 CRM 实体（线索、客户、项目），返回结构化的分析结果。

**流程**：
1. 通过 Control Guard 权限检查
2. 构建 Prompt
3. 调用 LLM（通过 client.ts）
4. 解析 JSON 响应（通过 parser.ts）
5. 保存到 AIAnalysis 表
6. 记录 AILog

### decide() — AI 决策

```typescript
export async function decide(context: string, options: string[])
```

基于上下文信息做出决策（如判断线索优先级、客户流失风险等）。

### execute() — AI 执行

```typescript
export async function execute(action: string, params: Record<string, any>)
```

执行 AI 建议的操作（如自动创建任务、发送邮件草稿等）。

### log() — 记录日志

```typescript
export async function log(entityType: string, entityId: string, actionType: string, output: string)
```

所有 AI 操作的结果都会记录到 `AILog` 表。

## client.ts — LLM 客户端

OpenAI 兼容的 HTTP 客户端，支持任何 OpenAI-compatible API。

**特性**：
- 60 秒超时
- 错误分类：401（未授权）、403（禁止）、404（模型未找到）、429（限流）、500（服务端错误）
- 配置来源：环境变量或数据库（AIConfig 表）

**配置优先级**：
1. `AIConfig` 数据库表（优先）
2. 环境变量 `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`

## crm-analyzer.ts — 规则评分

无需 LLM 的规则评分引擎：

- **线索评分**：基于联系信息完整度、互动历史、需求明确度、预算信息
- **客户销售建议**：基于生命周期阶段（PROSPECT → LEAD → OPPORTUNITY → CUSTOMER → VIP）

## vision.ts — Vision AI

从图片中提取客户信息（如名片截图）：

- 支持独立的 Vision 模型配置（`VISION_API_KEY` / `VISION_BASE_URL` / `VISION_MODEL`）
- 未配置时回退到主 AI 模型
- 输出结构化的客户信息 JSON

## intent.ts — 意图解析

基于 LLM Function Calling 的意图解析器，用于 IM Bot：

1. 定义 16 个工具（tools.ts）
2. 将用户自然语言 + 工具定义发送给 LLM
3. LLM 返回结构化的工具调用
4. 通过 executor.ts 执行

## 三个 Agent

### sales-agent.ts — 销售建议

为线索和客户生成多渠道（WhatsApp/Email/Phone）的销售话术建议。

### deal-scoring-agent.ts — 成交评分

评估 0-100 的成交概率，基于：联系信息完整度、互动频率、生命周期阶段、预算信息。

### followup-agent.ts — 自动跟进

- 线索超过 3 天未跟进 → 自动创建跟进任务
- 客户超过 7 天未互动 → 自动创建跟进任务

## 添加新 AI 动作的步骤

### 1. 定义 Prompt

在 `lib/ai/prompts.ts` 中添加新的 Prompt 构建器：

```typescript
export function buildNewActionPrompt(data: { ... }): string {
  return `你是一个 AI 助手，请分析以下数据：\n\n${JSON.stringify(data, null, 2)}`
}
```

### 2. 在 core.ts 中添加调用

```typescript
export async function newAction(params: { ... }) {
  // 1. 权限检查
  await guard.check(params)

  // 2. 构建 Prompt
  const prompt = buildNewActionPrompt(params)

  // 3. 调用 LLM
  const response = await client.chat(prompt)

  // 4. 解析结果
  const result = parser.parse(response)

  // 5. 保存分析结果
  await prisma.aiAnalysis.create({ ... })

  // 6. 记录日志
  await log(params.entityType, params.entityId, 'NEW_ACTION', response)

  return result
}
```

### 3. 添加 Server Action

在 `lib/ai/actions.ts` 中添加 server action：

```typescript
'use server'
export async function newAIAction(params: { ... }) {
  return core.newAction(params)
}
```

### 4. 在前端调用

```typescript
// components/NewAIButton.tsx
'use client'
import { newAIAction } from '@/lib/ai/actions'

export function NewAIButton({ entityId }) {
  return (
    <button onClick={() => newAIAction({ entityId, entityType: 'lead' })}>
      执行新 AI 动作
    </button>
  )
}
```

## Control Guard 权限检查

所有 AI 操作必须通过 `lib/ai/control/guard.ts` 的 5 步检查：

1. **全局开关**：`AIControlSettings.aiEnabled` 是否开启
2. **模块开关**：对应模块（salesAgent / emailAgent / whatsappAgent / followUpAgent）是否开启
3. **工作时间**：是否在配置的工作时间内（workHoursStart ~ workHoursEnd）
4. **策略规则**：是否违反任何 HARD 级别规则
5. **速率限制**：今日执行次数是否超过 `maxContactsPerDay`

检查结果记录到 `AIExecutionLog` 表。
