# State Transition Matrix

> Generated from codebase audit on 2026-06-19

This document defines all allowed state transitions for each module in the CRM system. A cell marked `X` indicates the transition from the row (source) to the column (destination) is allowed.

---

## 1. Lead Status (`LeadStatus`)

Source: `leads/actions.ts` -> `updateLeadStatus`

| From \ To | NEW | CONTACTED | REQ_CONFIRM | QUOTING | NEGOTIATING | QUALIFIED | CONVERTED | WON | LOST | DORMANT |
|-----------|-----|-----------|-------------|---------|-------------|-----------|-----------|-----|------|---------|
| **NEW** | - | X | X | X | X | X | X | X | X | X |
| **CONTACTED** | X | - | X | X | X | X | X | X | X | X |
| **REQ_CONFIRM** | X | X | - | X | X | X | X | X | X | X |
| **QUOTING** | X | X | X | - | X | X | X | X | X | X |
| **NEGOTIATING** | X | X | X | X | - | X | X | X | X | X |
| **QUALIFIED** | X | X | X | X | X | - | X | X | X | X |
| **CONVERTED** | - | - | - | - | - | - | - | - | - | - |
| **WON** | - | - | - | - | - | - | - | - | - | - |
| **LOST** | - | - | - | - | - | - | - | - | - | - |
| **DORMANT** | X | X | X | X | X | X | - | X | X | - |

**Notes:**
- CONVERTED, WON, LOST are effectively terminal (no transitions out defined in code)
- DORMANT allows returning to any active state except CONVERTED
- All pre-terminal states allow transition to any other state
- `convertLeadToCustomer` is a separate operation that sets status to CONVERTED

**Actual code validation** (after fix):
```
validStatuses = ["NEW", "CONTACTED", "REQUIREMENT_CONFIRMING", "QUOTING", "NEGOTIATING",
                 "QUALIFIED", "CONVERTED", "WON", "LOST", "DORMANT"]
```
All statuses are accepted from any current state. The matrix above represents the intended business flow.

---

## 2. Customer Status (`CustomerStatus`)

Source: `customers/actions.ts`

| From \ To | ACTIVE | POTENTIAL | INACTIVE | WON | LOST | BLACKLIST |
|-----------|--------|-----------|----------|-----|------|-----------|
| **ACTIVE** | - | X | X | X | X | X |
| **POTENTIAL** | X | - | X | X | X | X |
| **INACTIVE** | X | X | - | X | X | X |
| **WON** | X | X | X | - | X | X |
| **LOST** | X | X | X | X | - | X |
| **BLACKLIST** | X | X | X | X | X | - |

**Notes:**
- No explicit status transition validation in code (uses direct `prisma.customer.update`)
- All transitions are technically allowed through `updateCustomer`
- `customerStatus` and `lifecycleStage` are separate fields

---

## 3. Customer Lifecycle Stage (`CustomerLifecycleStage`)

| From \ To | POTENTIAL | INTENT | FIRST_DEAL | REPEAT_DEAL | VIP |
|-----------|-----------|--------|------------|-------------|-----|
| **POTENTIAL** | - | X | X | X | X |
| **INTENT** | X | - | X | X | X |
| **FIRST_DEAL** | X | X | - | X | X |
| **REPEAT_DEAL** | X | X | X | - | X |
| **VIP** | X | X | X | X | - |

**Notes:**
- No explicit lifecycle transition validation in code
- Updated via `updateCustomer` form data

---

## 4. Quote Status (`QuoteStatus`)

Source: `quotes/actions.ts` -> `updateQuoteStatus`

| From \ To | DRAFT | SENT | WAIT_FB | REVISED | ACCEPTED | REJECTED | EXPIRED |
|-----------|-------|------|---------|---------|----------|----------|---------|
| **DRAFT** | - | X | - | - | X | X | X |
| **SENT** | X | - | X | - | X | X | X |
| **WAIT_FB** | X | X | - | X | X | X | X |
| **REVISED** | X | X | X | - | X | X | X |
| **ACCEPTED** | - | - | - | - | - | - | - |
| **REJECTED** | - | - | - | - | - | - | - |
| **EXPIRED** | - | - | - | - | - | - | - |

**Notes:**
- ACCEPTED, REJECTED, EXPIRED are **locked** (terminal) - cannot transition out
- `updateQuoteStatus` validates against: `["DRAFT", "SENT", "WAITING_FEEDBACK", "REVISED", "ACCEPTED", "REJECTED", "EXPIRED"]`
- Lock check prevents changing from any locked status

---

## 5. Order Status (`OrderStatus`)

Source: `orders/actions.ts` -> `updateOrderStatus`

| From \ To | DRAFT | CONFIRMED | PRODUCTION | READY_SHIP | SHIPPED | COMPLETED | CANCELLED |
|-----------|-------|-----------|------------|------------|---------|-----------|-----------|
| **DRAFT** | - | X | X | X | X | X | X |
| **CONFIRMED** | X | - | X | X | X | X | X |
| **PRODUCTION** | X | X | - | X | X | X | X |
| **READY_SHIP** | X | X | X | - | X | X | X |
| **SHIPPED** | X | X | X | X | - | X | X |
| **COMPLETED** | - | - | - | - | - | - | - |
| **CANCELLED** | - | - | - | - | - | - | - |

**Notes:**
- COMPLETED, CANCELLED are **terminal** (locked) - cannot transition out
- `updateOrderStatus` validates against all 7 statuses
- From any non-terminal state, transition to any status (including CANCELLED) is allowed
- This allows flexible status management (e.g., DRAFT -> COMPLETED, DRAFT -> CANCELLED)

**Intended business flow (linear):**
```
DRAFT -> CONFIRMED -> PRODUCTION -> READY_TO_SHIP -> SHIPPED -> COMPLETED
```
**Exception paths:**
- Any non-terminal -> CANCELLED
- Any non-terminal -> COMPLETED (skip ahead allowed)

---

## 6. Task Status (`TaskStatus`)

Source: `tasks/actions.ts`

| From \ To | PENDING | IN_PROGRESS | COMPLETED | CANCELLED |
|-----------|---------|-------------|-----------|-----------|
| **PENDING** | - | X | X | X |
| **IN_PROGRESS** | X | - | X | X |
| **COMPLETED** | - | - | - | - |
| **CANCELLED** | - | - | - | - |

**Notes:**
- COMPLETED and CANCELLED are effectively terminal
- `updateTask` sets `completedAt` when status is COMPLETED
- `markTaskComplete` is a convenience function

---

## 7. Project Status (`ProjectStatus`)

Source: `projects/actions.ts`

| From \ To | REQ_CONFIRM | QUOTING | SAMPLE_TEST | WAIT_FB | NEGOTIATING | WON | LOST | PAUSED |
|-----------|-------------|---------|-------------|---------|-------------|-----|------|--------|
| **REQ_CONFIRM** | - | X | X | X | X | X | X | X |
| **QUOTING** | X | - | X | X | X | X | X | X |
| **SAMPLE_TEST** | X | X | - | X | X | X | X | X |
| **WAIT_FB** | X | X | X | - | X | X | X | X |
| **NEGOTIATING** | X | X | X | X | - | X | X | X |
| **WON** | - | - | - | - | - | - | - | - |
| **LOST** | - | - | - | - | - | - | - | - |
| **PAUSED** | X | X | X | X | X | X | X | - |

**Notes:**
- WON and LOST are terminal
- PAUSED can resume to any active state
- `markProjectAsWon` is a convenience shortcut to set WON

---

## 8. Invoice Status (`InvoiceStatus`)

| From \ To | DRAFT | SENT | PAID | OVERDUE | CANCELLED |
|-----------|-------|------|------|---------|-----------|
| **DRAFT** | - | X | - | - | X |
| **SENT** | - | - | X | X | X |
| **PAID** | - | - | - | - | - |
| **OVERDUE** | - | - | X | - | X |
| **CANCELLED** | - | - | - | - | - |

**Notes:**
- PAID and CANCELLED are terminal
- No explicit invoice status transition code found; this is the intended flow

---

## Cross-Module State Triggers

| Source Event | Target Module | Trigger Action |
|--------------|---------------|----------------|
| Lead status -> CONVERTED | Customer created | `convertLeadToCustomer` creates Customer + Contact |
| Quote status -> ACCEPTED, then createOrderFromQuote | Order created | Creates Order with DRAFT status, copies QuoteItems |
| Order status -> CONFIRMED | Task auto-created | Event bus creates production follow-up task |
| Quote status -> SENT | Task auto-created | Event bus creates follow-up task |
| Lead created | Task auto-created | Event bus creates follow-up task |
| Follow-up with nextFollowUpDate | Task auto-created | `createFollowUp` creates task |
| Customer pool claim | Owner set | `claimCustomer` sets ownerId |
| Customer pool return | Owner cleared | `returnToPool` clears owner, sets poolEnteredAt |
| Customer archive | isArchived=true | `archiveCustomer` soft-deletes |
| Customer restore | isArchived=false | `restoreCustomer` undoes archive |
