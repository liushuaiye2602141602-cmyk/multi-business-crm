# 安全架构

Multi-Business CRM 的安全体系涵盖认证授权、数据隔离、AI 控制和通信安全。

## 安全层次

```
┌─────────────────────────────────────────┐
│           AI Control Guard               │
│  策略规则 · 执行模式 · 工作时间限制       │
├─────────────────────────────────────────┤
│          认证与授权（Auth）               │
│  JWT Token · Middleware · Role-based     │
├─────────────────────────────────────────┤
│         数据隔离（Tenant）               │
│  tenantId · 公海池 · 权限边界            │
├─────────────────────────────────────────┤
│         通信安全（Transport）            │
│  HTTPS · SMTP/TLS · Webhook 签名        │
└─────────────────────────────────────────┘
```

## 1. JWT 认证

### 认证流程

```
用户登录 → POST /api/auth/login
         → 验证用户名/密码（bcryptjs）
         → 生成 JWT Token（7 天有效期）
         → 写入 auth_token cookie

后续请求 → Middleware 检查 auth_token
         → verifyToken() 验证签名和过期时间
         → 未通过 → 重定向到 /login
```

### 关键文件

| 文件 | 作用 |
|------|------|
| `middleware.ts` | Next.js Middleware，拦截所有非静态资源请求 |
| `lib/auth.ts` | JWT 工具函数（hashPassword, verifyPassword, generateToken, verifyToken, getCurrentUser, requireAuth） |

### JWT 配置

- **签名算法**：HMAC SHA-256（jsonwebtoken 库默认）
- **密钥来源**：环境变量 `JWT_SECRET`
- **过期时间**：7 天
- **安全说明**：`lib/auth.ts` 中包含 JWT_SECRET 的硬编码 fallback，**生产环境务必设置环境变量覆盖**

### 角色权限

| 角色 | 说明 |
|------|------|
| ADMIN | 系统管理员，完整权限 |
| MANAGER | 管理者，可管理团队和数据 |
| SALES | 销售人员，基础业务操作 |

### 路由保护

Middleware 自动保护所有路由，以下例外：

- `/login` 页面
- `/api/auth/*` 路由
- 静态资源（`_next/static`、`_next/image`、`favicon.ico`）

## 2. Middleware 安全

### middleware.ts 行为

```typescript
// 伪代码
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')

  // 白名单路径直接放行
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // 无 token → 重定向到登录页
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 验证 token
  try {
    verifyToken(token.value)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

### matcher 配置

匹配除静态资源外的所有请求路径。

## 3. 租户隔离

详见 `docs/security/03-tenant-isolation.md`。

核心模型（Lead、Customer、Quote、Order、Task、AIControlSettings、AIPolicyRule）通过 `tenantId` 字段实现数据隔离。

### 公海池机制

未分配 `ownerId` 的 Customer 处于"公海"状态，任何销售人员都可以领取（claim）。领取后成为该销售人员的私有客户。

## 4. AI Control Guard

AI 操作的安全护栏，位于 `lib/ai/control/guard.ts`。

### 5 步检查

```
1. 全局开关 → AIControlSettings.aiEnabled
2. 模块开关 → 对应功能模块开关
3. 工作时间 → workHoursStart ~ workHoursEnd
4. 策略规则 → HARD 级别规则直接拦截
5. 速率限制 → maxContactsPerDay
```

### 执行模式

| 模式 | 说明 |
|------|------|
| MANUAL | 仅提供建议，不自动执行 |
| APPROVAL | AI 建议需人工审批后执行 |
| AUTO | AI 自动执行（受策略规则约束） |

### 策略规则

- **HARD（硬性）**：违反时直接阻止操作，不可绕过
- **SOFT（软性）**：违反时发出警告，但允许执行

所有 AI 执行结果记录到 `AIExecutionLog` 表。

## 5. 通信安全

### 邮件

- SMTP 连接支持 TLS 加密
- 邮件密码存储在数据库中（EmailAccount 表）
- 建议在生产环境使用环境变量或加密存储

### Webhook

- 外部 Webhook 通过 API Key 认证
- API Key 使用 SHA-256 哈希存储（`apiKeyHash` 字段）
- 验证逻辑位于 `lib/webhook.ts`

### 飞书 Bot

- 使用签名验证（`lib/im/feishu.ts`）
- Webhook 端点需要正确的 encryptKey 和 verifyToken

## 6. 已知安全注意事项

1. **JWT_SECRET fallback**：`lib/auth.ts` 中的硬编码 fallback 仅用于开发，生产环境必须设置 `JWT_SECRET` 环境变量
2. **邮件密码存储**：EmailAccount 的 password 字段以明文存储，建议生产环境加密
3. **AI API Key**：AIConfig 的 apiKey 字段在数据库中存储，建议使用加密
4. **无 CSRF 保护**：当前仅依赖 SameSite cookie 属性
5. **无速率限制**：API Route 层面暂无全局速率限制（仅 AI Guard 有）
6. **无 Content Security Policy**：未配置 CSP headers

## 安全文档索引

| 文档 | 内容 |
|------|------|
| [01-security-overview.md](./01-security-overview.md) | 安全架构总览（本文件） |
| [02-secrets-management.md](./02-secrets-management.md) | 密钥管理 |
| [03-tenant-isolation.md](./03-tenant-isolation.md) | 租户数据隔离 |
| [07-production-checklist.md](./07-production-checklist.md) | 生产环境安全检查清单 |
