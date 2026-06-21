# Feishu Entity Detail Query Audit

Date: 2026-06-20

## Root Cause

The message `查询枫叶宠物食品当前的状态、预算和下次跟进时间。` previously returned the unable-to-understand reply because the actual parser only had broad list query intents such as `QUERY_LEADS`, `QUERY_CUSTOMERS`, `QUERY_TASKS`, `QUERY_QUOTES`, and `QUERY_ORDERS`.

The old query router required explicit entity type words such as `线索`, `客户`, `任务`, `报价`, or `订单`. The message had a company name and requested fields, but did not include `线索`, so it fell through to `UNKNOWN`.

There was also no unified single-entity detail query shape, no `requestedFields` extraction, and no resolver for not-found or ambiguous single-entity matches.

## Actual Query Chain

Runtime entry:

- `scripts/feishu-bot-entry.ts`
- `scripts/feishu-bot.ts`
- `lib/im/feishu-handler.ts`
- `lib/im/feishu-parser.ts`
- `lib/im/feishu-query.ts`
- `lib/im/feishu-entity-query.ts`

The explicit query message is parsed by `lib/im/feishu-parser.ts`, routed by `lib/im/feishu-handler.ts`, and executed as read-only by `lib/im/feishu-query.ts`.

## Implemented Intents

Added or completed:

- `QUERY_LEAD_DETAIL`
- `QUERY_CUSTOMER_DETAIL`
- `QUERY_TASK_DETAIL`
- `QUERY_QUOTE_DETAIL`
- `QUERY_ORDER_DETAIL`

Unified parameter shape:

```json
{
  "entityReference": {
    "id": null,
    "name": "枫叶宠物食品",
    "email": null,
    "phone": null,
    "number": null
  },
  "requestedFields": ["status", "budget", "currency", "nextFollowUpAt"],
  "missingFields": [],
  "ambiguities": []
}
```

## Lead Fields

Supported lead detail fields:

- `companyName`
- `contactName`
- `country`
- `phone`
- `email`
- `whatsapp`
- `source`
- `status`
- `grade`
- `temperature`
- `requirement`
- `productInterest`
- `budget`
- `currency`
- `expectedCloseAt`
- `nextFollowUpAt`
- `createdAt`
- `notes`
- `businessLine`
- `latestFollowUp`
- `followUpCount`
- `taskCount`
- `quoteCount`
- `convertedCustomer`

Empty values are rendered as `暂未填写` or `暂未设置`, not raw `null`.

Status and other enums are localized before returning to Feishu.

## Entity Matching

Lead matching order:

1. Lead id exact match
2. Email exact match
3. Phone or WhatsApp exact match
4. Company name normalized exact match
5. Company name fuzzy match

Result behavior:

- 0 matches: return `未找到线索“XXX”。`
- 1 match: return requested fields only
- multiple matches: return candidates and ask the user to choose; no random first row

## Query And Write Separation

Query text such as `枫叶宠物食品预算多少` routes to `QUERY_LEAD_DETAIL`.

Write text such as `把枫叶宠物食品预算改为15000美元` routes to `UPDATE_LEAD`.

Read-only detail queries:

- do not check write permission flags
- do not create `PendingAction`
- do not create confirmation tokens
- do not update CRM entities
- do not write ActivityLog modification records

## Other Entities

Customer detail query supports stage, primary contact, contacts, country, phone, email, status, counts, totals, latest follow-up, and next follow-up.

Task detail query supports title, status, priority, due date, completed time, related entity, description, and created time.

Quote detail query supports quote number, customer, status, currency, totals, valid-until date, items, and created time.

Order detail query supports order number, customer, status, currency, total, paid amount, outstanding amount, delivery date, items, and created time.

## Verification

Commands run:

- `npm run test:feishu:nlu`: passed, 14/14
- `npm run test:feishu:routing`: passed, 23/23 plus confirmation routing 3/3
- `npm run test:feishu:update-lead`: passed, 38/38
- `npm run test:feishu:entity-query`: passed, 36/36
- `npm run typecheck`: passed
- `npm run build`: passed

Entity query metrics:

- test total: 36
- passed: 36
- failed: 0
- Query Intent Accuracy: 7/7
- Requested Fields Accuracy: 9/9
- Query/Update Separation Accuracy: 8/8
- Random Entity Selection Count: 0
- Database Write Count: 0
- PendingAction Creation Count: 0

## Process Check

Process inspection did not find a clearly running old `feishu-bot` process. The only keyword match was the inspection command itself, so no process was killed.

## Restart Command

```powershell
cd D:\web_project\multi-business-crm
npm run feishu:bot
```

## Remaining Risk

The long-connection bot path is covered. The older webhook route `app/api/im/feishu/webhook/route.ts` remains a separate path and was not changed in this pass.

Short follow-up context, such as:

- user: `查询枫叶宠物食品。`
- user: `状态和预算。`

is not backed by a persisted context table in this pass. The implemented fallback returns core detail fields when fields are missing, instead of asking a follow-up question.
