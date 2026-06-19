# 管理员概览 (Admin Overview)

## 管理员角色定义

系统中有三种用户角色，通过 `User.role` 字段区分：

| 角色 | 说明 |
|------|------|
| `ADMIN` | 系统管理员，拥有全部管理功能 |
| `MANAGER` | 部门经理，可管理下属数据和业务配置 |
| `SALES` | 普通销售人员，仅操作自身业务数据 |

## 管理员可执行的操作

### 系统配置

- **AI 配置** (`/ai-settings`) — 管理 LLM Provider、API Key、Vision Model 配置
- **AI 控制面板** (`/ai-control-panel`) — 全局 AI 开关、执行模式、策略规则、工时限制
- **IM 配置** (`/im-settings`) — 添加/编辑飞书、Telegram、企业微信等 IM 平台
- **邮件配置** (`/email/accounts`) — 添加/管理多个 Email Account
- **业务线管理** (`/business-lines`) — 创建/编辑业务线（如 FLEX、PACK、WOOD）
- **外部来源** (`/external-sources`) — 管理 Webhook 来源、API Key 分发
- **系统健康检查** (`/system-health`) — 数据库状态、AI 配置、Webhook 状态

### 用户与权限

- **用户管理** — 创建用户、分配角色 (ADMIN/MANAGER/SALES)、关联 Tenant
- **Tenant 管理** — 通过数据库管理租户（当前无 UI 管理界面，参见 [Tenant 文档](./03-tenants.md)）

### 数据管理

- **CSV 导入** (`/imports`) — 导入线索、客户、产品数据
- **CSV 导出** (`/exports`) — 导出线索、客户、项目、报价、任务、跟进记录等
- **数据库备份** — 使用 `backup-db.bat` / `restore-db.bat` 脚本

### 监控与审计

- **Activity Logs** (`/activity-logs`) — 查看系统操作日志
- **AI 执行日志** (`/ai-control-panel`) — 查看 AI 操作审批记录
- **Webhook 日志** (`/webhook-logs`) — 查看外部来源调用记录
- **IM 消息记录** (`/im-messages`) — 查看 IM 平台消息历史

## 当前限制

1. **无 RBAC UI** — 角色通过数据库设置，没有可视化的权限配置界面
2. **租户管理无 UI** — Tenant 数据仅能通过数据库直接操作
3. **无审计日志筛选** — ActivityLog 仅显示最近 100 条记录，不支持按用户筛选
4. **角色权限未强制执行** — 当前代码中未实现基于角色的访问控制中间件

## 相关页面路由

| 路径 | 功能 |
|------|------|
| `/dashboard` | 主仪表板 |
| `/settings` | 系统设置中心 |
| `/ai-settings` | AI 模型配置 |
| `/ai-control-panel` | AI 控制面板 |
| `/im-settings` | IM 平台配置 |
| `/email/accounts` | 邮件账户管理 |
| `/business-lines` | 业务线管理 |
| `/external-sources` | 外部来源管理 |
| `/system-health` | 系统健康检查 |
| `/activity-logs` | 操作日志 |
| `/imports` | 数据导入 |
| `/exports` | 数据导出 |
