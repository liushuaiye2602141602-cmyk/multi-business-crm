import { buildActionPlan } from "../lib/kernel/action-planner";
import { ExecutionKernel } from "../lib/kernel/execution-kernel";
import { validateOrderStateTransition } from "../lib/kernel/state-validator";
import {
  clearIntentStoreForTest,
  getIntentContext,
  recordIntent,
} from "../lib/memory/intentStore";
import { resolveEntity } from "../lib/resolver/EntityResolver";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  clearIntentStoreForTest();

  const sessionId = `kernel-${Date.now()}`;
  const planned = buildActionPlan({
    intent: "UPDATE_ORDER",
    entityHint: "刚才订单",
    parameters: {
      orderId: 42,
      changes: { status: "IN_PRODUCTION" },
    },
  });

  assert(planned.actionType === "UPDATE_ORDER", `unexpected action type: ${planned.actionType}`);
  assert(planned.entityId === 42, `expected entityId 42, got ${planned.entityId}`);
  assert((planned.payload as any).changes.status === "IN_PRODUCTION", "planner should preserve payload changes");

  const ok = validateOrderStateTransition("CONFIRMED", "IN_PRODUCTION");
  assert(ok.ok, `CONFIRMED -> IN_PRODUCTION should be valid: ${JSON.stringify(ok)}`);

  const jump = validateOrderStateTransition("PENDING_CONFIRMATION", "SHIPPED");
  assert(!jump.ok && jump.code === "INVALID_STATE_TRANSITION", `jump should be rejected: ${JSON.stringify(jump)}`);

  recordIntent({
    sessionId,
    type: "ORDER",
    stage: "UPDATED",
    activeEntityId: "900",
    activeEntityType: "Order",
    action: "updateOrder",
    timestamp: Date.now(),
  });

  const resolved = resolveEntity({
    sessionId,
    entityType: "Order",
    hint: "刚才订单",
    memoryActiveId: 100,
    memoryLastId: 101,
  });
  assert(resolved.entityId === "900", `intent should win entity resolution: ${JSON.stringify(resolved)}`);
  assert(resolved.source === "intent.current", `expected intent.current source: ${resolved.source}`);

  const kernel = new ExecutionKernel({
    stateReader: {
      async readOrderState() {
        return "CONFIRMED";
      },
    },
    services: {
      async execute(action) {
        return {
          success: true,
          message: "ok",
          entityType: "Order",
          entityId: action.entityId,
          stateBefore: "CONFIRMED",
          stateAfter: (action.payload as any).changes.status,
        };
      },
    },
  });

  const result = await kernel.execute(
    {
      intent: "UPDATE_ORDER",
      entityHint: "刚才订单",
      parameters: {
        orderId: 900,
        changes: { status: "IN_PRODUCTION" },
      },
    },
    { sessionId, actorId: "test" },
  );

  assert(result.success, `kernel result should succeed: ${JSON.stringify(result)}`);
  const context = getIntentContext(sessionId);
  assert(context.currentIntent?.activeEntityId === "900", `kernel should write intent event: ${JSON.stringify(context)}`);
  assert(context.currentIntent?.lastAction === "UPDATE_ORDER", `unexpected last action: ${context.currentIntent?.lastAction}`);

  console.log(JSON.stringify({
    planned,
    transition: ok,
    rejected: jump,
    resolved,
    currentIntent: context.currentIntent,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
