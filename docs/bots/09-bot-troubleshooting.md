# Bot 故障排查 (Bot Troubleshooting)

## 飞书 Bot

### 1. 飞书 Webhook 不响应

**症状：** 在飞书中发送消息，Bot 无任何反应

**排查步骤：**

| 检查项 | 说明 | 操作 |
|--------|------|------|
| Webhook URL | 确认 URL 正确 | 检查飞书应用配置中的请求地址 |
| HTTPS | 飞书要求 HTTPS | 确认域名已配置 SSL 证书 |
| 事件订阅 | 确认订阅了事件 | 检查 `im.message.receive_v1` 是否已订阅 |
| 应用启用 | 应用需要发布 | 确认应用已发布或在测试企业中可用 |
| 权限 | 消息权限是否授予 | 确认 `im:message` 权限已申请并获批 |
| 签名验证 | encryptKey 是否匹配 | 确认系统中配置的 encryptKey 与飞书后台一致 |

### 2. 飞书长连接失败

**症状：** `npm run feishu:bot` 启动后无法连接

**排查步骤：**

1. 检查 `IMPlatform` 数据库记录中的 `appId` 和 `appSecret`
2. 确认应用已启用长连接模式
3. 检查网络是否可以访问飞书服务器
4. 查看控制台错误日志

```bash
# 启动 Bot 并查看日志
npm run feishu:bot
```

### 3. 飞书消息已收到但无回复

**症状：** `/im-messages` 中显示收到消息，但 Bot 未回复

**可能原因：**

| 原因 | 解决方案 |
|------|---------|
| AI 配置无效 | 检查 `/ai-settings` 中的 API Key |
| Guard 阻止 | 检查 AI 控制面板中的执行日志 |
| 意图解析失败 | 查看 `errorMsg` 字段的错误信息 |
| sendFeishuMessage 失败 | 检查 botToken 和消息发送 API 权限 |

### 4. 签名验证失败

**症状：** 返回 "Invalid signature" 错误

**解决：**

- 检查 `/im-settings` 中的 `encryptKey` 是否与飞书后台一致
- 确认 `verifyToken` 配置正确
- 飞书更新密钥后需要同步更新系统配置

## Webhook Bot

### 5. Webhook 返回 401 Unauthorized

**症状：** 外部系统调用 Webhook 返回 401

**排查步骤：**

1. 确认 Header 中包含 `x-crm-source-code` 和 `x-crm-api-key`
2. 确认 ExternalSource 记录存在且 `isActive=true`
3. 确认 API Key 正确（注意不要包含空格）
4. 查看 WebhookLog 中的错误详情

### 6. Webhook 返回重复线索

**症状：** 已存在的邮箱再次推送时返回 "Duplicate lead detected"

**说明：** 这是正常行为。系统按 email 字段去重，相同邮箱的推送会被标记为重复。

### 7. Webhook 线索未自动 AI 分析

**症状：** 推送的线索没有 AI 评分

**排查步骤：**
1. 确认 ExternalSource 的 `autoAnalyze=true`
2. 检查 AI 配置是否有效
3. 检查 AI 控制面板中的执行日志

## IM 通用问题

### 8. 意图解析返回错误

**症状：** IMMessage 记录中 `errorMsg` 有值

**排查步骤：**
1. 查看错误信息内容
2. 常见错误：
   - "AI service unavailable" — AI API Key 无效或 Provider 不可用
   - "Intent not recognized" — 消息内容无法识别为有效意图
   - "Missing required fields" — 意图参数不完整

### 9. 意图执行失败

**症状：** 意图解析成功但 CRM 操作未完成

**排查步骤：**
1. 查看 `actionResult` 和 `errorMsg` 字段
2. 常见原因：
   - 数据校验失败（必填字段缺失）
   - 数据库写入错误
   - 关联的业务线不存在

## 诊断工具

| 工具 | 路径 | 用途 |
|------|------|------|
| IM 消息查看 | `/im-messages` | 查看所有 IM 消息记录 |
| IM 平台管理 | `/im-settings` | 查看和修改平台配置 |
| AI 执行日志 | `/ai-control-panel` | 查看 AI Guard 决策 |
| ActivityLog | `/activity-logs` | 查看系统操作记录 |
| Webhook 日志 | `/webhook-logs` | 查看 Webhook 调用记录 |
| Webhook 测试 | `/webhook-test` | 发送测试 Webhook 请求 |
| 系统健康 | `/system-health` | 整体系统状态 |
