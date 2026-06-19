# 15 - Missing Components Audit

> 审计日期：2026-06-19

## 一、基础运行能力

| # | 组件 | 状态 | 说明 |
|---|------|------|------|
| 1 | package.json | ✅ 完整 | 14 dependencies + 13 devDependencies |
| 2 | package-lock.json | ✅ 完整 | 344 KB 锁定文件 |
| 3 | Next.js 配置 | ✅ 完整 | next.config.ts (standalone output) |
| 4 | TypeScript 配置 | ✅ 完整 | tsconfig.json |
| 5 | Tailwind 配置 | ✅ 完整 | postcss.config.mjs + globals.css |
| 6 | Prisma 配置 | ✅ 完整 | prisma.config.ts |
| 7 | PostgreSQL 连接 | ✅ 完整 | Docker 容器，端口 5433 |
| 8 | .env.example | ✅ 完整 | 含所有必要变量 |
| 9 | Dockerfile | ✅ 完整 | 多阶段构建 |
| 10 | docker-compose.yml | ✅ 完整 | PostgreSQL + App |
| 11 | 数据库迁移 | ✅ 完整 | 2 个迁移文件 |
| 12 | Seed 脚本 | ⚠️ 部分实现 | 种子数据存在但执行报错（唯一约束冲突） |
| 13 | Build 脚本 | ✅ 完整 | `npm run build` |
| 14 | Start 脚本 | ✅ 完整 | `npm run start` |
| 15 | 部署说明 | ✅ 完整 | docs/deployment/README.md |

## 二、核心 CRM 功能

| # | 组件 | 状态 | 说明 |
|---|------|------|------|
| 1 | 登录与退出 | ✅ 完整 | /login + middleware + JWT |
| 2 | 用户管理 | ⚠️ 部分实现 | User 模型存在，无用户管理页面 |
| 3 | 租户管理 | ⚠️ 部分实现 | Tenant 模型存在，无租户管理页面 |
| 4 | 角色与权限 | ⚠️ 部分实现 | role 字段存在，无 RBAC UI |
| 5 | Leads | ✅ 完整 | CRUD + 状态流转 + AI |
| 6 | Customers | ✅ 完整 | CRUD + 公海 + 沉睡检测 |
| 7 | Contacts | ✅ 完整 | CRUD + 主联系人 |
| 8 | Follow-ups | ✅ 完整 | CRUD + 自动任务 |
| 9 | Tasks | ✅ 完整 | CRUD + 自动创建 + 超期检测 |
| 10 | Quotes | ✅ 完整 | CRUD + 状态流转 + 金额计算 |
| 11 | Quote Items | ✅ 完整 | CRUD + 自动合计 |
| 12 | Orders | ✅ 完整 | CRUD + 状态流转 + 从 Quote 转换 |
| 13 | Order Items | ✅ 完整 | CRUD + 自动合计 |
| 14 | Documents | ✅ 完整 | CRUD，但无实际文件上传 |
| 15 | Projects | ✅ 完整 | CRUD |
| 16 | Invoices | ✅ 完整 | CRUD + 收款记录 |
| 17 | Payments | ✅ 完整 | 通过 Invoice 关联 |
| 18 | Calendar | ✅ 完整 | CRUD + 月历视图 |
| 19 | Dashboard | ✅ 完整 | 漏斗 + 收入 + 任务 + AI 洞察 |
| 20 | Reports | ✅ 完整 | 6 个图表报表 |
| 21 | Activity Logs | ✅ 完整 | 自动记录 |
| 22 | Audit Logs | ⚠️ 部分实现 | AIExecutionLog 存在但未充分写入 |
| 23 | 数据导入 | ⚠️ 部分实现 | CSV 导入存在 |
| 24 | 数据导出 | ⚠️ 部分实现 | CSV 导出存在 |
| 25 | 搜索与筛选 | ✅ 完整 | 全局搜索 + 各模块筛选 |
| 26 | 分页 | ⚠️ 部分实现 | 部分页面有分页，部分没有 |
| 27 | 错误页面 | ✅ 完整 | 404 + 500 |
| 28 | Loading 状态 | ⚠️ 部分实现 | 部分页面有 loading state |
| 29 | 表单验证 | ❌ 缺失 | 无客户端验证库（无 zod/yup） |
| 30 | 操作确认 | ⚠️ 部分实现 | 部分删除有确认弹窗 |

## 三、通信与 AI 能力

| # | 组件 | 状态 | 说明 |
|---|------|------|------|
| 1 | Email 账号管理 | ✅ 完整 | EmailAccount CRUD |
| 2 | Email 收发 | ✅ 完整 | SMTP + IMAP |
| 3 | Email 附件 | ❌ 缺失 | 不支持 |
| 4 | Email 同步 | ⚠️ 部分实现 | 手动触发，无自动 |
| 5 | Email 线程 | ✅ 完整 | EmailThread |
| 6 | 统一消息模型 | ✅ 完整 | Message 模型 |
| 7 | WhatsApp | ❌ 缺失 | 仅有 IM 框架预留 |
| 8 | WebChat | ❌ 缺失 | 仅有 Message 模型字段 |
| 9 | AI Core Engine | ✅ 完整 | lib/ai/core.ts |
| 10 | Event Bus | ✅ 完整 | lib/events/bus.ts |
| 11 | AI Control Guard | ✅ 完整 | 已接入 leads/quotes |
| 12 | AI 策略 | ✅ 完整 | AIPolicyRule + CRUD |
| 13 | AI 执行日志 | ⚠️ 部分实现 | 模型存在，部分写入 |
| 14 | AI 总开关 | ✅ 完整 | AIControlSettings |
| 15 | AI 模块开关 | ✅ 完整 | 5 个模块独立开关 |
| 16 | AI 审批模式 | ✅ 完整 | MANUAL/APPROVAL/AUTO |
| 17 | AI 自动模式 | ✅ 完整 | AUTO 模式可绕过 SOFT 规则 |
| 18 | 失败重试 | ❌ 缺失 | AI 调用无重试机制 |
| 19 | 频率限制 | ✅ 完整 | 每日最大触达数 |
| 20 | 自动任务去重 | ⚠️ 部分实现 | 有检查但不完善 |

## 四、影响生产环境的缺失项

| 优先级 | 缺失项 | 影响 |
|--------|--------|------|
| **P0** | 无文件上传存储 | Document 模型有 fileUrl 但无上传功能 |
| **P0** | Email 附件不支持 | 无法发送/接收附件 |
| **P0** | 表单无验证 | 可提交空表单或非法数据 |
| **P1** | 租户管理无 UI | 无法管理多租户 |
| **P1** | 用户管理无 UI | 无法管理用户账号 |
| **P1** | 角色权限无 UI | 无法配置权限 |
| **P1** | 分页不完整 | 部分列表无分页 |
| **P1** | AI 失败无重试 | AI 调用失败后无恢复 |
| **P2** | WhatsApp 未实现 | 仅有模型预留 |
| **P2** | WebChat 未实现 | 仅有模型字段 |
| **P2** | Seed 脚本报错 | 首次部署无法自动初始化 |
| **P3** | Loading 状态不完整 | 部分页面无 loading |

## 五、会导致数据丢失的风险项

| 风险 | 级别 | 说明 |
|------|------|------|
| Docker 容器删除 | 🔴 高 | 数据在 Docker 匿名 Volume 中 |
| 无异地备份 | 🔴 高 | 数据仅在本地 |
| 附件无持久化 | 🟡 中 | 文件上传功能未实现，暂无风险 |

## 六、安全风险项

| 风险 | 级别 | 说明 |
|------|------|------|
| 密码明文存储 | 🔴 高 | EmailConfig.password 未加密 |
| 无速率限制 | 🟡 中 | API 无 rate limiting |
| 无 CSRF 防护 | 🟡 中 | 仅 JWT cookie |
| 无输入验证 | 🟡 中 | 无 zod/yup |
