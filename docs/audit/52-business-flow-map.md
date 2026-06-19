# Business Flow Map

> Generated from codebase audit on 2026-06-19

## 1. Lead Module

**File**: `app/(dashboard)/leads/actions.ts`
**Model**: `Lead` (Prisma)
**Status Enum**: `LeadStatus`

### Statuses

| Status | Label | Description |
|--------|-------|-------------|
| NEW | New | Initial state for all leads |
| CONTACTED | Contacted | First contact made |
| REQUIREMENT_CONFIRMING | Requirement Confirming | Confirming customer requirements |
| QUOTING | Quoting | Quote in progress |
| NEGOTIATING | Negotiating | Price/terms negotiation |
| QUALIFIED | Qualified | Lead passes qualification |
| CONVERTED | Converted | Converted to Customer |
| WON | Won | Deal won |
| LOST | Lost | Deal lost |
| DORMANT | Dormant | No activity, going cold |

### Key Operations

- **createLead** - Creates lead, emits `lead.created` event
- **updateLeadStatus** - Transitions between statuses (all 10 statuses valid)
- **convertLeadToCustomer** - Uses transaction: creates Customer + Contact, sets status to CONVERTED, links via `convertedCustomerId`
- **deleteLead** - Prevents deletion if linked to followUps, quotes, tasks, or projects

### Lead Lifecycle Flow

```
NEW -> CONTACTED -> REQUIREMENT_CONFIRMING -> QUOTING -> NEGOTIATING -> QUALIFIED -> CONVERTED
                                                                                       |
                                                                              (linked to Customer via convertedCustomerId)
```

Alternate paths:
- Any pre-terminal status -> LOST
- Any pre-terminal status -> DORMANT
- QUALIFIED -> WON

---

## 2. Customer Module

**File**: `app/(dashboard)/customers/actions.ts`
**Model**: `Customer` (Prisma)
**Status Enum**: `CustomerStatus`
**Lifecycle Enum**: `CustomerLifecycleStage`

### Customer Statuses

| Status | Label | Description |
|--------|-------|-------------|
| ACTIVE | Active | Active customer |
| POTENTIAL | Potential | Potential customer, not yet active |
| INACTIVE | Inactive | No recent activity |
| WON | Won | Deal won |
| LOST | Lost | Deal lost |
| BLACKLIST | Blacklisted | Blocked customer |

### Lifecycle Stages

| Stage | Label | Description |
|-------|-------|-------------|
| POTENTIAL | Potential | Initial stage |
| INTENT | Intent | Shows buying intent |
| FIRST_DEAL | First Deal | Completed first deal |
| REPEAT_DEAL | Repeat Deal | Repeat customer |
| VIP | VIP | High-value customer |

### Key Operations

- **createCustomer** / **updateCustomer** - CRUD operations
- **claimCustomer** - Claim from customer pool (sets ownerId, clears pool fields)
- **returnToPool** - Return to pool (clears owner, sets poolEnteredAt + poolReason)
- **autoReturnInactiveCustomers** - Batch return customers with no follow-ups for N days
- **archiveCustomer** - Soft archive (isArchived=true, archivedAt=set) with activity log and revalidation
- **restoreCustomer** - Restore from archive (isArchived=false, archivedAt=null) with activity log and revalidation
- **setPrimaryContact** - Set one contact as primary for a customer
- **getDormantCustomers** - Find customers with no follow-up for 60+ days

### Customer Pool Flow

```
[No Owner] --claimCustomer--> [Has Owner] --returnToPool--> [No Owner, poolEnteredAt set]
                                     |
                            autoReturnInactiveCustomers (30 days no follow-up)
                                     |
                                     v
                              [No Owner, poolReason="auto_inactive"]
```

### Archive/Restore Flow

```
[Active] --archiveCustomer--> [Archived] --restoreCustomer--> [Active]
```

- Archive sets `isArchived=true` and `archivedAt=new Date()`
- Restore sets `isArchived=false` and `archivedAt=null`
- Both operations log activity and revalidate paths

---

## 3. Quote Module

**File**: `app/(dashboard)/quotes/actions.ts`
**Model**: `Quote` (Prisma)
**Status Enum**: `QuoteStatus`

### Statuses

| Status | Label | Description |
|--------|-------|-------------|
| DRAFT | Draft | Initial state |
| SENT | Sent | Sent to customer |
| WAITING_FEEDBACK | Waiting Feedback | Awaiting customer response |
| REVISED | Revised | Revised quote |
| ACCEPTED | Accepted | Customer accepted |
| REJECTED | Rejected | Customer rejected |
| EXPIRED | Expired | Quote validity expired |

### Key Operations

- **createQuote** / **updateQuote** / **deleteQuote** - CRUD
- **updateQuoteStatus** - Transitions between statuses; locked statuses (ACCEPTED/REJECTED/EXPIRED) cannot be changed back
- **recalculateQuoteTotals** - Sums item totalPrices minus discountAmount
- **createOrderFromQuote** (in orders/actions.ts) - Converts ACCEPTED quote to Order in a transaction

### Quote Status Flow

```
DRAFT -> SENT -> WAITING_FEEDBACK -> REVISED -> SENT -> ... (loop)
                        |
                        v
                    ACCEPTED -> createOrderFromQuote (creates Order)
                    REJECTED
                    EXPIRED
```

### Quote -> Order Conversion

- Only ACCEPTED quotes can be converted
- Uses `prisma.$transaction` for atomicity
- Copies all QuoteItem records to OrderItem
- Checks for existing order (prevents duplicate)
- Validates customerId is not null
- Logs activity

---

## 4. Order Module

**File**: `app/(dashboard)/orders/actions.ts`
**Model**: `Order` (Prisma)
**Status Enum**: `OrderStatus`

### Statuses

| Status | Label | Description |
|--------|-------|-------------|
| DRAFT | Draft | Initial state |
| CONFIRMED | Confirmed | Order confirmed, production starts |
| PRODUCTION | Production | In production |
| READY_TO_SHIP | Ready to Ship | Production complete |
| SHIPPED | Shipped | Shipped to customer |
| COMPLETED | Completed | Terminal: order finished |
| CANCELLED | Cancelled | Terminal: order cancelled |

### Key Operations

- **createOrder** / **updateOrder** / **deleteOrder** - CRUD
- **updateOrderStatus** - Transitions between statuses; terminal statuses (COMPLETED/CANCELLED) are locked
- **createOrderFromQuote** - Converts ACCEPTED quote to order (transactional)
- **recalculateOrderTotals** - Sums item totalPrices

### Order Status Flow

```
DRAFT -> CONFIRMED -> PRODUCTION -> READY_TO_SHIP -> SHIPPED -> COMPLETED (terminal)
   |                                                                   |
   +---> CANCELLED (terminal, can be set from any non-terminal state)
```

### Event Emissions

- `order.confirmed` emitted when status changes to CONFIRMED
- Triggers auto task creation via event bus

---

## 5. Task Module

**File**: `app/(dashboard)/tasks/actions.ts`
**Model**: `Task` (Prisma)
**Status Enum**: `TaskStatus`

### Statuses

| Status | Label |
|--------|-------|
| PENDING | Pending |
| IN_PROGRESS | In Progress |
| COMPLETED | Completed |
| CANCELLED | Cancelled |

### Auto-Created Tasks

Tasks are automatically created by the event bus:
1. **lead.created** -> `createFollowUpTaskForLead` (follow-up task due tomorrow 9am)
2. **quote.sent** -> `createFollowUpTaskForQuote` (follow-up task due tomorrow 10am)
3. **order.confirmed** -> `createProductionTaskForOrder` (production follow-up due next week)
4. **followUp with nextFollowUpDate** -> Auto task created in `createFollowUp`

---

## 6. Project Module

**File**: `app/(dashboard)/projects/actions.ts`
**Model**: `Project` (Prisma)
**Status Enum**: `ProjectStatus`

### Statuses

| Status | Label |
|--------|-------|
| REQUIREMENT_CONFIRMING | Requirement Confirming |
| QUOTING | Quoting |
| SAMPLE_TESTING | Sample Testing |
| WAITING_FEEDBACK | Waiting Feedback |
| NEGOTIATING | Negotiating |
| WON | Won |
| LOST | Lost |
| PAUSED | Paused |

---

## 7. Event Bus

**File**: `lib/events/bus.ts`

### Registered Events

| Event Type | Handler | Actions |
|------------|---------|---------|
| `lead.created` | `handleLeadCreated` | Creates follow-up task (idempotent), AI scoring |
| `quote.sent` | `handleQuoteSent` | Creates follow-up task (idempotent), AI deal scoring |
| `order.confirmed` | `handleOrderConfirmed` | Creates production task (idempotent) |

### Event Payload

```typescript
type EventPayload = {
  type: string;       // Event type identifier
  entityId: number;   // ID of the entity
  entityType: string; // Entity type (Lead, Quote, Order, etc.)
  data?: Record<string, any>; // Optional additional data
}
```

### Deduplication Strategy

All event handlers now check for existing pending tasks before creating new ones, preventing duplicate task creation when events are emitted multiple times.

---

## 8. AI Control System

**File**: `lib/ai/control/guard.ts`

### Permission Check Flow

1. Global AI toggle check
2. Module-specific toggle check
3. Work hours check
4. Policy rules evaluation (HARD always blocks, SOFT blocks unless AUTO mode)
5. Rate limit check (per entity per day)

---

## 9. Cross-Module Relationships

```
Lead --[convertLeadToCustomer]--> Customer
Lead --[createQuote]--> Quote
Customer --[createQuote]--> Quote
Project --[createQuote]--> Quote
Quote --[createOrderFromQuote]--> Order
Order --[createInvoice]--> Invoice
Invoice --[createPayment]--> Payment
Lead/Customer/Project --[createFollowUp]--> FollowUp
FollowUp --[nextFollowUpDate set]--> Task (auto-created)
```

---

## 10. Activity Log

**File**: `lib/activity-log.ts`

All significant operations log to `ActivityLog` table:
- Entity creation, updates, deletions
- Status transitions
- Lead conversion
- Quote to order conversion
- Customer pool operations (claim, return, auto-return)
- Customer archive/restore
- Event bus emissions (each event logs to ActivityLog)

Activity log failures are caught and logged to console, never blocking the main flow.
