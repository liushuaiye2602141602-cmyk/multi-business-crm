# 飞书任务管理与商机项目管理接入审计

## 本阶段范围

已接入：

- CREATE_TASK
- UPDATE_TASK
- COMPLETE_TASK
- QUERY_TASKS
- QUERY_TASK_DETAIL
- CREATE_PROJECT
- UPDATE_PROJECT
- QUERY_PROJECTS
- QUERY_PROJECT_DETAIL 路由类型
- LINK_TASK_TO_ENTITY 通过 UPDATE_TASK 的 relatedEntity 变更实现
- LINK_PROJECT_TO_CUSTOMER 通过 CREATE_PROJECT / UPDATE_PROJECT 计划中的客户关联实现
- LINK_PROJECT_TO_LEAD 受当前 Prisma Project.customerId 必填限制，仅支持已转客户线索或带客户主体的安全关联

未开放：

- 报价写入
- 订单写入
- 发票写入
- 付款写入
- 删除
- 批量写入
- 永久删除

未修改 Prisma Schema，未创建 migration，未删除现有测试数据，未 commit，未 push。

## 配置

本阶段新增开启：

- FEISHU_ALLOW_CREATE_TASK=true
- FEISHU_ALLOW_UPDATE_TASK=true
- FEISHU_ALLOW_COMPLETE_TASK=true
- FEISHU_ALLOW_CREATE_PROJECT=true
- FEISHU_ALLOW_UPDATE_PROJECT=true

继续保持：

- FEISHU_READ_ONLY=false
- FEISHU_NL_SHADOW_MODE=false
- FEISHU_NL_WRITE_CONFIRMATION_MODE=all

继续关闭：

- FEISHU_ALLOW_CREATE_QUOTE=false
- FEISHU_ALLOW_UPDATE_QUOTE=false
- FEISHU_ALLOW_CREATE_ORDER=false
- FEISHU_ALLOW_UPDATE_ORDER=false
- FEISHU_ALLOW_CREATE_INVOICE=false
- FEISHU_ALLOW_UPDATE_INVOICE=false
- FEISHU_ALLOW_RECORD_PAYMENT=false

## 实现摘要

新增共享业务服务：

- `lib/services/task-project-flow-service.ts`

职责：

- 任务/项目实体解析
- 字段白名单校验
- 时间、优先级、状态、阶段、金额、币种映射
- 确认前生成 validated plan
- 确认后按 plan 执行，不重新调用 AI 或重新解释自然语言
- ActivityLog 记录
- Prisma 错误脱敏

写入确认链路：

- `lib/im/feishu-handler.ts` 在确认前调用任务/项目服务生成 `taskProjectPlan`
- `lib/im/feishu-write-executor.ts` 确认后只执行 `taskProjectPlan`
- PendingAction 仍由现有机制绑定 senderId、chatId、token、intent、expiresAt、status
- 同一 token 只能从 PENDING 更新为 CONFIRMED 一次

查询链路：

- `lib/im/feishu-parser.ts` 增加任务/项目查询结构化解析
- `lib/im/feishu-query.ts` 增加 `QUERY_PROJECTS`
- 查询不生成 PendingAction，不执行写入

启动日志：

- `scripts/feishu-bot.ts` 按业务名称显示当前开放和关闭功能
- 不输出 App Secret、数据库连接串、API Key

## 时间解析支持

已覆盖：

- 今天
- 今天下午
- 今天下午3点
- 明天
- 明天上午
- 明天下午
- 后天
- 下周一
- 三天后
- 一周后
- 6月20日
- 月底

只说日期时使用默认 09:00；下午默认 15:00。确认摘要显示解析后的具体时间。

## 任务可关联实体

本阶段开放：

- Lead
- Customer
- Contact 查询识别保留
- Project

Quote / Order 关系未开放写入。

## 项目可关联实体

当前 Prisma Project 模型要求 `customerId` 必填，`leadId` 可选。因此：

- 支持 Customer 关联项目
- 支持已转客户 Lead 关联项目，并保留 leadId
- 不支持创建“只有 Lead、没有 Customer”的项目；服务会拒绝并提示当前模型限制

## E2E 结果

命令：

```powershell
npm run test:feishu:task-project-flow:e2e
```

最新输出：

- Customer ID: 22
- Project ID: 3
- Task ID: 22
- Project Lookup Success: true
- Task Lookup Success: true
- Project Customer Link Count: 1
- Task Project Link Count: 1
- Completed Task Count: 1
- Unconfirmed Write Count: 0
- Duplicate Execution Count: 0
- Random Entity Selection Count: 0
- Partial Transaction Count: 0

E2E 使用唯一测试前缀创建独立数据，不删除现有数据。

## 自动化验证

已执行：

```powershell
npm run test:feishu:nlu
npm run test:feishu:routing
npm run test:feishu:update-lead
npm run test:feishu:entity-query
npm run test:feishu:customer-flow
npm run test:feishu:task-project-flow
npm run test:feishu:task-project-flow:e2e
npm run typecheck
npm run build
```

结果：

- `test:feishu:nlu`: 14/14 通过
- `test:feishu:routing`: 23/23 路由测试通过，3/3 确认路由测试通过，总计 26/26 通过
- `test:feishu:update-lead`: 38/38 通过
- `test:feishu:entity-query`: 51/51 通过
- `test:feishu:customer-flow`: 54/54 通过
- `test:feishu:task-project-flow`: 60/60 通过
- `test:feishu:task-project-flow:e2e`: 通过
- `typecheck`: 通过
- `build`: 通过

自动化测试总数按断言脚本统计：244。
通过数量：244。
失败数量：0。

Build 有既有 warning：

- Next.js middleware 文件约定已废弃，建议迁移 proxy
- Recharts 容器宽高 warning

这些 warning 未阻止 build。

## 精确重启命令

```powershell
cd "D:\web_project\multi-business-crm"
npm run feishu:bot
```

## 剩余风险

- 当前 Project Schema 要求 `customerId` 必填，所以 Lead-only 项目无法在不改 Schema 的前提下完整支持。
- E2E 会保留独立测试数据，符合不删除现有测试数据要求。
- 任务/项目自然语言规则已覆盖本阶段语料，但更自由的口语表达仍可能需要后续增量语料。
- 真实飞书收发依赖有效飞书凭证和网络连接。
