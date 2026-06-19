# 密钥管理

## 环境变量

所有敏感配置通过环境变量管理，参考 `.env.example`。

### 必需环境变量

| 变量 | 用途 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@localhost:5433/crm?schema=public` |
| `JWT_SECRET` | JWT 签名密钥 | 随机生成的 256 位字符串 |
| `APP_URL` | 应用 URL | `http://localhost:3003` |
| `NODE_ENV` | 运行环境 | `development` / `production` |

### AI 配置（可选）

| 变量 | 用途 |
|------|------|
| `AI_PROVIDER` | AI 供应商（OPENAI_COMPATIBLE） |
| `AI_BASE_URL` | AI API 地址 |
| `AI_API_KEY` | AI API 密钥 |
| `AI_MODEL` | AI 模型名称 |
| `VISION_BASE_URL` | Vision AI 地址（可选，未配置时使用主 AI） |
| `VISION_API_KEY` | Vision AI 密钥 |
| `VISION_MODEL` | Vision 模型名称 |

## .env 文件管理

### 规则

1. **永远不要提交 `.env` 文件到 Git**
2. `.env.example` 作为模板提交（不含真实值）
3. `.env.local` 用于本地开发覆盖
4. `.env.production` 用于生产环境（不提交）

### .gitignore 确认

确保 `.gitignore` 包含：

```
.env
.env.local
.env.production
.env*.local
```

## 生产环境密钥

### JWT_SECRET 生成

```bash
# 方法 1：使用 OpenSSL
openssl rand -base64 64

# 方法 2：使用 Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 数据库密码

- 使用强随机密码（16+ 字符）
- 不使用与开发环境相同的密码
- PostgreSQL 建议启用 SSL 连接

## 数据库中的敏感数据

### 当前存储方式

| 字段 | 位置 | 存储方式 | 风险等级 |
|------|------|----------|----------|
| User.password | User 表 | bcryptjs 哈希 | 安全 |
| EmailAccount.password | EmailAccount 表 | 明文 | 高 |
| EmailAccount.oauthToken | EmailAccount 表 | 明文 | 高 |
| AIConfig.apiKey | AIConfig 表 | 明文 | 中 |
| IMPlatform.appSecret | IMPlatform 表 | 明文 | 中 |
| IMPlatform.botToken | IMPlatform 表 | 明文 | 中 |
| ExternalSource.apiKeyHash | ExternalSource 表 | SHA-256 哈希 | 安全 |

### 改进建议

1. **邮件密码**：应使用 AES-256 加密存储，密钥通过环境变量注入
2. **AI API Key**：应在应用层加密后存储到数据库
3. **IM 凭据**：应使用 Vault 或环境变量管理
4. **考虑引入密钥管理服务**（如 HashiCorp Vault、AWS Secrets Manager）

## 硬编码回退

### 已知问题

`lib/auth.ts` 中 `JWT_SECRET` 有硬编码 fallback：

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
```

**风险**：如果生产环境未设置 `JWT_SECRET`，系统将使用弱密钥签名 JWT。

**修复**：生产环境启动时应检查 `JWT_SECRET` 是否已设置：

```typescript
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production')
}
```

## 密钥轮换

### JWT Secret 轮换

1. 生成新的 JWT_SECRET
2. 更新环境变量
3. 重启应用
4. 所有现有用户的 Token 将失效，需要重新登录

### 数据库密码轮换

1. 修改 PostgreSQL 用户密码
2. 更新 `DATABASE_URL` 环境变量
3. 重启应用

### AI API Key 轮换

1. 在 AI 供应商平台生成新 Key
2. 更新数据库中的 `AIConfig` 记录
3. （或更新环境变量 `AI_API_KEY`）
