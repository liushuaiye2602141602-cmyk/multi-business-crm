# 飞书线索到客户到联系人真实集成修复审计

## 范围

本轮停止扩展新业务功能，只修复并验证飞书自然语言链路：

- CREATE_LEAD 字段提取
- CONVERT_LEAD_TO_CUSTOMER
- CREATE_CUSTOMER
- UPDATE_CUSTOMER
- CREATE_CONTACT
- UPDATE_CONTACT
- SET_PRIMARY_CONTACT
- 相关实体解析与查询

未开放任务、报价、订单或付款写入。未修改 Prisma Schema，未创建 migration，未删除测试数据，未修改或删除 Lead ID 48。

## 真实数据核验

运行时数据库：

- host: localhost
- port: 5433
- database: multi_business_crm

Lead ID 48 只读核验结果：

- id: 48
- company: FEISHU_CUSTOMER_A_极光宠物食品
- contactName: Anna Lee
- country: null
- phone: +1 604 000 0801
- email: anna.aurora@example.invalid
- requirement/inquiryContent: null
- businessLineId: 1
- status: NEW
- convertedCustomerId: null
- tenantId: 1
- createdAt: 2026-06-19T19:07:05.586Z

结论：

- Lead ID 48 真实存在。
- 公司名称完整保存，`FEISHU_`、`CUSTOMER_`、下划线和中文均未被数据库截断或转换。
- 本地 workspace 为 1，Lead ID 48 的 tenant/workspace 上下文为 1，和机器人本地上下文一致。
- 国家和需求字段在创建时已经丢失，不是后续查询或转客户阶段丢失。

## 根因

CREATE_LEAD 国家丢失：

- 原解析只覆盖有限国家词，未稳定识别“加拿大”。
- 已通过统一领域 DTO 增加国家标准化和创建线索参数归一化。

CREATE_LEAD 需求丢失：

- 原解析未把“他们需要...”类表达映射到线索需求字段。
- 已增加需求提取，并由集中 mapper 映射到服务层字段。

CONVERT_LEAD_TO_CUSTOMER 找不到刚创建 Lead：

- 原实体解析会把“线索FEISHU_CUSTOMER_A_极光宠物食品”整体作为 companyName，导致真实库精确匹配失败。
- 已增加领域实体名称清洗，只移除指令性前缀，不破坏 `FEISHU_`、`CUSTOMER_`、下划线和中文公司名。

CREATE_CUSTOMER 被路由成 CREATE_LEAD：

- 原意图识别没有覆盖“创建一个正式客户”，后续落入线索创建路径。
- 已为正式客户创建建立独立解析分支和字段结构，不复用 CREATE_LEAD 必填校验。

CREATE_CONTACT 进入无法理解：

- 原识别只覆盖较窄的“新增联系人”表达，未覆盖“新增一个采购联系人”。
- 已补齐联系人角色、姓名、邮箱、电话、职位解析。

SET_PRIMARY_CONTACT 和 UPDATE_CUSTOMER 找不到客户：

- 原 customerReference.companyName 可能携带“客户”前缀。
- 已统一实体名称清洗和客户引用解析。

## 主要修改

- 新增 `lib/im/feishu-domain-dto.ts`，集中处理领域 DTO、字段 mapper、实体名清洗、国家/电话/需求归一化。
- 更新 `lib/im/feishu-parser.ts`，补齐真实失败语料的意图识别和结构化参数。
- 更新 `lib/services/customer-flow-service.ts`，修复空引用导致的异常，并返回可读的缺失引用提示。
- 更新 `scripts/feishu-bot-entry.ts`，启动时显式加载 `.env` 中的 `DATABASE_URL` 和 `FEISHU_*` 覆盖值，避免旧外部环境变量污染当前机器人实例。
- 新增 `scripts/test-feishu-customer-flow-e2e.ts`，用真实 Prisma 模型和真实数据库执行端到端集成测试。
- 更新 `scripts/test-feishu-customer-flow.ts`，加入 6 条真实失败语料回归测试。
- 更新 `package.json`，增加 `test:feishu:customer-flow:e2e`。

## Lead ID 48 转客户只读验证

输入：

```text
把线索FEISHU_CUSTOMER_A_极光宠物食品转成客户。
```

只读验证结果：

```json
{
  "intent": "CONVERT_LEAD_TO_CUSTOMER",
  "leadReference": {
    "companyName": "FEISHU_CUSTOMER_A_极光宠物食品"
  },
  "validation": {
    "success": true,
    "entityId": 48,
    "planLeadId": 48
  }
}
```

未对 Lead ID 48 执行转客户写入。

## 真实 E2E 结果

命令：

```powershell
npm run test:feishu:customer-flow:e2e
```

输出摘要：

- Created Lead ID: 54
- Queried Lead ID: 54
- Created Customer ID: 17
- Direct Created Customer ID: 18
- Created Primary Contact ID: 113
- Created Secondary Contact ID: 114
- Final Primary Contact ID: 114
- Lead Lookup After Create: true
- Customer Lookup After Convert: true
- Contact Lookup After Create: true
- Customer Count: 1
- Contact Count: 2
- Primary Contact Count: 1
- Partial Transaction Count: 0
- Unconfirmed Write Count: 0
- Duplicate Execution Count: 0

E2E 使用唯一测试前缀创建独立测试数据，未删除现有数据，未触碰 Lead ID 48。

## 自动化验证

已执行：

```powershell
npm run test:feishu:nlu
npm run test:feishu:routing
npm run test:feishu:customer-flow
npm run test:feishu:customer-flow:e2e
npm run typecheck
npm run build
```

结果：

- `test:feishu:nlu`: 14/14 通过
- `test:feishu:routing`: 23/23 路由测试通过，3/3 确认路由测试通过，总计 26/26 通过
- `test:feishu:customer-flow`: 54/54 通过
- `test:feishu:customer-flow:e2e`: 通过
- `typecheck`: 通过
- `build`: 通过

合计自动化测试数量按命令统计为 95，通过 95，失败 0。

## 启动与进程

旧机器人进程检查：

- 未发现旧 `feishu:bot` / `feishu-bot-entry` 实例。

精确重启命令：

```powershell
cd "D:\web_project\multi-business-crm"
npm run feishu:bot
```

## 剩余风险

- E2E 会保留独立测试数据，符合“不删除测试数据”的要求。
- 当前真实库存在多个业务线，直接 CREATE_CUSTOMER 如果用户未提供业务线，会要求用户选择，不能随机选择。
- 机器人实际收发仍依赖有效飞书凭证和网络连通性。
