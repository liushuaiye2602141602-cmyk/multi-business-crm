export type RiskLevel = "A" | "B" | "C";

export const RISK_LEVELS: Record<string, RiskLevel> = {
  // A: Low risk - execute directly
  CREATE_LEAD: "A",
  ADD_LEAD_FOLLOWUP: "A",
  UPDATE_LEAD: "A",
  CREATE_CONTACT: "A",
  ADD_CUSTOMER_FOLLOWUP: "A",
  CREATE_TASK: "A",

  // B: Medium risk - require complete parameters
  CREATE_CUSTOMER: "B",
  UPDATE_CUSTOMER: "B",
  UPDATE_CONTACT: "B",
  SET_PRIMARY_CONTACT: "B",
  CREATE_PROJECT: "B",
  UPDATE_PROJECT: "B",
  CREATE_QUOTE: "B",
  UPDATE_QUOTE: "B",
  CREATE_INVOICE: "B",
  UPDATE_INVOICE: "B",

  // C: High risk - require confirmation
  CONVERT_LEAD_TO_CUSTOMER: "C",
  SEND_QUOTE: "C",
  ACCEPT_QUOTE: "C",
  CONVERT_QUOTE_TO_ORDER: "C",
  QUOTE_TO_ORDER: "C",
  CREATE_ORDER: "C",
  UPDATE_ORDER: "C",
  UPDATE_ORDER_STATUS: "C",
  RECORD_PAYMENT: "C",
  CLAIM_CUSTOMER: "C",
  RELEASE_CUSTOMER: "C",
  COMPLETE_TASK: "B",
};

export function getRiskLevel(intent: string): RiskLevel {
  return RISK_LEVELS[intent] || "C";
}

export function isHighRisk(intent: string): boolean {
  return getRiskLevel(intent) === "C";
}
