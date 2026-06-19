# AI 故障排查 (AI Troubleshooting)

## 常见问题

### 1. API 调用错误

**症状：** AI 操作返回 HTTP 401/403 错误

**原因：** API Key 无效或已过期

**解决方案：**
1. 导航到 `/ai-settings`
2. 检查 API Key 是否正确
3. 点击 "测试连接" 验证
4. 如果失败，到 Provider 控制台确认 Key 状态
5. 更新为新的 API Key

**相关代码：** `lib/ai/client.ts` 中的错误处理

| HTTP 状态码 | 说明 | 处理方式 |
|------------|------|---------|
| 401 | 未授权 | 检查 API Key |
| 403 | 禁止访问 | 检查账户权限和模型访问 |
| 404 | 端点不存在 | 检查 Base URL 配置 |
| 429 | 频率限制 | 降低调用频率或等待重置 |
| 500/502/503 | 服务端错误 | Provider 故障，稍后重试 |

### 2. 超时错误

**症状：** AI 操作超时（60 秒无响应）

**原因：** LLM Provider 响应慢或网络问题

**解决方案：**
1. 检查网络连接
2. 尝试切换到其他 Provider
3. 减少 Prompt 长度
4. 检查 Provider 状态页面

**超时配置：**
- LLM 调用：60 秒 (`lib/ai/client.ts`)
- 连接测试：15 秒 (`app/api/ai/test/route.ts`)

### 3. 被 Guard 阻止

**症状：** AI 操作未执行，日志显示 `allowed: false`

**排查步骤：**
1. 查看 AIExecutionLog 中的 `reason` 字段
2. 根据阻止原因采取对应措施

| 原因 | 解决方案 |
|------|---------|
| "全局 AI 开关已关闭" | 到 `/ai-control-panel` 开启 `aiEnabled` |
| "模块已禁用" | 开启对应模块开关 |
| "非工作时间" | 调整 `workHoursStart` / `workHoursEnd` |
| "HARD 规则阻止" | 修改或删除对应的 HARD 规则 |
| "SOFT 规则阻止" | 切换到 AUTO 模式，或修改 SOFT 规则 |
| "超出每日上限" | 增加 `maxContactsPerDay`，或等待次日重置 |

### 4. 模型未配置

**症状：** AI 功能不工作，无错误信息

**解决方案：**
1. 检查 `/ai-settings` 是否有激活的 AIConfig 记录
2. 检查环境变量 `AI_API_KEY` 和 `AI_BASE_URL`
3. 点击 "测试连接" 确认配置正确

### 5. 分析结果质量差

**症状：** AI 输出内容不相关或质量低

**解决方案：**
1. 确认使用了合适的模型（推荐 gpt-4o 或同等能力模型）
2. 检查业务线代码是否匹配行业 Prompt 专家
3. 确保输入数据完整（线索/客户字段不为空）
4. 在 `/ai-test` 页面测试 Prompt 效果

### 6. Vision 分析失败

**症状：** 图片分析不工作

**排查步骤：**
1. 确认 Vision Model 配置（独立于主模型）
2. 检查图片格式和大小
3. 确认 Vision API Key 有效
4. Vision 配置加载优先级：
   - 环境变量 (`VISION_API_KEY`)
   - 数据库 Vision 配置
   - 主 AI 配置（需模型支持 Vision）

### 7. IM Bot 不响应

**症状：** 飞书/Telegram Bot 收到消息但无回复

**排查步骤：**
1. 检查 `/im-settings` 中平台配置是否激活
2. 查看 `/im-messages` 中消息是否被接收
3. 检查 AI 配置是否有效
4. 查看 Guard 是否阻止了操作
5. 飞书长连接模式：确认 `npm run feishu:bot` 正在运行
6. Webhook 模式：确认 Webhook URL 配置正确

### 8. Event Bus 事件未触发

**症状：** 创建线索后没有自动创建跟进任务

**排查步骤：**
1. 检查 Event Bus 是否正常触发（查看 ActivityLog）
2. 检查 Guard 是否阻止了 AI 操作
3. 检查 `followUpAgentEnabled` 是否开启

## 日志排查工具

| 工具 | 路径/命令 | 用途 |
|------|----------|------|
| AI 执行日志 | `/ai-control-panel` → 日志 Tab | 查看 Guard 检查结果 |
| ActivityLog | `/activity-logs` | 查看系统操作记录 |
| AI 测试 | `/ai-test` | 测试 AI 连接和输出 |
| Webhook 日志 | `/webhook-logs` | 查看外部来源调用 |
| IM 消息 | `/im-messages` | 查看 IM 消息记录 |
| 系统健康 | `/system-health` | 系统整体状态检查 |

## 调试模式

在开发环境中，可以通过以下方式获取更多信息：

```bash
# 查看服务器日志
npm run dev

# AI 操作的详细日志会输出到控制台
# 包括: Prompt 内容、API 响应、Guard 检查结果
```
