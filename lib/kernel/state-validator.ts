export const ORDER_STATUS_SEQUENCE = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
] as const;

export const ORDER_STATUSES = new Set<string>([...ORDER_STATUS_SEQUENCE, "CANCELLED"]);

export type StateValidationResult =
  | { ok: true; idempotent: boolean; status: string }
  | { ok: false; code: "INVALID_STATE_TRANSITION"; message: string };

export function validateOrderStateTransition(currentRaw: string, nextRaw: string): StateValidationResult {
  const current = currentRaw === "PRODUCTION" ? "IN_PRODUCTION" : currentRaw;
  const next = nextRaw === "PRODUCTION" ? "IN_PRODUCTION" : nextRaw;

  if (!ORDER_STATUSES.has(current) || !ORDER_STATUSES.has(next)) {
    return { ok: false, code: "INVALID_STATE_TRANSITION", message: "INVALID_STATE_TRANSITION" };
  }
  if (current === next) return { ok: true, idempotent: true, status: next };
  if (current === "COMPLETED") {
    return { ok: false, code: "INVALID_STATE_TRANSITION", message: "INVALID_STATE_TRANSITION" };
  }
  if (current === "CANCELLED" && next !== "CANCELLED") {
    return { ok: false, code: "INVALID_STATE_TRANSITION", message: "INVALID_STATE_TRANSITION" };
  }
  if (next === "CANCELLED") return { ok: true, idempotent: false, status: next };

  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(current as any);
  const nextIndex = ORDER_STATUS_SEQUENCE.indexOf(next as any);
  if (currentIndex < 0 || nextIndex < 0 || nextIndex !== currentIndex + 1) {
    return { ok: false, code: "INVALID_STATE_TRANSITION", message: "INVALID_STATE_TRANSITION" };
  }

  return { ok: true, idempotent: false, status: next };
}
