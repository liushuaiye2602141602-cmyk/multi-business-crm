# 81 Codex Feishu Routing Repair

Date: 2026-06-20

## Audit Findings

- Feishu bot script: `package.json` runs `tsx scripts/feishu-bot-entry.ts`.
- Runtime entry chain: `scripts/feishu-bot-entry.ts` loads env with `@next/env`, then dynamically imports `scripts/feishu-bot.ts`.
- Runtime handler: `scripts/feishu-bot.ts` imports `lib/im/feishu-handler.ts`.
- Runtime parser/NLU: `lib/im/feishu-parser.ts`, with optional structured extraction through `lib/im/nlu-extractor.ts` and fallback through `lib/im/nlu-fallback.ts`.
- Prisma Client import used by the bot chain: `lib/prisma.ts`, importing `PrismaClient` from `lib/generated/prisma/client`.
- TypeScript path alias: `@/*` maps to `./*` in `tsconfig.json`.
- Env load order follows Next `@next/env`: `process.env`, `.env.$NODE_ENV.local`, `.env.local`, `.env.$NODE_ENV`, `.env`. No `.env.local` file was present during this audit.
- Old/new handler chains coexist:
  - Long connection: `scripts/feishu-bot.ts -> lib/im/feishu-handler.ts -> lib/im/feishu-parser.ts`.
  - Webhook route: `app/api/im/feishu/webhook/route.ts -> lib/ai/intent.ts -> lib/ai/executor.ts`.
- Old/new parser chains coexist:
  - IM parser/NLU: `lib/im/feishu-parser.ts`, `lib/im/nlu-extractor.ts`, `lib/im/nlu-fallback.ts`.
  - General AI intent chain: `lib/ai/intent.ts`, `lib/ai/parser.ts`, `lib/ai/executor.ts`.
- Root cause reproduced: the broad write detector ran before structured NLU and routed create-lead messages containing `联系人`/`联系` as `ADD_LEAD_FOLLOWUP`.
- Permission mapping was explicit for `CREATE_LEAD`, but the wrong intent caused the handler to check `FEISHU_ALLOW_ADD_FOLLOWUP`.
- Shadow mode was read in `lib/im/feishu-parser.ts`, but previously only logged LLM enrichment and returned the old parser result; the handler still reached permission checks.
- `.next` existed. Several node processes existed, but visible command lines did not confirm an active Feishu bot process.

## Repair Summary

- Natural-language write routing now normalizes text, detects write likelihood, classifies create-lead before follow-up, then extracts parameters for the selected write intent.
- Explicit permission mapping is exported through `getPermissionKeyForIntent`.
- `CREATE_LEAD` maps only to `FEISHU_ALLOW_CREATE_LEAD`.
- `ADD_LEAD_FOLLOWUP` maps only to `FEISHU_ALLOW_ADD_FOLLOWUP`.
- Unknown intents do not map to any permission.
- Shadow mode is checked before read-only, permission, confirmation, PendingAction, and execute paths.
- Shadow mode returns `SHADOW_PREVIEW` in dry-run and a `【影子模式：未执行】` reply in the live handler.
- Shadow mode dry-run reports `dbWriteCount = 0` and `pendingActionCreateCount = 0`.
- Added non-sensitive startup summary for NLU shadow mode, confirmation mode, create-lead permission, follow-up permission, NLU file path, and handler file path.
- Added local no-Feishu/no-DB test scripts:
  - `npm run test:feishu:nlu`
  - `npm run test:feishu:routing`
- Added `npm run typecheck`.

## Verification Results

- `npm run test:feishu:nlu`: passed, 8/8.
- `npm run test:feishu:routing`: passed, 23/23.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Build note: Next.js warned that the `middleware` file convention is deprecated and should migrate to `proxy`; this was not part of this repair.

## Required Manual Shadow Tests

The five requested manual messages can be retested in Feishu shadow mode. Expected first-message dry-run result:

- intent: `CREATE_LEAD`
- permissionKey: `FEISHU_ALLOW_CREATE_LEAD`
- shadowMode: `true`
- wouldExecute: `false`
- responseType: `SHADOW_PREVIEW`

## Restart Command

Stop any old Feishu bot process first, then restart from the project root:

```powershell
cd D:\web_project\multi-business-crm
npm run feishu:bot
```

## Remaining Risks

- The webhook route under `app/api/im/feishu/webhook/route.ts` still uses the separate `lib/ai/*` chain. If Feishu webhook delivery and long-connection delivery are both enabled, one message may still be processed by multiple chains.
- The long-connection handler has message-id idempotency through `iMMessage.externalId`; the webhook route does not use the same `externalId` idempotency path.
- Full live NLU quality still depends on the configured AI provider. The local routing tests deliberately avoid real Feishu, database writes, and external AI.
- Some fallback parameter extraction remains conservative and is intended for safe preview/routing, not for broad production automation beyond the two opened intents.
