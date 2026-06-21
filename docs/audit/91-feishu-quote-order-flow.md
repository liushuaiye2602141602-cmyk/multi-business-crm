# 飞书报价与订单流程审计

审计时间：2026-06-21

## 本阶段实现的意图

- CREATE_QUOTE
- UPDATE_QUOTE
- QUERY_QUOTES
- QUERY_QUOTE_DETAIL
- SEND_QUOTE
- ACCEPT_QUOTE
- CONVERT_QUOTE_TO_ORDER（兼容阶段文档中的 QUOTE_TO_ORDER 权限命名）
- CREATE_ORDER
- UPDATE_ORDER
- QUERY_ORDERS
- QUERY_ORDER_DETAIL

继续未开放：

- 发票
- 收款
- 退款
- 删除
- 批量写入
- 永久删除
- 原始 SQL

## 完整性

- CREATE_QUOTE：已接入确定性解析、确认预览、共享服务计划、Decimal 金额计算、重复报价检测和确认后执行。
- UPDATE_QUOTE：已接入明确字段更新、已接受/已转订单保护和确认后执行。
- SEND_QUOTE：已接入状态变更为 SENT；当前不实际发送外部邮件，回复会明确说明。
- ACCEPT_QUOTE：已接入状态变更为 ACCEPTED；不会自动转订单。
- QUOTE_TO_ORDER：以 CONVERT_QUOTE_TO_ORDER 实现；确认后在同一事务中创建 Order、复制 QuoteItem、写 ActivityLog，并用 Order.quoteId 防重复转单。
- CREATE_ORDER：已接入直接订单创建、明细复制、Decimal 金额计算和确认后执行。
- UPDATE_ORDER：已接入明确字段更新、订单状态保护和确认后执行。

## 金额与编号

- 报价金额计算：`subtotal = sum(quantity * unitPrice)`；`total = subtotal - discount + tax + shippingFee`。
- 订单金额计算：直接订单使用同一公式；报价转订单复制报价总额和明细金额。
- 计算实现：使用 Prisma Decimal，避免普通浮点累加。
- 报价编号生成：共享服务按 `Q-YYYYMMDD-0001` 递增生成。
- 订单编号生成：共享服务按 `O-YYYYMMDD-0001` 递增生成。
- 兼容查询编号：支持 `Q-...`、`QT-...`、`O-...`、`ORD-...`。

## 状态机

- 报价状态使用现有 Prisma 枚举：DRAFT、SENT、WAITING_FEEDBACK、REVISED、ACCEPTED、REJECTED、EXPIRED。
- 发送报价：非重复时更新为 SENT。
- 接受报价：非重复时更新为 ACCEPTED。
- 报价转订单：要求报价为 ACCEPTED，且不存在关联 `Order.quoteId`。
- 订单状态使用现有 Prisma 枚举：DRAFT、CONFIRMED、PRODUCTION、READY_TO_SHIP、SHIPPED、COMPLETED、CANCELLED。
- 已完成订单不能随意回退。

## 上下文

- 最近报价上下文：已在共享服务中保存 `lastQuoteId` 和 `lastQuoteNumber`。
- 最近订单上下文：已在共享服务中保存 `lastOrderId` 和 `lastOrderNumber`。
- 显式 Quote ID / 报价编号优先于上下文。
- 显式 Order ID / 订单编号优先于上下文。

## 共享服务

新增 `lib/services/quote-order-flow-service.ts`，职责包括：

- 字段校验
- 客户、联系人、项目、报价、订单解析
- 金额计算
- 编号生成
- 状态保护
- 重复报价与重复转单保护
- 确认前 plan 生成
- 确认后只执行已验证 plan
- ActivityLog
- Prisma 错误脱敏

飞书端不再使用旧的简化 quote/order Prisma handler 执行本阶段能力。

## 自动化验证

已通过：

- `npm run test:feishu:quote-order-flow`：17/17 通过。
- `npm run test:feishu:nlu`：14/14 通过。
- `npm run test:feishu:routing`：23/23 路由测试通过，3/3 确认路由测试通过。
- `npm run test:feishu:update-lead`：38/38 通过。
- `npm run test:feishu:entity-query`：51/51 通过。
- `npm run test:feishu:customer-flow`：54/54 通过。
- `npm run test:feishu:task-project-flow`：79/79 通过。
- `npm run typecheck`：通过。

受环境阻塞：

- `npm run test:feishu:quote-order-flow:e2e`：阻塞于 PostgreSQL 连接拒绝，Prisma code `ECONNREFUSED`，发生在连接本机数据库 `localhost:5433/multi_business_crm` 时。
- `npm run build`：编译和 TypeScript 阶段通过，静态预渲染访问数据库时同样阻塞于 Prisma code `ECONNREFUSED`。

当前自动化测试统计（不含受数据库连接阻塞的 E2E/build）：

- 总数：276
- 通过：276
- 失败：0

## E2E 指标

由于数据库连接拒绝，以下真实 E2E 指标本轮未能采集：

- Customer ID
- Project ID
- Quote ID
- Quote Number
- Order ID
- Order Number
- Quote Item Count
- Order Item Count
- Quote Total
- Order Total
- Quote Converted Order Count
- Duplicate Order Creation Count
- Unconfirmed Write Count
- Duplicate Confirmation Execution Count
- Partial Transaction Count
- Random Entity Selection Count
- Extra Reply Count
- Risk Level Mismatch Count

已在 E2E 脚本中定义发布门槛：

- Quote Item Count = Order Item Count
- Quote Total = Order Total
- Quote Converted Order Count = 1
- Duplicate Order Creation Count = 0
- 其他异常计数为 0

## 修改文件

本轮重点新增/修改：

- `lib/services/quote-order-flow-service.ts`
- `lib/im/feishu-parser.ts`
- `lib/im/feishu-handler.ts`
- `lib/im/feishu-write-executor.ts`
- `lib/im/feishu-query.ts`
- `lib/im/feishu-risk-levels.ts`
- `scripts/test-feishu-quote-order-flow.ts`
- `scripts/test-feishu-quote-order-flow-e2e.ts`
- `scripts/feishu-bot.ts`
- `package.json`
- `.env` 中本阶段 7 个 FEISHU_ALLOW_* 开关改为 true

工作区仍包含上一阶段未提交文件；本轮未 commit，未 push。

## 精确重启命令

```powershell
cd "D:\web_project\multi-business-crm"
npm run feishu:bot
```

## 是否可人工验收

可以进行精简人工验收，但真实写库、转单事务和 build 完整验证需要先恢复本机 PostgreSQL `localhost:5433`。

建议人工验收顺序：

1. 恢复数据库连接。
2. 运行 `npm run test:feishu:quote-order-flow:e2e`。
3. 运行 `npm run build`。
4. 启动 `npm run feishu:bot`。
5. 在飞书中测试创建报价、发送报价、接受报价、报价转订单、查询订单。

## 当前剩余风险

- 未修改 Prisma Schema，因此 Quote 没有独立 `convertedOrderId` 或 `CONVERTED` 状态；转单关系通过 `Order.quoteId` 表达。
- `sentAt`、`acceptedAt` 未在当前 Quote 模型中落独立字段；状态和 ActivityLog 可追踪动作。
- `shippingFee`、`taxAmount` 在 Quote 模型没有独立字段；创建时参与总额计算，部分附加信息通过现有字段表达。
- E2E 和 build 的数据库阶段尚未完成，需数据库恢复后补跑。
