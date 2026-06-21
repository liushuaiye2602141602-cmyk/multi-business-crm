import {
  clearIntentStoreForTest,
  getIntentContext,
  recordIntent,
  withExecutionContextLock,
} from "../lib/memory/intentStore";
import { resolveEntity } from "../lib/resolver/EntityResolver";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  clearIntentStoreForTest();
  const sessionId = `intent-context-${Date.now()}`;
  const now = Date.now();

  recordIntent({
    sessionId,
    type: "CUSTOMER",
    stage: "ACTIVE",
    activeEntityId: "customer-A",
    activeEntityType: "Customer",
    action: "createQuote",
    flowKey: "customer:customer-A",
    timestamp: now - 20 * 60 * 1000,
  });
  recordIntent({
    sessionId,
    type: "CUSTOMER",
    stage: "ACTIVE",
    activeEntityId: "customer-B",
    activeEntityType: "Customer",
    action: "createQuote",
    flowKey: "customer:customer-B",
    timestamp: now - 30 * 1000,
  });

  const latest = resolveEntity({ sessionId, entityType: "Customer", hint: "刚才那个客户", now });
  assert(latest.entityId === "customer-B", `expected latest customer-B, got ${JSON.stringify(latest)}`);
  assert(latest.source === "intent.current", `expected intent.current source, got ${latest.source}`);

  const backToA = resolveEntity({ sessionId, entityType: "Customer", hint: "回A继续", flowKey: "customer:customer-A", now });
  assert(backToA.entityId === "customer-A", `expected flow customer-A, got ${JSON.stringify(backToA)}`);
  assert(backToA.source === "intent.flow", `expected intent.flow source, got ${backToA.source}`);

  const context = getIntentContext(sessionId);
  assert(context.intentHistory.length === 2, `intent history should be event-backed: ${context.intentHistory.length}`);
  assert(context.currentIntent?.activeEntityId === "customer-B", `current intent should be latest event: ${JSON.stringify(context.currentIntent)}`);

  let blocked = false;
  await withExecutionContextLock(sessionId, "customer:customer-A", async () => {
    try {
      await withExecutionContextLock(sessionId, "customer:customer-B", async () => undefined);
    } catch {
      blocked = true;
    }
  });
  assert(blocked, "executionContextLock should block multi-entity overwrite inside one session");

  console.log(JSON.stringify({
    latest,
    backToA,
    historyCount: context.intentHistory.length,
    currentIntent: context.currentIntent,
    lockBlocked: blocked,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
