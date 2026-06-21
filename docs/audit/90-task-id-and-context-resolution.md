# 飞书任务 ID 与最近任务上下文修复审计

审计时间：2026-06-20

## 根因

- `任务ID` 解析只支持 `任务ID 32`，不支持 `任务ID:32`、`任务ID：32`、`TaskID32`、`task#32`、`完成32号任务`、`ID为32的任务` 等真实输入。
- `COMPLETE_TASK` 在解析到“刚才的任务ID:32”时同时带有 `useLastTask`，服务层先检查最近任务上下文，导致显式 ID 没有最高优先级。
- 旧逻辑在显式 ID 不存在时可能继续走标题或上下文分支，存在错误回退风险。
- 重复任务检测虽然返回了已有任务 ID，但上下文只保存 ID，未保存任务标题、workspace、updatedAt 等上下文元数据；确认链路更难诊断。

## 修复

- 新增确定性 `extractExplicitTaskId`，只负责提取任务 ID，不猜测其他自然语言字段。
- 任务解析顺序调整为：显式 Task ID、lastTaskId、标题精确匹配、标题模糊匹配。
- 显式 Task ID 永远覆盖 `lastTaskId`，即使消息里同时包含“刚才的任务”。
- 显式 Task ID 不存在时直接返回 `未找到任务ID xxx。`，不回退到上下文或标题搜索。
- 重复任务检测命中后刷新当前任务上下文，并在回复中说明可继续说“完成刚才的任务”。
- 最近任务上下文保存 `senderId + chatId` 绑定下的 `workspaceId`、`taskId`、`taskTitle`、`updatedAt`、`expiresAt`。
- 按 ID 找到唯一任务、更新任务、完成任务、重复任务检测命中都会刷新 `lastTaskId`。
- `QUERY_TASK_DETAIL` 带明确任务 ID 时，也会在有飞书消息上下文的情况下刷新最近任务上下文。

## 支持格式

- `任务ID 32`
- `任务ID：32`
- `任务ID:32`
- `任务 ID ： 32`
- `Task ID 32`
- `Task ID: 32`
- `TaskID32`
- `task#32`
- `任务编号32`
- `完成32号任务`
- `把ID为32的任务标记为已完成`
- `把刚才的任务ID:32标记为已完成`

## Task ID 32 真实回归

- 只读读取 Task ID 32：存在，标题为「联系FEISHU_CUSTOMER_A_星河贸易」，状态为 `PENDING`。
- `把任务ID:32标记为已完成。` 解析为 `COMPLETE_TASK`，`taskReference.id = 32`。
- 生成确认摘要成功，摘要包含 `任务ID：32`。
- 未执行确认，Task ID 32 状态与 `completedAt` 保持不变。
- `任务ID:999999` 返回未找到，不回退到 Task ID 32。

## 验证摘录

- `npm run test:feishu:task-project-flow`：79/79 通过。
- `npm run test:feishu:task-project-flow:e2e`：通过。
- E2E 指标：
  - Duplicate Task Context Success：true
  - Explicit Task ID Overrides Context：true
  - Missing Task ID No Fallback：true
  - Task ID 32 Summary Success：true
  - Task ID 32 Unchanged：true
  - Completed Again Blocked：true
  - Extra Reply Count：0
