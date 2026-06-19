# 安全检查清单 (Security Checklist)

## 生产环境安全清单

在将系统部署到生产环境之前，请确认以下所有安全措施已落实。

## 1. 密码与认证

- [ ] **JWT Secret** — 使用强随机字符串作为 JWT Secret，长度 >= 32 字符
  - 环境变量：`JWT_SECRET`
  - 禁止使用默认值或简单字符串
- [ ] **密码哈希** — 确认用户密码使用 bcrypt 哈希存储
- [ ] **Session 过期** — JWT Token 设置合理的过期时间
- [ ] **默认密码** — 生产环境必须修改 Seed 数据中的默认密码
- [ ] **密码策略** — 实施最小密码长度和复杂度要求

## 2. API 安全

- [ ] **CORS 配置** — 限制允许的 Origin，禁止 `*` 通配符
- [ ] **Rate Limiting** — 对敏感接口（登录、密码重置）实施频率限制
- [ ] **输入校验** — 所有 API 入口进行输入验证和净化
- [ ] **SQL 注入** — 确认使用 Prisma ORM（参数化查询）
- [ ] **API Key 保护** — Webhook API Key 使用哈希存储（`hashApiKey`）
- [ ] **邮件密码脱敏** — API 返回邮件账户信息时对密码字段脱敏

## 3. HTTPS

- [ ] **全站 HTTPS** — 使用反向代理（Nginx/Caddy）强制 HTTPS
- [ ] **HSTS 头** — 设置 `Strict-Transport-Security` 响应头
- [ ] **证书管理** — 配置自动证书续期（Let's Encrypt 等）

## 4. 数据库安全

- [ ] **强密码** — PostgreSQL 使用强密码
- [ ] **网络隔离** — 数据库端口不暴露到公网
- [ ] **非 root 用户** — 数据库连接使用非 root 用户
- [ ] **备份加密** — 备份文件加密存储
- [ ] **连接 SSL** — 数据库连接使用 SSL

```env
# .env 安全配置示例
DATABASE_URL="postgresql://crm_user:YOUR_PASSWORD@localhost:5432/crm_database?schema=public"
```

## 5. AI API Key 安全

- [ ] **API Key 存储** — AI API Key 仅存储在数据库或环境变量中
- [ ] **API Key 脱敏** — GET 接口返回时截断并添加 `****` 后缀
- [ ] **Vision API Key** — 单独配置，不与主 API Key 混用
- [ ] **API 配额** — 在 AI Provider 侧设置用量上限

```env
# .env AI 配置
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_API_KEY="YOUR_API_KEY"
AI_MODEL="gpt-4o"
AI_BASE_URL="https://api.openai.com/v1"
```

## 6. IM 平台安全

- [ ] **Webhook 签名验证** — 飞书 Webhook 使用 SHA256 签名验证
- [ ] **App Secret 保护** — IM 平台的 AppSecret 不暴露到前端
- [ ] **Bot Token 安全** — Bot Token 仅存储在数据库中

## 7. 邮件安全

- [ ] **密码加密存储** — EmailAccount.password 应加密存储（当前为明文）
- [ ] **TLS 连接** — SMTP/IMAP 使用 SSL/TLS 连接
- [ ] **OAuth 推荐** — Gmail 等支持 OAuth 的提供商优先使用 OAuth
- [ ] **密码脱敏** — 邮件账户列表 API 返回时隐藏密码

> **当前已知问题：** 邮件密码以明文存储在数据库中，API 返回时不脱敏。生产环境应优先解决此问题。

## 8. Docker 安全

- [ ] **非 root 运行** — 容器以非 root 用户运行
- [ ] **镜像更新** — 定期更新 Docker 基础镜像
- [ ] **端口限制** — 仅暴露必要端口
- [ ] **Volume 权限** — Docker Volume 文件权限正确

## 9. 日志与审计

- [ ] **敏感信息** — 日志中不记录密码、API Key 等敏感信息
- [ ] **日志存储** — 日志文件有定期清理机制
- [ ] **访问审计** — 关键操作记录到 ActivityLog

## 10. 依赖安全

```bash
# 检查已知漏洞
npm audit

# 修复漏洞
npm audit fix
```

- [ ] **定期审计** — 每月执行 `npm audit`
- [ ] **依赖更新** — 及时更新有安全漏洞的依赖
- [ ] **锁文件** — 确认 `package-lock.json` 已提交到版本控制

## 紧急响应

发现安全问题时的处理步骤：

1. 立即更改受影响的密码和 API Key
2. 检查 Access Log 确认影响范围
3. 从最近的备份恢复数据（如有需要）
4. 更新系统和依赖
5. 记录事件并通知相关人员
