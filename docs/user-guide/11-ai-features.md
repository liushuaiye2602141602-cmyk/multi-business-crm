# AI 功能

## 概述

AI 功能模块为外贸 CRM 提供智能化辅助能力，包括线索分析、销售建议、成交评分、图像分析、AI 对话、模板生成和自动任务等功能。系统支持 OpenAI 兼容的 LLM 提供商，可灵活配置 AI 模型和参数。

## 页面入口

| 页面 | 路由 | 说明 |
|------|------|------|
| AI 测试 | `/ai-test` | AI 功能测试页面 |
| AI 分析列表 | `/ai-analyses` | 查看所有 AI 分析记录 |
| AI 分析详情 | `/ai-analyses/[id]` | 查看单条分析记录详情 |
| AI 设置 | `/ai-settings` | AI 配置管理 |

## AI 功能一览

### 1. 线索分析（Lead Analysis）

基于规则引擎与 LLM 模型，对线索进行全面的智能化评估。

**评分机制：** 综合评分范围 0-100 分，结合规则评分和 LLM 分析结果。

**输出字段：**

| 字段 | 说明 |
|------|------|
| aiSummary | AI 综合摘要 |
| aiTags | AI 标签 |
| requirementSummary | 客户需求摘要 |
| extractedRequirements | 提取的需求列表 |
| qualificationLevel | 线索资质等级 |
| intentLevel | 客户意向等级 |
| buyerTypeGuess | 买家类型猜测 |
| riskPoints | 风险提示 |
| missingInfo | 缺失信息 |
| suggestedQuestions | 建议提问清单 |
| nextAction | 建议下一步行动 |

**触发方式：** 在线索详情页面点击 AI 分析按钮（AIAnalysisButton 组件）。

### 2. 销售建议（Sales Suggestions）

根据客户生命周期阶段，生成针对性的销售策略和沟通话术。

**功能特点：**

- 感知客户所处的生命周期阶段。
- 生成 WhatsApp 消息草稿。
- 生成邮件主题和正文草稿。
- 生成电话沟通要点。

**输出字段：**

| 字段 | 说明 |
|------|------|
| whatsappReply | WhatsApp 消息草稿 |
| emailSubject | 邮件主题 |
| emailReply | 邮件正文草稿 |
| internalSalesNote | 内部销售备注 |
| nextAction | 建议下一步行动 |

**触发方式：** 在客户详情页面点击销售建议按钮（AISalesButton 组件）。

### 3. 成交评分（Deal Scoring）

评估当前成交概率，帮助销售人员优先关注高潜力订单。

**评分维度：**

- 联系信息完整度。
- 客户互动频率和质量。
- 报价内容质量。
- 客户生命周期阶段。

### 4. 图像分析（Vision AI）

利用视觉模型从截图中提取客户信息和关键数据。

**应用场景：**

- 从 WhatsApp 聊天截图中提取客户联系方式和需求信息。
- 从阿里巴巴询盘截图中自动录入线索数据。
- 从名片照片中提取客户基本信息。

**触发方式：** 在相关页面点击图像分析按钮（AIAnalyzeButton 组件）。

### 5. AI 对话（AI Chat）

通用的 AI 对话能力，辅助销售人员处理日常工作问题。

**应用场景：**

- 产品知识问答。
- 外贸术语解释。
- 商务邮件润色。
- 报价策略建议。
- 谈判技巧咨询。

### 6. 模板 AI（Template AI）

根据场景和语言要求，自动生成跟进沟通模板。

**功能特点：**

- 支持多种业务场景（新客户开发、老客户跟进、售后回访等）。
- 支持多语言模板生成。
- 结合客户画像生成个性化内容。

### 7. 自动任务（Auto Tasks）

跟进代理（Follow-up Agent）自动为停滞的线索和不活跃的客户创建跟进任务。

**自动触发规则：**

| 条件 | 触发规则 | 说明 |
|------|------|------|
| 停滞线索 | 3 天以上未跟进 | 自动创建跟进提醒任务 |
| 不活跃客户 | 7 天以上无互动 | 自动创建回访任务 |

## AI 分析记录（AI Analysis）

每次 AI 分析操作都会生成一条分析记录，包含完整的输入输出数据。

### 分析记录字段

| 字段 | 类型 | 说明 |
|------|------|------|
| targetType | Enum | 分析目标类型 |
| targetId | String | 目标实体 ID |
| title | String | 分析标题 |
| summary | String | 分析摘要 |
| requirementSummary | String | 客户需求摘要 |
| extractedRequirements | JSON | 提取的需求信息 |
| qualificationLevel | String | 资质等级 |
| intentLevel | String | 意向等级 |
| buyerTypeGuess | String | 买家类型 |
| riskPoints | JSON | 风险提示列表 |
| missingInfo | JSON | 缺失信息列表 |
| suggestedQuestions | JSON | 建议提问列表 |
| nextAction | String | 建议下一步行动 |
| whatsappReply | String | WhatsApp 消息草稿 |
| emailSubject | String | 邮件主题 |
| emailReply | String | 邮件正文草稿 |
| internalSalesNote | String | 内部销售备注 |
| rawInput | JSON | 原始输入数据 |
| rawOutput | JSON | 原始 AI 输出数据 |

### targetType 枚举值

| 值 | 说明 |
|------|------|
| LEAD | 线索分析 |
| CUSTOMER | 客户分析 |
| PROJECT | 项目分析 |
| FOLLOW_UP | 跟进分析 |
| TEMPLATE | 模板生成 |

## AI 配置

### 配置页面

通过 AI 设置页面（`/ai-settings`）管理 AI 相关配置。

### 支持的提供商

系统支持 OpenAI 兼容的 API 提供商，包括：

- OpenAI（GPT-4、GPT-3.5 等）
- Azure OpenAI
- 其他 OpenAI 兼容的本地或第三方服务（如 Ollama、vLLM 等）

### 环境变量

| 变量名 | 说明 |
|------|------|
| AI_BASE_URL | AI API 基础地址 |
| AI_API_KEY | AI API 密钥 |
| AI_MODEL | AI 模型名称 |
| VISION_BASE_URL | 视觉分析 API 基础地址 |
| VISION_API_KEY | 视觉分析 API 密钥 |
| VISION_MODEL | 视觉分析模型名称 |

### 配置存储

AI 配置信息存储在 AIConfig 数据库模型中，支持通过界面修改。环境变量作为备选配置方式，当数据库中未配置时使用环境变量的值。

## 页面组件说明

AI 功能以按钮组件的形式嵌入到各业务页面中：

| 组件 | 位置 | 功能 |
|------|------|------|
| AIAnalysisButton | 线索详情页 | 触发线索 AI 分析 |
| AISalesButton | 客户详情页 | 触发销售建议生成 |
| AIAnalyzeButton | 报价详情页 | 触发图像分析（识别报价相关截图） |

## 使用说明

### 配置 AI 服务

1. 进入 AI 设置页面（`/ai-settings`）。
2. 填写 AI 提供商的基础地址和 API 密钥。
3. 选择使用的模型。
4. 保存配置。
5. 在 AI 测试页面（`/ai-test`）验证配置是否正确。

### 执行 AI 分析

1. 进入目标实体（线索、客户、报价）的详情页面。
2. 找到并点击对应的 AI 分析按钮。
3. 等待 AI 处理完成（通常需要数秒）。
4. 查看分析结果和建议。

### 查看分析历史

1. 进入 AI 分析列表页面（`/ai-analyses`）。
2. 按目标类型、时间等条件筛选分析记录。
3. 点击记录查看详细分析结果。

## 注意事项

- AI 分析结果仅供参考，重要决策请结合人工判断。
- 图像分析依赖视觉模型的质量，建议上传清晰的截图。
- 部分 AI 功能（如销售建议）需要配置有效的 AI API 密钥才能使用。
- 自动任务的触发间隔可在 AI 控制面板中配置。
- AI 分析产生的 token 消耗取决于所选模型和输入数据量，请注意成本控制。
