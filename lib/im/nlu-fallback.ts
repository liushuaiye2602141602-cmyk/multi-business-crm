import type { Intent } from "../kernel/intent";

/**
 * NLU Fallback - Strict UNKNOWN Only
 *
 * This is the LAST resort when all other extraction methods fail.
 * It MUST return UNKNOWN intent with empty entity hint.
 * NO business logic, NO DB queries, NO inference.
 */
export function fallbackExtract(text: string): {
  intent: Intent;
  entityHint: Record<string, unknown>;
  parameters: Record<string, unknown>;
} {
  return {
    intent: "UNKNOWN",
    entityHint: {},
    parameters: {},
  };
}
