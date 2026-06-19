# 生产环境安全检查清单

部署前请逐项确认以下安全检查。

## 认证与授权

- [ ] `JWT_SECRET` 已设置为强随机字符串（256 位+）
- [ ] 移除了 `lib/auth.ts` 中的硬编码 JWT_SECRET fallback（或确保生产环境必定注入）
- [ ] 密码使用 bcryptjs 哈希存储
- [ ] Middleware 正确拦截所有非白名单路由
- [ ] 未认证用户无法访问任何业务页面和 API
- [ ] 确认角色权限（ADMIN/MANAGER/SALES）配置正确

## 数据库安全

- [ ] PostgreSQL 使用强密码
- [ ] 数据库仅监听 localhost（不暴露到公网）
- [ ] DATABASE_URL 使用 SSL 连接（生产环境建议）
- [ ] 定期执行数据库备份
- [ ] 备份文件存储在安全位置

## 密钥管理

- [ ] `.env` 文件未提交到 Git
- [ ] `.gitignore` 包含 `.env`、`.env.local`、`.env.production`
- [ ] 所有 API Key 不硬编码在代码中
- [ ] AI API Key、IM AppSecret 等敏感数据加密存储

## 网络安全

- [ ] 应用通过 HTTPS 提供服务（使用反向代理如 Nginx）
- [ ] 已配置安全响应头（HSTS、X-Content-Type-Options 等）
- [ ] 数据库端口不暴露到公网
- [ ] Webhook 端点启用 API Key 验证

## 数据隔离

- [ ] 核心模型（Lead、Customer、Quote、Order、Task）有 tenantId
- [ ] 查询操作正确使用 tenantId 过滤
- [ ] 公海池操作有权限控制

## AI 安全

- [ ] AI Control Guard 已启用（`aiEnabled: true`）
- [ ] 执行模式设置为 MANUAL 或 APPROVAL（除非确定需要 AUTO）
- [ ] HARD 级别策略规则已配置
- [ ] 工作时间限制已设置
- [ ] AI 执行日志正常记录

## 应用安全

- [ ] 生产环境 `NODE_ENV=production`
- [ ] 禁用 Next.js 开发模式功能
- [ ] 错误页面不泄露敏感信息
- [ ] 日志中不记录密码和 API Key

## 部署安全

- [ ] Docker 镜像使用最新基础镜像
- [ ] 容器以非 root 用户运行
- [ ] 不在容器中存储持久化数据（使用 Volume）
- [ ] 健康检查端点可用

## 定期维护

- [ ] 定期更新依赖（`npm audit`）
- [ ] 定期轮换 JWT_SECRET
- [ ] 定期审查用户角色和权限
- [ ] 监控异常登录和 API 调用
- [ ] 备份恢复演练（至少每季度一次）
