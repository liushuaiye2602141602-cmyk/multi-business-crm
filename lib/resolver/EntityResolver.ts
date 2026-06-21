import { getIntentCandidates, type FeishuSessionContext } from "@/lib/memory/intentStore";

export type ResolveEntityInput = {
  sessionId?: string;
  context?: FeishuSessionContext;
  entityType: string;
  hint?: string | Record<string, any> | null;
  flowKey?: string | null;
  explicitId?: string | number | null;
  memoryActiveId?: string | number | null;
  memoryLastId?: string | number | null;
  now?: number;
};

export type ResolveEntityResult = {
  entityId?: string;
  entityType: string;
  source: "intent.flow" | "intent.current" | "memory.active" | "memory.last" | "explicit" | "hint" | "unresolved";
  score: number;
};

function isContextualHint(hint?: string | Record<string, any> | null): boolean {
  if (!hint) return true;
  const text = typeof hint === "string" ? hint : Object.values(hint).filter(Boolean).join(" ");
  return /(刚才|刚刚|上一个|继续|这个|那个|当前|回.+继续|鍒氭墠|鍒氬垰|涓婁竴涓|缁х画|杩欎釜|閭ｄ釜|褰撳墠)/.test(text);
}

export function resolveEntity(input: ResolveEntityInput): ResolveEntityResult {
  const entityType = input.entityType;
  if (isContextualHint(input.hint)) {
    const intentCandidate = getIntentCandidates({
      sessionId: input.sessionId,
      context: input.context,
      entityType,
      flowKey: input.flowKey,
      now: input.now,
    })[0];
    if (intentCandidate) {
      return {
        entityId: intentCandidate.entityId,
        entityType: intentCandidate.entityType,
        source: intentCandidate.source,
        score: intentCandidate.score,
      };
    }
  }

  if (input.memoryActiveId != null) {
    return { entityId: String(input.memoryActiveId), entityType, source: "memory.active", score: 0.5 };
  }
  if (input.memoryLastId != null) {
    return { entityId: String(input.memoryLastId), entityType, source: "memory.last", score: 0.25 };
  }
  if (input.explicitId != null) {
    return { entityId: String(input.explicitId), entityType, source: "explicit", score: 0.1 };
  }
  return { entityType, source: "unresolved", score: 0 };
}

