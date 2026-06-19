# AI API 端点

## POST /api/ai/analyze-lead

分析线索并生成 AI 评分。

**请求体:**

```json
{
  "leadId": 1
}
```

**响应:**

```json
{
  "analysis": {
    "id": 1,
    "targetType": "LEAD",
    "targetId": 1,
    "title": "线索分析报告",
    "summary": "该客户来自展会...",
    "requirementSummary": "需要 LED 灯具 5000 件...",
    "extractedRequirements": ["产品: LED灯具", "数量: 5000件", "目标市场: 欧洲"],
    "qualificationLevel": "HIGH",
    "intentLevel": "STRONG",
    "buyerTypeGuess": "DISTRIBUTOR",
    "riskPoints": ["未确认付款能力"],
    "missingInfo": ["具体规格要求", "期望交货时间"],
    "suggestedQuestions": ["贵司主要销售哪些品类？", "年采购预算大约多少？"],
    "nextAction": "发送产品目录并安排视频会议",
    "internalSalesNote": "高质量线索，优先跟进"
  }
}
```

AI 分析结合规则评分（0-100）和 LLM 分析。结果保存到 `AIAnalysis` 表，并更新 `Lead` 的 `aiScore`、`aiSummary`、`aiTags` 字段。

**权限:** 需要 AI Control Guard 允许执行。

---

## POST /api/ai/analyze-image

图像分析（Vision AI）。

**请求体:**

```json
{
  "imageBase64": "data:image/png;base64,...",
  "type": "customer_extraction"
}
```

使用独立的 Vision 配置（`visionBaseUrl`、`visionApiKey`、`visionModel`）。可从截图中提取客户信息。

当前版本部分支持。

---

## POST /api/ai/sales-suggest

生成销售建议。

**请求体:**

```json
{
  "entityType": "customer",
  "entityId": 1
}
```

**`entityType` 可选值:** `customer`、`lead`、`quote`、`order`

**生成内容包括:**

- WhatsApp 消息草稿
- Email 主题和正文草稿
- 电话话术建议
- 内部销售备注

基于客户生命周期阶段和历史交互生成个性化建议。

---

## POST /api/ai/chat

AI 通用对话。

**请求体:**

```json
{
  "messages": [
    { "role": "user", "content": "帮我写一封跟进邮件" }
  ],
  "model": "optional-model-override"
}
```

使用 OpenAI 兼容 API，60 秒超时，默认 `temperature` 为 0.3。

**错误处理:** 401、403、404、429、5xx。

---

## POST /api/ai/auto-action

自动执行 AI 操作。

**请求体:**

```json
{
  "actionType": "email_send",
  "entityType": "lead",
  "entityId": 1,
  "metadata": {}
}
```

**`actionType` 可选值:** `email_send`、`whatsapp_send`、`task_create`、`lead_analyze`

受 AI Control Guard 完整 5 步检查:

1. 全局开关
2. 模块开关
3. 工作时间
4. 策略规则
5. 频率限制

执行结果记录到 `AIExecutionLog`。

---

## GET/POST /api/ai/test

AI 测试端点，用于调试 AI 配置和连接。

- **GET:** 获取当前 AI 配置状态
- **POST:** 发送测试请求验证 AI 服务连通性

---

## GET /api/ai/config

获取 AI 配置（从 `AIConfig` 表）。

**响应:**

```json
{
  "config": {
    "provider": "OPENAI_COMPATIBLE",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o",
    "isActive": true,
    "visionModel": "gpt-4o"
  }
}
```

**注意:** `apiKey` 不在响应中返回。

---

## PUT /api/ai/config

更新 AI 配置。

**请求体（所有字段可选）:**

```json
{
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "visionBaseUrl": "https://api.openai.com/v1",
  "visionApiKey": "sk-...",
  "visionModel": "gpt-4o",
  "isActive": true
}
```

支持 OpenAI 兼容的第三方提供商（如 DeepSeek、Qwen、Moonshot 等）。

**环境变量备选:** `AI_PROVIDER`、`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`、`VISION_API_KEY`、`VISION_BASE_URL`、`VISION_MODEL`

---

## AI Control API

### GET /api/ai-control/settings

获取 AI 控制面板设置。

**响应:**

```json
{
  "settings": {
    "aiEnabled": true,
    "salesAgentEnabled": true,
    "emailAgentEnabled": false,
    "whatsappAgentEnabled": false,
    "followUpAgentEnabled": true,
    "prospectingEnabled": false,
    "executionMode": "MANUAL",
    "workHoursStart": 9,
    "workHoursEnd": 18,
    "maxContactsPerDay": 5
  }
}
```

---

### PUT /api/ai-control/settings

更新 AI 控制设置。

---

### GET /api/ai-control/rules

获取策略规则列表。

---

### POST /api/ai-control/rules

创建策略规则。

**请求体:**

```json
{
  "name": "禁止黑名单客户",
  "type": "HARD",
  "action": "block_blacklist",
  "condition": { "customerStatus": "BLACKLIST" },
  "value": "",
  "isActive": true
}
```

**`type` 选项:**

| 值 | 说明 |
|------|------|
| `HARD` | 始终阻止 |
| `SOFT` | 非 AUTO 模式时阻止 |

**`action` 选项:** `block_send`、`limit_rate`、`block_blacklist`、`block_discount`

---

### DELETE /api/ai-control/rules/[id]

删除策略规则。

---

### GET /api/ai-control/logs

获取 AI 执行日志。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `actionType` | string | `email_send` / `whatsapp_send` / `task_create` / `lead_analyze` |
| `allowed` | boolean | `true` / `false` |
| `page` | number | 页码 |
| `limit` | number | 每页数量 |

**响应:**

```json
{
  "logs": [
    {
      "id": 1,
      "actionType": "email_send",
      "entityType": "lead",
      "entityId": 1,
      "allowed": true,
      "reason": "所有检查通过",
      "mode": "MANUAL",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```
