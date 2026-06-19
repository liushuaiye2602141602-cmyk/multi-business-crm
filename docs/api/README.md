# API 概览

## Base URL
- 开发环境: `http://localhost:3003`
- 生产环境: `http://localhost:3000`

## 认证方式
JWT (JSON Web Token) — 通过 httpOnly cookie `auth_token` 传递。
Token 有效期: 7 天。

## 请求格式
- Content-Type: `application/json`
- 认证: Cookie-based (httpOnly, secure in production, sameSite: lax)

## API 模块一览
| 模块 | 路由前缀 | 说明 |
|------|---------|------|
| 认证 | `/api/auth/*` | 登录/登出/当前用户 |
| AI | `/api/ai/*` | AI 分析/建议/聊天 |
| AI 控制 | `/api/ai-control/*` | AI 控制面板设置 |
| 邮件 | `/api/email/*` | 邮件账户/发送/收件箱/线程 |
| 通讯 | `/api/communication/*` | 统一消息/身份识别 |
| 财务 | `/api/finance/*` | 发票/付款 |
| IM | `/api/im/*` | 即时通讯平台/飞书 |
| 导入 | `/api/import/*` | CSV 数据导入 |
| 导出 | `/api/export/*` | CSV 数据导出 |
| Webhook | `/api/webhooks/*` | 外部线索 Webhook |
| 日历 | `/api/calendar-events` | 日历事件 |
| 活动日志 | `/api/activity-logs` | 操作日志 |

## 通用响应格式
```json
{
  "message": "操作成功",
  "data": { ... }
}
```

## 错误响应格式
```json
{
  "error": "错误信息",
  "details": "详细信息（可选）"
}
```

## HTTP 状态码
- 200: 成功
- 201: 创建成功
- 400: 请求参数错误
- 401: 未认证（跳转登录页）
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误

## 分页
列表接口支持查询参数: `page`, `limit`（默认值视接口而定）。
