# Feishu Query Disambiguation And Compound Intent Audit

Date: 2026-06-20

## Root Cause

`告诉我枫叶宠物食品的联系人、电话、邮箱和客户需求。` was previously routed as customer detail because the parser treated the word `客户` too broadly. It did not distinguish `客户需求`, which is a lead field, from `客户阶段` or `主联系人`, which point to customer detail.

`查询FEISHU_QUERY_完全不存在公司的完整信息。` lost the final `公司` because `cleanEntityName` removed business suffixes such as `公司` from the end of names. That was unsafe because `公司`, `有限公司`, `食品`, `包装`, and similar words are legal parts of entity names.

`查询测试公司的状态和联系人。` returned broad fuzzy matches because exact and fuzzy matching were not clearly separated. The resolver now uses exact matching first and only falls back to prefix or fuzzy candidates when exact matching returns zero rows.

The compound input `查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。` was previously reduced to a query. The update clause was silently ignored. This pass adds compound intent detection so read and write actions are preserved separately.

## Query Entity Type

Entity type is now inferred by:

- explicit entity words such as `线索`, `客户`, `任务`, `报价`, `订单`
- requested fields
- lead-preferred fields such as `客户需求`, `预算`, `下次跟进`, `线索状态`, `线索温度`, `线索等级`, `意向产品`
- customer-preferred fields such as `客户阶段`, `主联系人`, `订单数量`, `历史成交额`, `应收金额`

Shared fields such as `联系人`, `电话`, and `邮箱` no longer force customer detail. When paired with lead-only fields such as `客户需求`, the query routes to `QUERY_LEAD_DETAIL`.

## Name Boundaries

Name cleanup now removes query syntax, not legal business suffixes.

Preserved examples:

- `FEISHU_QUERY_完全不存在公司`
- `测试公司`
- `星海食品有限公司`
- `查询科技公司`

## Matching Order

Lead matching order:

1. id, email, phone, WhatsApp exact
2. normalized company exact
3. prefix match
4. fuzzy contains match

If exact matches exist, prefix and fuzzy results are not mixed in.

Actual check for `查询测试公司的状态和联系人。` returned only exact candidates:

- 线索ID 2｜测试公司｜联系人：张三｜状态：新线索
- 线索ID 3｜测试公司｜联系人：张三｜状态：新线索
- 线索ID 4｜测试公司｜联系人：张三｜状态：新线索
- 线索ID 5｜测试公司｜联系人：张三｜状态：新线索

## Compound Actions

Added `COMPOUND_QUERY_AND_UPDATE`.

For `查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。`:

- action 1: `QUERY_LEAD_DETAIL`
- action 2: `UPDATE_LEAD`
- the update inherits the queried lead name when the second clause omits it
- query can be executed as read-only
- update follows `FEISHU_NL_WRITE_CONFIRMATION_MODE=all`
- no budget update happens before confirmation

For blocked compound writes:

- query plus delete is detected
- delete is permanently blocked
- the write clause is not silently ignored

## Verification

Commands run:

- `npm run test:feishu:nlu`: passed, 14/14
- `npm run test:feishu:routing`: passed, 23/23 plus confirmation routing 3/3
- `npm run test:feishu:update-lead`: passed, 38/38
- `npm run test:feishu:entity-query`: passed, 51/51
- `npm run test:feishu:compound-intent`: passed, 17/17
- `npm run typecheck`: passed
- `npm run build`: passed

Metrics:

- Entity Type Accuracy: 5/5
- Entity Name Boundary Accuracy: 5/5
- Exact Match Isolation Accuracy: 4/4
- Compound Action Detection Accuracy: 3/3
- Silently Dropped Action Count: 0
- Random Entity Selection Count: 0
- Pure Query Database Write Count: 0

## Process Check

Process inspection did not find a clearly running old `feishu-bot` process. The only keyword match was the inspection command itself, so no process was killed.

## Restart Command

```powershell
cd D:\web_project\multi-business-crm
npm run feishu:bot
```

## Remaining Risk

The long-connection bot path is covered. The old webhook route remains a separate path and was not changed in this pass.

The compound action implementation supports query plus write confirmation in the long-connection handler. It does not yet implement a general multi-action transaction framework for every possible CRM operation; closed operations remain blocked or permission-protected.
