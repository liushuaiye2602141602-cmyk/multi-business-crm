import { NLU_OUTPUT_SCHEMA } from "./nlu-schema";

/**
 * Fallback keyword-based extraction when AI is unavailable.
 * Returns low-confidence results with FALLBACK_USED ambiguity marker.
 */
export function fallbackExtract(text: string) {
  const trimmed = text.trim();

  // ── Simple keyword-based intent detection ──────────────────────────
  let intent = "CHAT";
  if (trimmed.includes("帮助") || trimmed === "help") {
    intent = "HELP";
  } else if (
    trimmed.includes("线索") &&
    (trimmed.includes("添加") || trimmed.includes("创建") || trimmed.includes("新建"))
  ) {
    intent = "CREATE_LEAD";
  } else if (
    trimmed.includes("跟进") &&
    (trimmed.includes("给") || trimmed.includes("为"))
  ) {
    intent = "ADD_LEAD_FOLLOWUP";
  } else if (trimmed.includes("查询") && trimmed.includes("线索")) {
    intent = "QUERY_LEADS";
  } else if (trimmed.includes("查询") && trimmed.includes("客户")) {
    intent = "QUERY_CUSTOMERS";
  } else if (trimmed.includes("查询") && trimmed.includes("任务")) {
    intent = "QUERY_TASKS";
  } else if (trimmed.includes("查询") && trimmed.includes("订单")) {
    intent = "QUERY_ORDERS";
  } else if (trimmed.includes("查询") && trimmed.includes("报价")) {
    intent = "QUERY_QUOTES";
  }

  // ── Extract basic parameters for known intents ─────────────────────
  const parameters: Record<string, any> = {};

  if (intent === "CREATE_LEAD") {
    // Try to extract company name from "添加线索，XXX" pattern
    const companyMatch = trimmed.match(
      /(?:添加|创建|新建)线索\s*[，,：:]\s*(.+?)(?:[，,：:]|$)/,
    );
    if (companyMatch) {
      parameters.companyName = companyMatch[1].trim();
    }

    // Extract email
    const emailMatch = trimmed.match(/邮箱\s*(.+?)(?:[，,：:\s]|$)/);
    if (emailMatch) parameters.email = emailMatch[1].trim();

    // Extract phone
    const phoneMatch = trimmed.match(/电话\s*(.+?)(?:[，,：:\s]|$)/);
    if (phoneMatch) parameters.phone = phoneMatch[1].trim();

    // Extract contact name
    const contactMatch = trimmed.match(/联系人\s*(.+?)(?:[，,：:\s]|$)/);
    if (contactMatch) parameters.contactName = contactMatch[1].trim();

    // Extract country
    const countryMatch = trimmed.match(
      /(?:添加|创建|新建)线索\s*[，,：:]\s*.+?[，,]\s*([^\s，,：:]+?)[，,]/,
    );
    if (countryMatch) parameters.country = countryMatch[1].trim();
  } else if (intent === "ADD_LEAD_FOLLOWUP") {
    // Try to extract target company from "给XXX添加跟进" pattern
    const targetMatch = trimmed.match(/(?:给|为)\s*(.+?)\s*(?:添加|跟进)/);
    if (targetMatch) {
      parameters.leadReference = { companyName: targetMatch[1].trim() };
    }

    // Extract follow-up content after colon
    const contentMatch = trimmed.match(/(?:添加|跟进)\s*[：:]\s*(.+)/);
    if (contentMatch) parameters.content = contentMatch[1].trim();
  }

  return {
    intent,
    confidence: 0.5,
    language: "zh-CN",
    parameters,
    missingFields: [] as string[],
    ambiguities: ["FALLBACK_USED"],
    reasoningSummary: "使用降级规则提取，AI不可用",
  };
}
