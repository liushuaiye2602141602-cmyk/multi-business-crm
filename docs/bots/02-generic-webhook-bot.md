# 通用 Webhook Bot (Generic Webhook Bot)

## 概述

通用 Webhook Bot 允许外部系统（网站表单、Facebook Lead Ads、TikTok、N8N 工作流等）通过 HTTP POST 推送线索数据到 CRM 系统。

## 接口信息

```
POST /api/webhooks/leads
```

## 认证方式

每个外部来源 (ExternalSource) 有独立的 API Key，通过 HTTP Header 认证：

| Header | 说明 | 示例 |
|--------|------|------|
| `x-crm-source-code` | 来源代码 | `website_form_01` |
| `x-crm-api-key` | API Key | `crm_sk_xxxxxxxxxxxx` |

### API Key 生成

API Key 通过以下工具函数生成：

```typescript
// lib/webhook.ts
generateApiKey()   // 生成 crm_sk_ 前缀的随机 Key
hashApiKey(key)    // SHA256 哈希
verifyApiKey(key, hash)  // 验证 Key 是否匹配哈希
```

数据库中存储的是 API Key 的 SHA256 哈希值 (`ExternalSource.apiKeyHash`)，而非明文。

## 请求格式

### Content-Type

```
Content-Type: application/json
```

### 请求体

```json
{
  "company": "ABC Trading Co.",
  "contactName": "John Smith",
  "email": "john@abctrading.com",
  "phone": "+1-555-0123",
  "country": "USA",
  "message": "I'm interested in your flexible packaging products",
  "source": "WEBSITE"
}
```

### 可选字段

| 字段 | 说明 |
|------|------|
| `company` | 公司名称（必填） |
| `contactName` | 联系人姓名（必填） |
| `email` | 邮箱地址 |
| `phone` | 电话号码 |
| `whatsapp` | WhatsApp 号码 |
| `country` | 国家 |
| `message` | 留言内容 |
| `source` | 来源类型 |
| `interestProducts` | 感兴趣的产品 |

## 响应格式

### 成功 (200)

```json
{
  "success": true,
  "message": "Lead created successfully",
  "leadId": 42
}
```

### 重复线索 (200)

```json
{
  "success": true,
  "message": "Duplicate lead detected",
  "leadId": 15,
  "duplicate": true
}
```

### 认证失败 (401)

```json
{
  "success": false,
  "error": "Unauthorized: Invalid API key"
}
```

### 验证失败 (400)

```json
{
  "success": false,
  "error": "Validation error: company is required"
}
```

## 处理流程

```
1. 解析 x-crm-source-code 和 x-crm-api-key Header
2. 查找 ExternalSource（按 code 匹配）
3. 验证 API Key 哈希
4. 检查来源是否激活 (isActive)
5. 解析请求体
6. 去重检查（按 email 匹配）
7. 创建 Lead 记录
   - 使用 ExternalSource 的默认值（defaultSource, defaultLeadGrade）
   - 关联 businessLineId
   - 记录 tenantId（当前硬编码为 1）
8. 可选：触发 AI 分析（如果 autoAnalyze=true）
9. 写入 WebhookLog
10. 写入 ActivityLog
11. 返回响应
```

## ExternalSource 配置

### 数据模型

```prisma
model ExternalSource {
  id               Int      @id @default(autoincrement())
  name             String
  code             String   @unique      // 来源代码（用于 Header 认证）
  sourceType       ExternalSourceType   // 来源类型
  businessLineId   Int?                 // 关联业务线
  defaultSource    LeadSource           // 默认线索来源
  defaultLeadGrade LeadGrade            // 默认线索等级
  defaultPriority  TaskPriority         // 默认任务优先级
  apiKeyHash       String?              // API Key 哈希
  isActive         Boolean  @default(true)
  autoAnalyze      Boolean  @default(false)  // 是否自动 AI 分析
  notes            String?
}
```

### ExternalSourceType 枚举

| 类型 | 说明 |
|------|------|
| `WEBSITE_FORM` | 网站表单 |
| `FACEBOOK_FORM` | Facebook Lead Ads |
| `TIKTOK_MANUAL` | TikTok 手动导入 |
| `N8N` | N8N 自动化工作流 |
| `AI_MARKETING_SYSTEM` | AI 营销系统 |
| `WHATSAPP_MANUAL` | WhatsApp 手动导入 |
| `OTHER` | 其他来源 |

## 管理界面

| 页面 | 路由 | 功能 |
|------|------|------|
| 来源管理 | `/external-sources` | 创建/编辑外部来源 |
| 来源详情 | `/external-sources/[id]` | 查看来源详情和统计 |
| Webhook 测试 | `/webhook-test` | 发送测试 Webhook 请求 |
| Webhook 日志 | `/webhook-logs` | 查看所有 Webhook 调用记录 |

## 日志记录

每次 Webhook 调用都记录到 `WebhookLog`：

```json
{
  "externalSourceId": 1,
  "sourceCode": "website_form_01",
  "status": "SUCCESS",
  "requestBody": "{...}",
  "responseBody": "{...}",
  "createdLeadId": 42,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

## 安全建议

- 使用 HTTPS 传输
- 定期轮换 API Key
- 在外部来源配置中限制 IP 白名单（如果提供商支持）
- 监控 WebhookLog 中的 UNAUTHORIZED 状态
