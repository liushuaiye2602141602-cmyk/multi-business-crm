# Bot 安全 (Bot Security)

## Webhook 签名验证

### 飞书 Webhook 签名

飞书 Webhook 端点 (`/api/im/feishu/webhook`) 使用 SHA256 签名验证：

```typescript
// lib/im/feishu.ts
verifyFeishuSignature(timestamp, nonce, encryptKey, body, signature)
```

**验证流程：**

1. 飞书在请求头中附带 `X-Lark-Signature`、`X-Lark-Request-Timestamp`、`X-Lark-Request-Nonce`
2. 使用 `encryptKey` + `timestamp` + `nonce` + `body` 计算 SHA256 哈希
3. 比较计算结果与飞书附带的签名
4. 签名不匹配则拒绝请求

**配置位置：** 在飞书开放平台的应用配置中获取 `encryptKey` 和 `verifyToken`，配置到 `/im-settings` 的 IMPlatform 记录中。

### 通用 Webhook API Key 验证

外部来源 Webhook (`/api/webhooks/leads`) 使用 API Key 认证：

```
Header: x-crm-source-code: <来源代码>
Header: x-crm-api-key: <API Key>
```

**验证流程：**

1. 根据 `x-crm-source-code` 查找 ExternalSource 记录
2. 使用 SHA256 哈希 `x-crm-api-key` 的值
3. 比较哈希值与数据库中存储的 `apiKeyHash`
4. 匹配则认证通过，不匹配返回 401

```typescript
// lib/webhook.ts
hashApiKey(key)       // SHA256 哈希
verifyApiKey(key, hash)  // 验证匹配
```

## API Key 管理

### 生成 API Key

```typescript
// lib/webhook.ts
generateApiKey()  // 返回 "crm_sk_" + 随机字符串
```

### 存储方式

- 数据库中存储 API Key 的 **SHA256 哈希值**
- 明文 API Key 仅在创建时返回给用户
- 创建后无法再次查看明文

### 安全最佳实践

1. **创建时保存** — API Key 仅在创建时显示一次，及时保存
2. **定期轮换** — 定期生成新 Key 并废弃旧 Key
3. **最小权限** — 每个外部来源使用独立的 API Key
4. **监控异常** — 关注 WebhookLog 中的 UNAUTHORIZED 状态

## IM 平台凭据安全

### 存储

IM 平台凭据存储在 `IMPlatform` 模型中：

| 字段 | 说明 | 安全级别 |
|------|------|---------|
| `appId` | 应用 ID | 低敏感 |
| `appSecret` | 应用密钥 | 高敏感 |
| `encryptKey` | 加密密钥 | 高敏感 |
| `verifyToken` | 验证 Token | 中敏感 |
| `botToken` | Bot Token | 高敏感 |

### 安全建议

1. **不暴露到前端** — 确保 IM 平台 API 不返回敏感字段
2. **数据库加密** — 高敏感字段（appSecret、botToken）应加密存储
3. **访问控制** — 仅 ADMIN 角色可管理 IM 平台配置
4. **日志脱敏** — 确保 ActivityLog 和 IMMessage 不记录密钥

## 飞书 Bot 安全

### 消息验证

- 飞书 Webhook 请求必须通过签名验证
- 使用 `encryptKey` 进行请求体解密（如启用了加密）
- URL 验证 (challenge) 仅响应正确的验证请求

### 权限最小化

飞书应用只需以下权限：

| 权限 | 说明 |
|------|------|
| `im:message` | 获取消息内容 |
| `im:message:send_as_bot` | 以应用身份发送消息 |

不需要额外的通讯录、文档等权限。

## 通用安全检查清单

- [ ] Webhook 端点使用 HTTPS
- [ ] 飞书 Webhook 签名验证已启用
- [ ] API Key 使用 SHA256 哈希存储
- [ ] IM 平台密钥不暴露到前端 API
- [ ] Webhook API 有频率限制
- [ ] WebhookLog 记录所有失败的认证尝试
- [ ] 定期轮换 API Key 和 IM 密钥
