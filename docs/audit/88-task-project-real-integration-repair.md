# 飞书任务 + 商机项目真实集成修复审计

日期：2026-06-20

## 范围

本轮停止扩展新功能，只修复飞书自然语言“任务 + 商机项目”真实端到端集成问题：

- CREATE_TASK
- UPDATE_TASK
- COMPLETE_TASK
- QUERY_TASKS
- CREATE_PROJECT
- UPDATE_PROJECT
- QUERY_PROJECTS

未开放报价、订单、发票、付款、删除等其他写入能力。

## 真实问题

1. CREATE_TASK 对“联系FEISHU_CUSTOMER_A_星河贸易”只生成标题，未稳定生成 Customer 关联。
2. QUERY_TASKS 的 TOMORROW 日期范围未单独处理，容易退回全局未完成任务。
3. UPDATE_TASK 的“刚才联系...”缺少 sender + chat 绑定的最近任务上下文。
4. COMPLETE_TASK 对带测试前缀的客户名和短别名匹配不稳定。
5. CREATE_PROJECT 会剥掉“项目”后缀，确认摘要和后续匹配不一致。
6. UPDATE_PROJECT 未同时绑定客户名 + 项目名，存在歧义风险。
7. CREATE_TASK 的“这个项目”未走确认后真实项目上下文。
8. QUERY_PROJECTS 联合查询项目阶段和未完成任务时，不能退回全局任务列表。
9. E2E 脚本只直接塞 plan，没有证明 PendingAction JSON payload 往返。

## 修复

- 解析层补齐真实人工句：
  - “联系客户”生成 Customer relatedEntity。
  - “这个项目/刚才的项目”生成 Project useLastProject。
  - CREATE_PROJECT/UPDATE_PROJECT 保留完整项目名后缀。
  - 项目联合查询提取客户关键词并设置 includeTasks。
- 服务层：
  - Customer/Lead 查找复用 `customer-flow-service` 的真实 resolver。
  - 增加 senderId + chatId 绑定的最近 Task/Project 进程内上下文，带 TTL。
  - UPDATE/COMPLETE Task 支持最近任务和 FEISHU_CUSTOMER_A_ 前缀别名匹配。
  - Project 解析支持 customerName + name 联合定位，多条时不随机选第一条。
- 确认链路：
  - 确认前 validate 接收完整 MessageContext。
  - PendingAction 保存已验证 taskProjectPlan。
  - executor 从 PendingAction payload 中读取 plan 后执行。
- 查询层：
  - QUERY_TASKS 明天任务使用明天 00:00 到后天 00:00。
  - QUERY_PROJECTS includeTasks 时只展示项目下未完成任务。

## 真实数据前置

当前真实数据库中存在：

- `FEISHU_CUSTOMER_A_极光宠物食品`

当前真实数据库中不存在：

- `FEISHU_CUSTOMER_A_星河贸易`

因此使用 `FEISHU_CUSTOMER_A_星河贸易` 做 CREATE_TASK / CREATE_PROJECT 成功路径人工验收前，需要先通过已开放的客户链路创建该客户，或者改用当前存在的客户名。系统现在会正确返回“未找到客户”，不会随机选择其他客户。

## 验证项

- `npm run test:feishu:task-project-flow`
  - 总数：68
  - 通过：68
  - 失败：0
- `npm run test:feishu:task-project-flow:e2e`
  - Customer Lookup Success: true
  - Task Pending Payload Roundtrip Success: true
  - Task Create Success: true
  - Task Customer Link Count: 1
  - Task Update Success: true
  - Task Complete Success: true
  - Project Pending Payload Roundtrip Success: true
  - Project Create Success: true
  - Project Customer Link Count: 1
  - Project Update Success: true
  - Project Task Link Count: 1
  - Compound Query Success: true
  - Unconfirmed Write Count: 0
  - Duplicate Execution Count: 0
  - Random Entity Selection Count: 0
  - Partial Transaction Count: 0

## 限制

- 最近任务/项目上下文为飞书机器人进程内缓存，重启后清空；这是为了避免跨进程误用旧上下文。
- 未修改 Prisma Schema。
- 未创建 migration。
- 未删除测试数据。
