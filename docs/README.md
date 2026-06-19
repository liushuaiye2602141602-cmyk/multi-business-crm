# Open CRM 文档

## 目录

### Getting Started
- [系统要求](getting-started/01-system-requirements.md)
- [本地安装](getting-started/02-local-installation.md)
- [环境变量配置](getting-started/03-environment-variables.md)
- [数据库设置](getting-started/04-database-setup.md)
- [首次运行](getting-started/05-first-run.md)
- [Docker 快速启动](getting-started/06-docker-quick-start.md)
- [生产构建](getting-started/07-production-build.md)

### 用户手册
- [工作台](user-guide/01-dashboard.md)
- [线索管理](user-guide/02-leads.md)
- [客户与联系人](user-guide/03-customers-and-contacts.md)
- [跟进与任务](user-guide/04-follow-ups-and-tasks.md)
- [报价管理](user-guide/05-quotes.md)
- [订单管理](user-guide/06-orders.md)
- [文档管理](user-guide/07-documents.md)
- [邮件管理](user-guide/08-email.md)
- [日程管理](user-guide/09-calendar.md)
- [数据报表](user-guide/10-reports.md)
- [AI 功能](user-guide/11-ai-features.md)
- [AI 控制面板](user-guide/12-ai-control-panel.md)
- [系统设置](user-guide/13-settings.md)

### 管理员手册
- [管理概览](admin-guide/01-admin-overview.md)
- [用户角色权限](admin-guide/02-users-roles-permissions.md)
- [租户管理](admin-guide/03-tenants.md)
- [系统设置](admin-guide/04-system-settings.md)
- [AI 控制与策略](admin-guide/05-ai-control-and-policies.md)
- [邮箱账号管理](admin-guide/06-email-account-management.md)
- [日志与审计](admin-guide/07-logs-and-audit.md)
- [数据导入导出](admin-guide/08-data-import-export.md)
- [备份与恢复](admin-guide/09-backup-and-recovery.md)
- [安全检查清单](admin-guide/10-security-checklist.md)

### 邮箱配置
- [邮箱架构](email/01-email-architecture.md)
- [添加邮箱账号](email/02-add-email-account.md)
- [Gmail 配置](email/03-gmail-configuration.md)
- [Google Workspace](email/04-google-workspace.md)
- [Microsoft 365](email/05-microsoft-365.md)
- [阿里企业邮箱](email/07-alibaba-mail.md)
- [腾讯企业邮箱](email/08-tencent-enterprise-mail.md)
- [网易企业邮箱](email/09-netease-enterprise-mail.md)
- [自定义 IMAP/SMTP](email/11-custom-imap-smtp.md)
- [邮件同步](email/12-email-sync.md)
- [邮件安全](email/13-email-security.md)
- [邮件故障排查](email/14-email-troubleshooting.md)

### AI 配置
- [AI 概览](ai/01-ai-overview.md)
- [模型配置](ai/02-model-provider-configuration.md)
- [API Key 配置](ai/03-api-key-configuration.md)
- [AI 控制模式](ai/04-ai-control-modes.md)
- [AI 策略规则](ai/05-ai-policy-rules.md)
- [AI 事件流](ai/06-ai-event-flow.md)
- [AI 执行日志](ai/07-ai-execution-logs.md)
- [AI 安全](ai/08-ai-safety.md)
- [AI 故障排查](ai/09-ai-troubleshooting.md)

### 机器人配置
- [机器人架构](bots/01-bot-architecture.md)
- [通用 Webhook](bots/02-generic-webhook-bot.md)
- [飞书机器人](bots/03-feishu-bot.md)
- [企业微信](bots/04-wecom-bot.md)
- [WebChat](bots/06-webchat.md)
- [n8n 集成](bots/07-n8n-integration.md)
- [机器人安全](bots/08-bot-security.md)
- [机器人故障排查](bots/09-bot-troubleshooting.md)

### API 文档
- [API 概览](api/README.md)
- [认证](api/01-authentication.md)
- [API 约定](api/02-api-conventions.md)
- [错误格式](api/03-error-format.md)
- [CRM 端点](api/06-crm-endpoints.md)
- [邮箱端点](api/07-email-endpoints.md)
- [AI 端点](api/08-ai-endpoints.md)
- [OpenAPI 规范](api/openapi-partial.yaml)

### 部署
- [部署概览](deployment/01-overview.md)
- [Docker 部署](deployment/02-docker.md)
- [Ubuntu VPS](deployment/03-ubuntu-vps.md)
- [Nginx 反向代理](deployment/05-reverse-proxy.md)
- [HTTPS 配置](deployment/06-https.md)
- [生产环境](deployment/07-production-environment.md)
- [版本升级](deployment/08-upgrade.md)

### 数据与备份
- [数据存储](data/01-data-storage.md)
- [PostgreSQL](data/02-postgresql.md)
- [备份](data/04-backup.md)
- [恢复](data/05-restore.md)
- [数据迁移](data/06-migration.md)

### 开发者
- [架构概览](developer/01-architecture.md)
- [项目结构](developer/02-project-structure.md)
- [数据库模型](developer/03-database-models.md)
- [Server Actions](developer/04-server-actions.md)
- [API 路由](developer/05-api-routes.md)
- [Event Bus](developer/06-event-bus.md)
- [AI Core](developer/07-ai-core.md)
- [添加新模块](developer/09-adding-a-module.md)
- [代码规范](developer/11-code-style.md)
- [发布流程](developer/12-release-process.md)

### 安全
- [安全概览](security/01-security-overview.md)
- [密钥管理](security/02-secrets-management.md)
- [租户隔离](security/03-tenant-isolation.md)
- [生产检查清单](security/07-production-checklist.md)

### 社区
- [贡献指南](../CONTRIBUTING.md)
- [路线图](../ROADMAP.md)
- [行为规范](../CODE_OF_CONDUCT.md)
- [维护者指南](community/maintainer-guide.md)

### 故障排查
- [安装问题](troubleshooting/01-installation.md)
- [数据库问题](troubleshooting/02-database.md)
- [邮箱问题](troubleshooting/03-email.md)
- [AI 问题](troubleshooting/04-ai-api.md)
- [Docker 问题](troubleshooting/06-docker.md)
- [构建缓存](troubleshooting/07-build-cache.md)
