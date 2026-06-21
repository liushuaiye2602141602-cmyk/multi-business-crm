# Feishu UPDATE_LEAD Full Integration Audit

Date: 2026-06-20

## Scope

This pass implements and verifies the Feishu natural-language `UPDATE_LEAD` write path in the actual long-connection bot chain.

Runtime entry:

- `npm run feishu:bot`
- `scripts/feishu-bot-entry.ts`
- `scripts/feishu-bot.ts`
- `lib/im/feishu-handler.ts`
- `lib/im/feishu-parser.ts`
- `lib/im/nlu-extractor.ts`
- `lib/im/feishu-lead-update.ts`

Actual environment file loaded by the bot entry is `.env`.

## Why Earlier UPDATE_LEAD Text Fell Through

The two update-style user messages were previously routed to the unable-to-understand path because the actual loaded parser and routing chain did not yet have a complete `UPDATE_LEAD` path: no dedicated parser extraction, no NLU schema guidance, no explicit permission key mapping, no confirmation preview integration, and no executor connected to the unified handler. Flipping only `FEISHU_ALLOW_UPDATE_LEAD` would not have fixed that because the running code still needed to recognize, validate, preview, and execute the intent.

This pass adds the missing recognition, permission, confirmation, validation, execution, and tests in the files above.

## Environment

Verified `.env` values:

- `FEISHU_READ_ONLY=false`
- `FEISHU_ALLOW_CREATE_LEAD=true`
- `FEISHU_ALLOW_ADD_FOLLOWUP=true`
- `FEISHU_ALLOW_UPDATE_LEAD=true`
- `FEISHU_NL_SHADOW_MODE=false`
- `FEISHU_NL_WRITE_CONFIRMATION_MODE=all`

Other write switches remain closed, including customer, task, project, quote, order, invoice, payment, delete, and batch write flags.

## UPDATE_LEAD Behavior

Supported update fields:

- company name
- contact name
- country or region
- phone
- email
- WhatsApp
- customer requirement
- product interest
- budget
- currency
- expected close time
- next follow-up time
- notes
- lead status
- lead grade
- lead temperature

Blocked fields:

- id
- created time
- source lead relation
- converted customer relation
- creator
- database internal fields
- customer relation id
- deleted state

Resolution order:

1. Lead id
2. Email
3. Phone or WhatsApp
4. Exact company name
5. Fuzzy company name

Zero matches return not found. Multiple matches return candidates and do not randomly choose one.

Confirmation:

- `FEISHU_NL_WRITE_CONFIRMATION_MODE=all`
- `UPDATE_LEAD` returns a before/after summary before write.
- No database update occurs before confirmation.
- Confirmation is bound to the original user, original chat, and concrete pending operation.
- Confirmation is consumed atomically and can execute only once.
- Expired confirmations are rejected.

Validation:

- Email format is checked.
- Budget must be non-negative.
- Currency is normalized or preserved from the existing lead.
- Relative dates such as today, tomorrow, and next Monday are parsed to concrete dates for execution.
- Empty or placeholder company/contact values are rejected.
- Company, email, phone, and WhatsApp duplicate conflicts are blocked.
- Converted leads cannot be moved back to normal active statuses or have their converted-customer relation damaged.

Execution:

- Only explicitly mentioned fields are included in the update data.
- Unmentioned fields are not set to `null`.
- Successful updates write an `ActivityLog` with Feishu source, operation, lead id, changed fields, before/after values, message id, sender, and execution time.
- Secrets, database URLs, API keys, and internal reasoning are not logged.

## Startup Log

`scripts/feishu-bot.ts` now prints:

- `自然语言影子模式：否`
- `自然语言写入确认模式：all`
- `创建线索：已开放`
- `添加跟进：已开放`
- `更新线索：已开放`
- `其他写入：已关闭`
- current open write list
- current closed write categories
- NLU processor path
- actual handler path
- actual environment file

## Process Check

Process inspection did not find a clearly running old `feishu-bot` process. The only keyword match was the inspection command itself, so no process was killed.

## Verification

Commands run:

- `npm run test:feishu:nlu`: passed, 14/14
- `npm run test:feishu:routing`: passed, 23/23 plus confirmation routing 3/3
- `npm run test:feishu:update-lead`: passed, 38/38
- `npm run typecheck`: passed
- `npm run build`: passed

UPDATE_LEAD metrics:

- total tests: 38
- passed: 38
- failed: 0
- route accuracy: 12/12
- unmentioned field protection: 3/3
- illegal input blocking: 3/3
- unconfirmed writes: 0
- repeated-confirm extra executions: 0
- random entity selections: 0
- unmentioned field clears: 0

## Restart Command

```powershell
cd D:\web_project\multi-business-crm
npm run feishu:bot
```

## Remaining Risk

The long-connection bot path is now integrated and verified. The older webhook API path (`app/api/im/feishu/webhook/route.ts`) still exists separately; if production uses both webhook and long-connection modes at the same time, only the long-connection path is covered by this audit.
