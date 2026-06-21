import type {
  FeishuSessionContext,
  IntentContext,
  IntentEvent,
  IntentResolutionCandidate,
  RecordIntentInput,
} from "./IntentContext";

export type { FeishuSessionContext };

const INTENT_TTL_MS = 60 * 60 * 1000;
const HALF_LIFE_MS = 10 * 60 * 1000;
const intentEvents = new Map<string, IntentEvent[]>();
const flowPointers = new Map<string, Map<string, IntentEvent>>();
const executionContextLocks = new Map<string, { flowKey: string; expiresAt: number }>();

export function getIntentSessionId(context?: FeishuSessionContext | null, explicitSessionId?: string | null): string | null {
  if (explicitSessionId) return explicitSessionId;
  if (!context?.senderId || !context.chatId) return null;
  return `${context.chatId}::${context.senderId}`;
}

function createEventId(sessionId: string, timestamp: number): string {
  return `${sessionId}:${timestamp}:${Math.random().toString(36).slice(2, 10)}`;
}

function pruneExpiredEvents(sessionId: string, now = Date.now()) {
  const events = intentEvents.get(sessionId);
  if (!events) return;
  const live = events.filter((event) => now - event.timestamp <= INTENT_TTL_MS);
  intentEvents.set(sessionId, live);
  const flows = flowPointers.get(sessionId);
  if (!flows) return;
  for (const [flowKey, event] of flows.entries()) {
    if (now - event.timestamp > INTENT_TTL_MS) flows.delete(flowKey);
  }
}

export function clearExpiredIntent(sessionId?: string, now = Date.now()) {
  if (sessionId) {
    pruneExpiredEvents(sessionId, now);
    return;
  }
  for (const key of intentEvents.keys()) pruneExpiredEvents(key, now);
}

export function getIntentTimeDecayScore(timestamp: number, now = Date.now()): number {
  const age = Math.max(0, now - timestamp);
  return Math.pow(0.5, age / HALF_LIFE_MS);
}

export function recordIntent(input: RecordIntentInput): IntentEvent | null {
  const sessionId = getIntentSessionId(input.context, input.sessionId);
  if (!sessionId) return null;
  const activeEntityId = input.activeEntityId == null ? undefined : String(input.activeEntityId);
  const activeEntityType = input.activeEntityType || input.type;
  const timestamp = input.timestamp ?? Date.now();
  pruneExpiredEvents(sessionId, timestamp);

  const event: IntentEvent = {
    eventId: createEventId(sessionId, timestamp),
    sessionId,
    type: input.type,
    stage: input.stage,
    entityId: activeEntityId,
    entityType: activeEntityType,
    action: input.action,
    timestamp,
    flowKey: input.flowKey || (activeEntityId ? `${activeEntityType}:${activeEntityId}` : undefined),
    metadata: input.metadata,
  };

  const events = intentEvents.get(sessionId) || [];
  events.push(event);
  events.sort((a, b) => a.timestamp - b.timestamp);
  intentEvents.set(sessionId, events);

  if (event.flowKey) {
    const flows = flowPointers.get(sessionId) || new Map<string, IntentEvent>();
    flows.set(event.flowKey, event);
    flowPointers.set(sessionId, flows);
  }

  return event;
}

export const writeIntent = recordIntent;

export function getIntentContext(sessionIdOrContext: string | FeishuSessionContext): IntentContext {
  const sessionId = typeof sessionIdOrContext === "string"
    ? sessionIdOrContext
    : getIntentSessionId(sessionIdOrContext) || "";
  pruneExpiredEvents(sessionId);
  const events = intentEvents.get(sessionId) || [];
  const latest = [...events].reverse().find((event) => event.entityId);
  return {
    sessionId,
    currentIntent: latest
      ? {
          type: latest.type,
          stage: latest.stage,
          activeEntityId: latest.entityId,
          activeEntityType: latest.entityType,
          lastAction: latest.action,
          timestamp: latest.timestamp,
        }
      : undefined,
    intentHistory: events.map((event) => ({
      type: event.type,
      entityId: event.entityId,
      action: event.action,
      timestamp: event.timestamp,
    })),
  };
}

export function readCurrentIntent(sessionIdOrContext: string | FeishuSessionContext): IntentContext["currentIntent"] {
  const sessionId = typeof sessionIdOrContext === "string"
    ? sessionIdOrContext
    : getIntentSessionId(sessionIdOrContext) || "";
  clearExpiredIntent(sessionId);
  return getIntentContext(sessionIdOrContext).currentIntent;
}

export function getIntentCandidates(input: {
  sessionId?: string | null;
  context?: FeishuSessionContext | null;
  entityType: string;
  flowKey?: string | null;
  now?: number;
}): IntentResolutionCandidate[] {
  const sessionId = getIntentSessionId(input.context, input.sessionId);
  if (!sessionId) return [];
  const now = input.now ?? Date.now();
  pruneExpiredEvents(sessionId, now);
  const normalizedType = input.entityType.toLowerCase();
  const candidates: IntentResolutionCandidate[] = [];

  if (input.flowKey) {
    const flowEvent = flowPointers.get(sessionId)?.get(input.flowKey);
    if (flowEvent?.entityId && String(flowEvent.entityType || flowEvent.type).toLowerCase() === normalizedType) {
      candidates.push({
        entityId: flowEvent.entityId,
        entityType: flowEvent.entityType || flowEvent.type,
        source: "intent.flow",
        score: getIntentTimeDecayScore(flowEvent.timestamp, now) + 1,
        event: flowEvent,
      });
    }
  }

  for (const event of [...(intentEvents.get(sessionId) || [])].reverse()) {
    if (!event.entityId) continue;
    if (String(event.entityType || event.type).toLowerCase() !== normalizedType) continue;
    candidates.push({
      entityId: event.entityId,
      entityType: event.entityType || event.type,
      source: "intent.current",
      score: getIntentTimeDecayScore(event.timestamp, now),
      event,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export async function withExecutionContextLock<T>(sessionId: string, flowKey: string, fn: () => Promise<T> | T): Promise<T> {
  const now = Date.now();
  const current = executionContextLocks.get(sessionId);
  if (current && current.expiresAt > now && current.flowKey !== flowKey) {
    throw new Error(`executionContextLock active for ${current.flowKey}`);
  }
  executionContextLocks.set(sessionId, { flowKey, expiresAt: now + 10_000 });
  try {
    return await fn();
  } finally {
    const latest = executionContextLocks.get(sessionId);
    if (latest?.flowKey === flowKey) executionContextLocks.delete(sessionId);
  }
}

export function clearIntentStoreForTest() {
  intentEvents.clear();
  flowPointers.clear();
  executionContextLocks.clear();
}
