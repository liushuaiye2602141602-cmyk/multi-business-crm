# AI 与 API 问题

## API 401 Unauthorized

### 症状

调用 AI 接口时返回 401 错误。

### 原因与解决

**AI API Key 无效**：

```bash
# 检查环境变量
echo $AI_API_KEY

# 检查数据库中的 AIConfig
# 通过 Prisma Studio 查看
npx prisma studio
# 导航到 AIConfig 表，确认 apiKey 字段
```

**API Key 过期**：
- 在 AI 供应商平台确认 Key 是否有效
- 重新生成 API Key 并更新

**Base URL 配置错误**：

```env
# 确认 AI_BASE_URL 指向正确的 API 端点
AI_BASE_URL="https://api.openai.com/v1"         # OpenAI
AI_BASE_URL="https://api.deepseek.com/v1"       # DeepSeek
AI_BASE_URL="https://your-proxy.example.com/v1" # 代理
```

## AI 请求超时

### 症状

```
Error: Request timeout after 60000ms
```

### 原因与解决

**网络延迟**：
- 检查到 AI API 的网络连通性
- 如果使用代理，确认代理配置正确

**模型响应慢**：
- 大上下文 Prompt 导致响应慢
- 尝试使用更快的模型（如 GPT-4o-mini 替代 GPT-4）
- 减少 Prompt 长度

**Provider 限流**：

```
Error: 429 Too Many Requests
```

- 等待一段时间后重试
- 减少并发 AI 请求
- 升级 API 限额

## 模型未找到（Model Not Found）

### 症状

```
Error: 404 Model not found
```

### 解决

确认 `AI_MODEL` 与供应商支持的模型名称一致：

```env
# OpenAI 模型示例
AI_MODEL="gpt-4o"
AI_MODEL="gpt-4o-mini"
AI_MODEL="gpt-3.5-turbo"

# DeepSeek 模型示例
AI_MODEL="deepseek-chat"

# 本地模型（如 Ollama）
AI_MODEL="llama3"
```

注意：不同供应商的模型名称不同，不要混淆。

## AI Control Guard 拦截

### 症状

AI 操作被阻止，`AIExecutionLog` 中记录 `allowed: false`。

### 检查步骤

1. **查看执行日志**：
   ```bash
   # 通过 API 查询
   GET /api/ai-control/logs
   ```
   检查 `reason` 字段了解拦截原因。

2. **检查全局开关**：
   ```
   AIControlSettings.aiEnabled = true?
   ```

3. **检查模块开关**：
   - salesAgentEnabled
   - emailAgentEnabled
   - whatsappAgentEnabled
   - followUpAgentEnabled

4. **检查工作时间**：
   - 当前时间是否在 workHoursStart ~ workHoursEnd 范围内

5. **检查速率限制**：
   - 今日执行次数是否超过 maxContactsPerDay

6. **检查策略规则**：
   - 是否有 HARD 级别的规则匹配当前操作

### 解除拦截

- 调整 AI Control Settings（通过 `/ai-control-panel` 页面）
- 增加 maxContactsPerDay 限额
- 调整工作时间范围
- 修改或禁用特定策略规则

## 视觉 AI（Vision）问题

### 图片识别失败

1. 确认 Vision AI 已配置（`VISION_API_KEY` / `VISION_BASE_URL` / `VISION_MODEL`）
2. 如果未配置 Vision 专用模型，系统会回退到主 AI 模型（需支持 vision）
3. 确认图片格式：支持 JPG、PNG
4. 确认图片大小：建议 < 5MB

## IM Bot 意图解析失败

### 症状

Bot 无法正确理解用户指令。

### 排查

1. 检查 `lib/ai/tools.ts` 中的工具定义
2. 确认 AI 模型支持 Function Calling / Tool Use
3. 查看 `IMMessage` 表中的 `intent` 和 `action` 字段
4. 检查 `executor.ts` 中的执行结果和 `errorMsg`
