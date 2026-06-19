# API Key 配置 (API Key Configuration)

## 概述

AI API Key 用于认证 LLM Provider 的调用请求。系统支持两种存储方式：数据库存储（推荐）和环境变量。

## 存储方式

### 方式一：数据库存储（推荐）

通过 UI 或 API 管理，存储在 `AIConfig` 表中。

**API 接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai/config` | 获取当前配置（API Key 脱敏显示） |
| PUT | `/api/ai/config` | 更新配置 |

**GET 返回格式：**

```json
{
  "id": 1,
  "provider": "OPENAI_COMPATIBLE",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "YOUR_API****",
  "model": "gpt-4o",
  "isActive": true
}
```

> API Key 在返回时被截断为前 8 个字符 + `****` 后缀。

**PUT 更新逻辑：**

- 如果新 apiKey 值包含 `****`（即前端传回的脱敏值），则不更新 apiKey 字段
- 只有传入完整的新 API Key 时才会覆盖

### 方式二：环境变量（Fallback）

当数据库中无 AIConfig 记录或记录为 inactive 时，使用环境变量。

```env
# 主模型
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://api.openai.com/v1"
AI_API_KEY="YOUR_API_KEY"
AI_MODEL="gpt-4o"

# Vision 模型（可选）
VISION_BASE_URL="https://api.openai.com/v1"
VISION_API_KEY="YOUR_VISION_API_KEY"
VISION_MODEL="gpt-4o"
```

## 测试连接

配置完成后，测试 API Key 是否有效：

```
POST /api/ai/test
```

**请求示例：**

```bash
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json"
```

**成功响应：**

```json
{
  "success": true,
  "message": "连接成功",
  "model": "gpt-4o"
}
```

**失败响应：**

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 常见错误

| HTTP 状态码 | 错误说明 | 解决方案 |
|------------|---------|---------|
| 401 | API Key 无效 | 检查 Key 是否正确，是否已过期 |
| 403 | 权限不足 | 检查账户是否有模型访问权限 |
| 404 | 端点不存在 | 检查 Base URL 是否正确 |
| 429 | 请求频率超限 | 降低调用频率或升级计划 |
| 500/502/503 | 服务端错误 | Provider 临时故障，稍后重试 |

## 安全注意事项

### 已实现的安全措施

- GET API 返回时对 apiKey 进行脱敏（截断 + `****`）
- 更新时检查脱敏值，防止误覆盖

### 待改进的安全措施

- **数据库密码加密：** 当前 apiKey 以明文存储在数据库中
- **访问控制：** API Key 管理接口无额外权限校验
- **日志泄露：** AI 调用日志中的 `rawOutput` 可能包含错误响应中的 Key 片段

### 安全建议

1. 不要在 `.env` 文件中提交真实的 API Key（确保 `.env` 在 `.gitignore` 中）
2. 生产环境使用数据库存储，便于管理和轮换
3. 定期在 Provider 控制台检查用量和异常
4. 为测试和生产环境使用不同的 API Key
5. 设置 Provider 侧的用量上限
