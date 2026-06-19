# 模型提供商配置 (Model Provider Configuration)

## 概述

系统使用 OpenAI 兼容 API 协议，支持任何兼容 `/v1/chat/completions` 接口的 LLM Provider。

## 支持的 Provider

| Provider | baseUrl | 推荐模型 |
|----------|---------|---------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o / gpt-4o-mini |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat / deepseek-reasoner |
| Moonshot (Kimi) | `https://api.moonshot.cn/v1` | moonshot-v1-128k / moonshot-v1-32k |
| MiMo (小米) | (需确认) | MiMo 系列模型 |
| 智谱 (Zhipu) | `https://open.bigmodel.cn/api/paas/v4` | glm-4 / glm-4-flash |
| 通义千问 (Qianwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen-max / qwen-plus |
| 自定义 | (任意 OpenAI 兼容接口) | (任意模型) |

> 所有 Provider 均使用 `OPENAI_COMPATIBLE` 作为 provider 类型，通过不同的 baseUrl 区分。

## AIConfig 数据模型

```prisma
model AIConfig {
  id            Int      @id @default(autoincrement())
  provider      String   @default("OPENAI_COMPATIBLE")
  baseUrl       String                      // API 基础 URL
  apiKey        String                      // API Key
  model         String                      // 模型名称
  visionBaseUrl String?                     // Vision 模型 URL（可选）
  visionApiKey  String?                     // Vision 模型 Key（可选）
  visionModel   String?                     // Vision 模型名称（可选）
  isActive      Boolean  @default(true)
}
```

## 配置方式

### 方式一：通过 UI 配置（推荐）

1. 导航到 `/ai-settings`
2. 填写 Provider 配置：
   - **Provider** — 保持默认 `OPENAI_COMPATIBLE`
   - **Base URL** — 填写对应 Provider 的 API 地址
   - **API Key** — 填写 API 密钥
   - **Model** — 填写模型名称
3. 可选配置 Vision Model（图片分析）
4. 点击 "测试连接" 验证配置
5. 保存配置

### 方式二：通过环境变量配置（Fallback）

在 `.env` 文件中设置：

```env
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://api.openai.com/v1"
AI_API_KEY="YOUR_API_KEY"
AI_MODEL="gpt-4o"

# 可选：Vision Model
VISION_BASE_URL="https://api.openai.com/v1"
VISION_API_KEY="YOUR_VISION_API_KEY"
VISION_MODEL="gpt-4o"
```

### 配置加载优先级

1. **数据库** (`AIConfig` 表) — 优先使用
2. **环境变量** — 作为 Fallback

```
getAIConfig() 
  → getAIConfigFromDB()  // 先查数据库
    → 环境变量 fallback   // 数据库无记录时使用
```

## Vision Model 配置

Vision Model 用于图片分析（如从截图提取客户信息）。加载优先级：

1. 环境变量 (`VISION_API_KEY`, `VISION_BASE_URL`, `VISION_MODEL`)
2. 数据库 Vision 配置 (`AIConfig.visionBaseUrl/visionApiKey/visionModel`)
3. 主 AI 配置（如果模型本身支持 Vision，如 gpt-4o）

## 连接测试

```
POST /api/ai/test
```

系统发送一个最小的 chat completion 请求验证连接：
- 超时时间：15 秒
- 验证内容：模型名称和 API Key 的有效性
- 返回：成功/失败状态和错误信息

## 通用配置示例

### OpenAI

```json
{
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "YOUR_API_KEY",
  "model": "gpt-4o"
}
```

### DeepSeek

```json
{
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKey": "YOUR_API_KEY",
  "model": "deepseek-chat"
}
```

### Moonshot (Kimi)

```json
{
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://api.moonshot.cn/v1",
  "apiKey": "YOUR_API_KEY",
  "model": "moonshot-v1-128k"
}
```

### 通义千问

```json
{
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "apiKey": "YOUR_API_KEY",
  "model": "qwen-plus"
}
```

### 智谱 GLM

```json
{
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
  "apiKey": "YOUR_API_KEY",
  "model": "glm-4-flash"
}
```

## 行业专家 Prompt

系统内置三个业务线行业 Prompt 专家（定义在 `lib/ai/prompts.ts`）：

| 代码 | 行业 | 说明 |
|------|------|------|
| FLEX | 软包装行业 | 软包装产品分析和销售建议 |
| PACK | 包装机械行业 | 包装机械产品分析和销售建议 |
| WOOD | 木制品行业 | 木制品/木工艺品分析和销售建议 |

当业务线代码匹配时，AI 分析会使用对应的行业专家 Prompt 提升输出质量。
