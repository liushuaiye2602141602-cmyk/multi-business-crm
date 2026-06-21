/**
 * Intent System - Strict Enum-Only
 *
 * All intents MUST be defined here as string literals.
 * No dynamic string intents allowed.
 * Fallback MUST return UNKNOWN.
 */

export const VALID_INTENTS = [
  "CREATE_LEAD",
  "CONVERT_LEAD",
  "CREATE_QUOTE",
  "ACCEPT_QUOTE",
  "CREATE_ORDER",
  "UPDATE_ORDER_STATUS",
  "CREATE_TASK",
  "UNKNOWN",
] as const;

export type Intent = typeof VALID_INTENTS[number];

export function isValidIntent(intent: string): intent is Intent {
  return (VALID_INTENTS as readonly string[]).includes(intent);
}

export function sanitizeIntent(rawIntent: string): Intent {
  if (isValidIntent(rawIntent)) {
    return rawIntent;
  }
  return "UNKNOWN";
}

export const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  CREATE_LEAD: "创建新线索",
  CONVERT_LEAD: "将线索转为客户",
  CREATE_QUOTE: "创建报价",
  ACCEPT_QUOTE: "接受报价",
  CREATE_ORDER: "创建订单",
  UPDATE_ORDER_STATUS: "更新订单状态",
  CREATE_TASK: "创建任务",
  UNKNOWN: "未知意图",
};
