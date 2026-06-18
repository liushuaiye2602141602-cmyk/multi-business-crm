import { analyzeLead as _analyzeLead } from "./crm-analyzer";
import { generateSalesMessage } from "./agents/sales-agent";
import { checkAndTriggerFollowUps } from "./agents/followup-agent";
import { scoreDealProbability } from "./agents/deal-scoring-agent";
import { checkAIPermission, logAIExecution } from "./control/guard";
import prisma from "@/lib/prisma";

/**
 * AI Core Engine — Single entry point for all AI operations.
 * All AI calls MUST go through this module.
 */

// Unified analyze interface
export async function analyze(input: {
  type: "lead" | "customer" | "deal";
  entityId: number;
}): Promise<{
  score: number;
  summary: string;
  tags: string[];
  intent: string;
  suggestions: string[];
}> {
  // Check permission first
  const permission = await checkAIPermission("analyze", input.type, input.entityId);
  if (!permission.allowed) {
    await logAIExecution("analyze", input.type, input.entityId, false, permission.reason, permission.mode);
    throw new Error(`AI blocked: ${permission.reason}`);
  }

  let result: any;

  if (input.type === "lead") {
    const { analyzeLead } = await import("./crm-analyzer");
    const analysis = await analyzeLead(input.entityId);
    result = {
      score: analysis.score,
      summary: analysis.summary,
      tags: analysis.tags,
      intent: analysis.intentLevel,
      suggestions: [analysis.suggestedAction],
    };
  } else if (input.type === "deal") {
    const score = await scoreDealProbability("Lead", input.entityId);
    result = {
      score,
      summary: `Deal score: ${score}/100`,
      tags: [],
      intent: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
      suggestions: [],
    };
  } else {
    result = { score: 50, summary: "", tags: [], intent: "Medium", suggestions: [] };
  }

  await logAIExecution("analyze", input.type, input.entityId, true, "Success", permission.mode);
  return result;
}

// Unified decide interface
export async function decide(context: {
  type: "follow_up" | "sales" | "scoring";
  entityId?: number;
  entityType?: string;
}): Promise<{
  action: string;
  message: string;
  priority: "high" | "medium" | "low";
}> {
  const permission = await checkAIPermission("decide", context.entityType, context.entityId);
  if (!permission.allowed) {
    await logAIExecution("decide", context.entityType, context.entityId, false, permission.reason, permission.mode);
    throw new Error(`AI blocked: ${permission.reason}`);
  }

  if (context.type === "sales" && context.entityType && context.entityId) {
    const suggestions = await generateSalesMessage(context.entityType as "Lead" | "Customer", context.entityId);
    const best = suggestions[0] || { channel: "email", message: "No suggestion", priority: "medium" as const };
    await logAIExecution("decide", context.entityType, context.entityId, true, "Sales suggestion generated", permission.mode);
    return { action: best.channel, message: best.message, priority: best.priority };
  }

  if (context.type === "follow_up") {
    const actions = await checkAndTriggerFollowUps();
    await logAIExecution("decide", "system", undefined, true, `Created ${actions.length} follow-up tasks`, permission.mode);
    return { action: "follow_up_check", message: `Created ${actions.length} tasks`, priority: "medium" };
  }

  return { action: "none", message: "No decision needed", priority: "low" };
}

// Unified execute interface
export async function execute(action: string, params: Record<string, any>): Promise<{ success: boolean; result: any }> {
  const permission = await checkAIPermission(action, params.entityType, params.entityId);
  if (!permission.allowed) {
    await logAIExecution(action, params.entityType, params.entityId, false, permission.reason, permission.mode);
    return { success: false, result: { error: permission.reason } };
  }

  // Route to appropriate handler
  if (action === "analyze_lead") {
    const result = await analyze({ type: "lead", entityId: params.leadId });
    await logAIExecution(action, "Lead", params.leadId, true, "Analyzed", permission.mode);
    return { success: true, result };
  }

  if (action === "score_deal") {
    const score = await scoreDealProbability(params.entityType || "Lead", params.entityId);
    await logAIExecution(action, params.entityType, params.entityId, true, `Score: ${score}`, permission.mode);
    return { success: true, result: { score } };
  }

  if (action === "sales_suggest") {
    const suggestions = await generateSalesMessage(params.entityType || "Lead", params.entityId);
    await logAIExecution(action, params.entityType, params.entityId, true, "Generated suggestions", permission.mode);
    return { success: true, result: { suggestions } };
  }

  return { success: false, result: { error: `Unknown action: ${action}` } };
}

// Unified log interface
export async function log(event: {
  actionType: string;
  entityType?: string;
  entityId?: number;
  result: string;
  allowed: boolean;
}) {
  await logAIExecution(
    event.actionType,
    event.entityType || undefined,
    event.entityId || undefined,
    event.allowed,
    event.result,
    "MANUAL"
  );
}
