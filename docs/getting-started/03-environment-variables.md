# 环境变量配置

## 配置方法

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

## 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| DATABASE_URL | PostgreSQL 连接字符串 | `postgresql://postgres:YOUR_PASSWORD@localhost:5433/open_crm?schema=public` |
| JWT_SECRET | JWT 签名密钥（生产环境必须更换） | `your-random-secret-key` |

## 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| APP_URL | 应用地址 | `http://localhost:3003` |
| NODE_ENV | 运行环境 | `development` |

## AI 配置（可选）

| 变量 | 说明 |
|------|------|
| AI_PROVIDER | AI 提供商 |
| AI_BASE_URL | AI API 地址 |
| AI_API_KEY | AI API Key |
| AI_MODEL | AI 模型名称 |

## 安全提示

- `.env` 文件已加入 `.gitignore`，不会提交到 GitHub
- 生产环境必须使用强密码和随机 JWT_SECRET
- 不要在公开场合分享 `.env` 文件内容
