# 认证 API

## POST /api/auth/login
用户登录。

请求体:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

响应 (200):
```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "name": "张三",
    "email": "user@example.com",
    "role": "SALES",
    "tenantId": 1
  }
}
```

Cookie: `auth_token` (httpOnly, 7 days expiry)

密码使用 bcryptjs 加密（salt rounds = 10）。

用户角色: ADMIN, MANAGER, SALES（默认 SALES）

## GET /api/auth/logout
用户登出。清除 `auth_token` cookie。

响应:
```json
{
  "message": "已登出"
}
```

## GET /api/auth/me
获取当前登录用户信息。

响应 (200):
```json
{
  "user": {
    "id": 1,
    "name": "张三",
    "email": "user@example.com",
    "role": "SALES",
    "tenantId": 1
  }
}
```

未认证返回 401。

## 认证中间件
`middleware.ts` 保护所有路由（除 `/login`、`/api/auth/*`、静态资源）。
未认证时自动重定向到 `/login`。

JWT payload: `{ id, name, email, role, tenantId }`
Token 签名: HS256
库: jsonwebtoken
