# Open CRM Documentation (English)

> **Note:** Full English translations are not yet available. This index links to the Chinese documentation. For key setup pages, see the quick reference sections below.

[中文文档](../README.md)

## Quick Reference

### Installation

1. Install Node.js 18+, Docker, and npm
2. Clone the repository and run `npm install`
3. Copy `.env.example` to `.env` and configure `DATABASE_URL` and `JWT_SECRET`
4. Start PostgreSQL: `docker run -d --name open-crm-postgres -e POSTGRES_PASSWORD=YOUR_PASSWORD -e POSTGRES_DB=open_crm -p 5433:5432 postgres:16`
5. Run `npx prisma generate && npx prisma db push`
6. Start with `npm run dev`
7. Visit http://localhost:3003
8. Login with `admin@example.com` / `password123`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | JWT signing secret |
| APP_URL | No | Application URL (default http://localhost:3003) |

### Default Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Administrator |

## Documentation Index (Chinese)

The following sections link to the full Chinese documentation. Browser translation is recommended for non-Chinese readers.

### Getting Started
- [System Requirements](../getting-started/01-system-requirements.md)
- [Local Installation](../getting-started/02-local-installation.md)
- [Environment Variables](../getting-started/03-environment-variables.md)
- [Database Setup](../getting-started/04-database-setup.md)
- [First Run](../getting-started/05-first-run.md)
- [Docker Quick Start](../getting-started/06-docker-quick-start.md)
- [Production Build](../getting-started/07-production-build.md)

### User Guide
- [Dashboard](../user-guide/01-dashboard.md)
- [Lead Management](../user-guide/02-leads.md)
- [Customers and Contacts](../user-guide/03-customers-and-contacts.md)
- [Follow-ups and Tasks](../user-guide/04-follow-ups-and-tasks.md)
- [Quote Management](../user-guide/05-quotes.md)
- [Order Management](../user-guide/06-orders.md)
- [Document Management](../user-guide/07-documents.md)
- [Email Management](../user-guide/08-email.md)
- [Calendar](../user-guide/09-calendar.md)
- [Reports](../user-guide/10-reports.md)
- [AI Features](../user-guide/11-ai-features.md)
- [AI Control Panel](../user-guide/12-ai-control-panel.md)
- [System Settings](../user-guide/13-settings.md)

### Admin Guide
- [Admin Overview](../admin-guide/01-admin-overview.md)
- [Users, Roles, and Permissions](../admin-guide/02-users-roles-permissions.md)
- [Tenant Management](../admin-guide/03-tenants.md)
- [System Settings](../admin-guide/04-system-settings.md)
- [AI Control and Policies](../admin-guide/05-ai-control-and-policies.md)
- [Email Account Management](../admin-guide/06-email-account-management.md)
- [Logs and Audit](../admin-guide/07-logs-and-audit.md)
- [Data Import/Export](../admin-guide/08-data-import-export.md)
- [Backup and Recovery](../admin-guide/09-backup-and-recovery.md)
- [Security Checklist](../admin-guide/10-security-checklist.md)

### Email Configuration
- [Email Architecture](../email/01-email-architecture.md)
- [Add Email Account](../email/02-add-email-account.md)
- [Gmail Configuration](../email/03-gmail-configuration.md)
- [Google Workspace](../email/04-google-workspace.md)
- [Microsoft 365](../email/05-microsoft-365.md)
- [Alibaba Enterprise Mail](../email/07-alibaba-mail.md)
- [Tencent Enterprise Mail](../email/08-tencent-enterprise-mail.md)
- [NetEase Enterprise Mail](../email/09-netease-enterprise-mail.md)
- [Custom IMAP/SMTP](../email/11-custom-imap-smtp.md)
- [Email Sync](../email/12-email-sync.md)
- [Email Security](../email/13-email-security.md)
- [Email Troubleshooting](../email/14-email-troubleshooting.md)

### AI Configuration
- [AI Overview](../ai/01-ai-overview.md)
- [Model Provider Configuration](../ai/02-model-provider-configuration.md)
- [API Key Configuration](../ai/03-api-key-configuration.md)
- [AI Control Modes](../ai/04-ai-control-modes.md)
- [AI Policy Rules](../ai/05-ai-policy-rules.md)

### API Documentation
- [API Overview](../api/README.md)
- [Authentication](../api/01-authentication.md)
- [API Conventions](../api/02-api-conventions.md)
- [CRM Endpoints](../api/06-crm-endpoints.md)
- [Email Endpoints](../api/07-email-endpoints.md)
- [AI Endpoints](../api/08-ai-endpoints.md)
- [OpenAPI Spec](../api/openapi-partial.yaml)

### Deployment
- [Deployment Overview](../deployment/01-overview.md)
- [Docker Deployment](../deployment/02-docker.md)
- [Ubuntu VPS](../deployment/03-ubuntu-vps.md)
- [Nginx Reverse Proxy](../deployment/05-reverse-proxy.md)
- [HTTPS Configuration](../deployment/06-https.md)
- [Production Environment](../deployment/07-production-environment.md)
- [Version Upgrades](../deployment/08-upgrade.md)

### Developer
- [Architecture Overview](../developer/01-architecture.md)
- [Project Structure](../developer/02-project-structure.md)
- [Database Models](../developer/03-database-models.md)
- [Server Actions](../developer/04-server-actions.md)
- [API Routes](../developer/05-api-routes.md)
- [Event Bus](../developer/06-event-bus.md)
- [AI Core](../developer/07-ai-core.md)
- [Adding a Module](../developer/09-adding-a-module.md)
- [Code Style](../developer/11-code-style.md)
- [Release Process](../developer/12-release-process.md)

### Security
- [Security Overview](../security/01-security-overview.md)
- [Secrets Management](../security/02-secrets-management.md)
- [Tenant Isolation](../security/03-tenant-isolation.md)
- [Production Checklist](../security/07-production-checklist.md)

### Community
- [Contributing Guide](../../CONTRIBUTING.md)
- [Roadmap](../../ROADMAP.md)
- [Code of Conduct](../../CODE_OF_CONDUCT.md)
- [Maintainer Guide](../community/maintainer-guide.md)

### Troubleshooting
- [Installation Issues](../troubleshooting/01-installation.md)
- [Database Issues](../troubleshooting/02-database.md)
- [Email Issues](../troubleshooting/03-email.md)
- [AI Issues](../troubleshooting/04-ai-api.md)
- [Docker Issues](../troubleshooting/06-docker.md)
- [Build Cache](../troubleshooting/07-build-cache.md)
