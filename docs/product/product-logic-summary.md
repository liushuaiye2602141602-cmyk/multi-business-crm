# Multi-Business CRM 产品逻辑摘要

> 版本: v0.1.0 Initial Public Preview  
> 生成日期: 2026-06-19

---

## 产品定位

面向 B2B 外贸从业者的多业务线 CRM 系统。单用户本地运行 (localhost:3003)，无需登录，使用 Next.js 16 + Prisma 7 + PostgreSQL 16 技术栈。

## 核心数据模型

40+ 个 Prisma 模型，30+ 个枚举。核心实体关系:

```
BusinessLine (业务线)
  |-- Lead (线索) -> convert -> Customer (客户)
  |-- Customer -> Contact (联系人)
  |-- Customer -> Project (商机项目)
  |-- Customer -> Quote (报价) -> QuoteItem (明细行)
  |-- Quote -> Order (订单) -> OrderItem (明细行)
  |-- Order -> Invoice (发票) -> Payment (付款)
  |-- Product (产品) -> QuoteItem/OrderItem
  |-- FollowUpTemplate (跟进模板)
```

## 架构特征

- **Server-First**: 页面组件直接查库，无 API 中间层
- **数据库即 Store**: 无客户端状态管理库，URL 参数驱动筛选/排序
- **Event Bus**: 服务端事件总线，`lead.created` / `quote.sent` / `order.confirmed` 三个事件触发自动任务创建和 AI 评分
- **LocalContext**: 硬编码单用户 (id=1)，`lib/local-context.ts` 提供 workspace/user ID

## 已完成模块 (14 个)

| 模块 | 状态 | 关键特性 |
|------|------|----------|
| 线索 | 完成 | CRUD、10 种状态、AI 评分、Webhook 导入、转客户 (事务) |
| 客户 | 完成 | CRUD、公海 (领取/释放/自动)、归档/恢复、沉睡检测、360 度视图 |
| 联系人 | 完成 | CRUD、社交档案、主联系人切换 |
| 报价 | 完成 | CRUD、明细行、7 种状态 (终态锁定)、自动编号 Q-YYYYMMDD-NNNN、事件触发 |
| 订单 | 完成 | CRUD、明细行、7 种状态 (终态锁定)、报价转订单 (事务)、视图配置 |
| 发票 | 完成 | CRUD、自动编号 INV-NNNNNN、5 种状态 |
| 付款 | 完成 | 记录付款、自动检测全额 (更新发票为 PAID) |
| 任务/跟进 | 完成 | CRUD、逾期检测、跟进自动创建任务、Event Bus 驱动 |
| 项目 | 完成 | CRUD、管道视图 (Kanban)、8 种状态 |
| 邮件 | 完成 | 多账号 (Gmail/Outlook/阿里/网易/自定义)、SMTP 发送、IMAP 同步、线程、CRM 自动绑定 |
| AI | 完成 | LLM 分析 (线索/客户/项目/跟进/模板)、规则评分、飞书 Bot (15 意图)、视觉分析、控制面板 |
| 产品/业务线 | 完成 | CRUD、引用完整性 |
| 自定义字段 | 完成 | 字段定义 + 值 CRUD、entityType 通用 |
| 客户客群 | 完成 | 7 种预设客群、可配置设置、用户偏好 |

## 其他已完成系统

- ActivityLog (全局审计日志)
- CalendarEvent (日历)
- SalesGoal (目标追踪)
- Document (多态文档管理)
- ExternalSource + WebhookLog (外部接入)
- IM (飞书 Webhook + 意图解析)
- 统一消息服务 (Message 模型)
- CSV 导入/导出
- 数据报表 (6 种 Recharts 图表)
- 系统健康检查

## 关键业务流程

**销售主线**: 线索 -> 客户 -> 商机项目 -> 报价 -> 订单 -> 发票 -> 付款

**自动化**:
- 创建线索 -> 自动创建 1 天跟进任务 (HIGH)
- 报价发送 -> 自动创建 1 天跟进任务 (MEDIUM) + deal scoring
- 订单确认 -> 自动创建 7 天生产任务 (MEDIUM)
- AI 跟进代理 -> 3 天未跟进线索 / 7 天不活跃客户 -> 自动创建任务

**状态锁定**: 报价 ACCEPTED/REJECTED/EXPIRED 和订单 COMPLETED/CANCELLED 不可回退

**幂等保护**: 转换操作 (线索->客户, 报价->订单) 和自动任务创建均检查重复

## 已知限制

| 类别 | 限制 |
|------|------|
| 功能 | 单用户模式 (无真实认证)、无文件上传、无实时推送、无国际化 |
| 技术 | 订单财务字段 (成本/利润) 未自动计算、订单附加费用无 UI、联系人扩展字段表单未完全覆盖 |
| 安全 | 无认证保护、无 CSRF、无速率限制、AI API Key 明文存储 |
| 数据 | 无自动备份、无数据迁移策略、ActivityLog 无清理策略 |

## 测试覆盖

56 个手动测试点 (P0: 22, P1: 24, P2: 10)，覆盖 16 个测试套件。

详细测试点: `docs/product/manual-test-points.json`

---

> 本文档基于 v0.1.0 代码库生成。完整逻辑详见 `complete-product-logic-report.md`。
