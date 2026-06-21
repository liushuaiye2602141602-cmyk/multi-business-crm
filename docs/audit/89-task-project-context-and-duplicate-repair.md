# 飞书任务与商机项目上下文及重复创建修复审计

审计时间：2026-06-20

## 真实数据只读审计

- Project ID 8 与 Project ID 9 是真实重复项目。
- 两条项目同属 Customer ID 27，项目名均为「15公斤宠物食品四边封袋项目」，阶段均为 `REQUIREMENT_CONFIRMING`，金额均为 `30000 USD`。
- 重复来源不是查询 JOIN，而是两条不同飞书 message_id 分别触发了创建，旧逻辑缺少项目创建前后的强重复保护。
- 标题精确等于「联系FEISHU_CUSTOMER_A_星河贸易」的任务实际有 2 条：Task ID 27 与 Task ID 28，二者客户相同但截止时间不同。
- Task ID 28 标题为「联系FEISHU_CUSTOMER_A_星河贸易」，未关联项目。
- Task ID 29 标题为「寄样品」，关联 Project ID 9。
- Task ID 28 与 Task ID 29 不是相同标题任务重复。

## 修复内容

- 新增统一会话上下文 `ConversationContext`，按 `chatId + senderId` 保存最近任务和最近项目。
- 修复「刚才的任务」「刚才创建的项目」自然语言解析，避免被解析成普通标题或 UPDATE_LEAD。
- 创建任务和创建商机项目在摘要前执行重复检测。
- 确认后实际写库前再次执行重复检测，阻止重复确认、重复事件或多实例造成二次创建。
- 查询任务结果按任务 ID 去重。
- 商机项目查询结果显示项目 ID，方便同名项目人工选择。
- 修复确认摘要中的风险等级显示，使摘要与确认执行结果使用同一风险级别。
- 并发重复 message_id 写入 `IMMessage` 时直接跳过，避免同一消息多回复链路继续执行。

## 重复判定

- 商机项目：同客户或同线索、项目名归一化一致、金额一致、币种一致，且项目未丢单。
- 任务：同租户、同关联对象、标题归一化一致、截止时间精确到分钟一致，且任务未取消。

## 项目概率字段

当前 Prisma Project 模型没有独立 `probability` 字段，本轮未修改 Prisma Schema、未创建 migration。为满足「阶段 + 成交概率」更新，成交概率暂写入 Project `remark`，格式为 `成交概率：60%`，并且不会清空金额、币种、客户或描述。

## 自动化验证

- `npm run test:feishu:task-project-flow`：70/70 通过。
- `npm run test:feishu:task-project-flow:e2e`：通过。
- E2E 关键计数：
  - Project Initial Create Count：1
  - Project Duplicate Create Count：0
  - Task Initial Create Count：1
  - Task Duplicate Create Count：0
  - Final Project Count：1
  - Final Task Count：1
  - Context Task Resolution Success：true
  - Context Project Resolution Success：true
  - Project Update Success：true
  - Task Completion Success：true
  - Extra Reply Count：0
  - Unrelated Resolver Error Count：0
  - Unconfirmed Write Count：0
  - Duplicate Confirmation Execution Count：0
  - Duplicate Message Execution Count：0
  - Risk Level Mismatch Count：0
