# Prisma Decimal Client Serialization Repair

Date: 2026-06-21

## Root Cause

`app/(dashboard)/orders/page.tsx` queried Prisma `Order` records with relation objects and passed them directly to the client component:

```tsx
<OrderListClient orders={orders as any} />
```

The `Order` model contains Prisma `Decimal` instances and `Date` instances. React Server Components require props passed to Client Components to be serializable. The visible 106 issues are consistent with one root cause repeated across many order rows and money fields.

## Decimal Fields Found

Order:
- `totalAmount`
- `exchangeRate`
- `subtotal`
- `discountAmount`
- `taxAmount`
- `chargeAmount`
- `paidAmount`
- `outstandingAmount`
- `costAmount`
- `grossProfitAmount`
- `grossProfitRate`

OrderItem:
- `quantity`
- `unitPrice`
- `totalPrice`
- `discountValue`
- `discountAmount`
- `taxRate`
- `taxAmount`
- `costPrice`

Quote:
- `unitPrice`
- `totalPrice`
- `exchangeRate`
- `discountAmount`

QuoteItem:
- `quantity`
- `unitPrice`
- `totalPrice`

Dashboard/reports also read Decimal aggregates such as `order._sum.totalAmount`, but those routes render server-side and did not pass those Decimal objects into client props in the audited path.

## Server-to-Client Audit

Direct Prisma object passed to Client Component:
- `/orders`: fixed by mapping `orders` to explicit `OrderListItemDto[]`.

Other reviewed pages:
- `/quotes`: server-rendered table; no quote list Client Component receives Prisma quote objects.
- `/dashboard`: server-rendered; Decimal values are converted with `Number(...)` before display.
- `/customers`: still has `customers={customers as any}` for `CustomerListClient`, but the audited Customer list model path does not include Decimal money fields in the same way as Order. It remains a separate typing/DTO cleanup risk.
- Customer/project detail pages render server-side and convert Decimal values with `Number(...)` for display.

## Fix

Added explicit DTO and serializer utilities:

- `lib/serialization/prisma-serializers.ts`
- `lib/dto/order-dto.ts`

`OrderListItemDto` uses:
- money/Decimal fields as `string | null`
- dates as ISO `string | null`
- enum-like fields as plain `string`
- relation objects as field whitelists only

No `JSON.parse(JSON.stringify(...))` is used as the production fix.

## Security / Field Whitelist

The order list DTO does not expose internal `tenantId`. Nested relation DTOs only include:
- customer: `id`, `companyName`
- project: `id`, `name`
- quote: `id`, `quoteNo`
- contact: `id`, `name`
- businessLine: `id`, `name`

## Verification

Passed:
- `npm run test:serialization`
- `npm run typecheck`
- `npm run build`
- `npm run test:feishu:quote-order-flow`
- `npm run test:feishu:quote-order-flow:e2e`
- `npm run test:feishu:order-state-machine`

Runtime sampled with production server:
- `/orders` 200
- `/orders/53` 200
- `/orders/53/edit` 200
- `/quotes` 200
- `/quotes/63` 200
- `/quotes/63/edit` 200
- `/dashboard` 200
- `/customers` 200
- `/projects` 200

No `Decimal objects are not supported` or `Only plain objects can be passed` messages appeared in the sampled server logs.

## Remaining Issues

Build still reports Recharts chart container width/height warnings. These are not Decimal serialization failures.

Next.js reports a deprecated `middleware` convention warning. This is not related to Decimal serialization.

Remaining `as any` usages exist in unrelated areas, including Customer list view config, import routes, enum writes, and Feishu parsing/service code. `/orders` no longer uses `orders as any`.

## Restart Command

```powershell
npm run build
npm run start
```

If running the dev server:

```powershell
npm run dev
```
