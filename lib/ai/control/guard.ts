import prisma from "@/lib/prisma";

interface GuardCheckResult {
  allowed: boolean;
  reason: string;
  mode: string;
}

export async function checkAIPermission(
  actionType: string,
  entityType?: string,
  entityId?: number,
  metadata?: Record<string, any>
): Promise<GuardCheckResult> {
  // Step 1: Check AI Global Toggle
  const settings = await prisma.aIControlSettings.findFirst();
  if (!settings || !settings.aiEnabled) {
    return { allowed: false, reason: "AI 系统已关闭", mode: "MANUAL" };
  }

  // Step 2: Check Module Toggle
  const moduleChecks: Record<string, boolean> = {
    email_send: settings.emailAgentEnabled,
    whatsapp_send: settings.whatsappAgentEnabled,
    task_create: settings.followUpAgentEnabled,
    lead_analyze: settings.salesAgentEnabled,
    prospecting: settings.prospectingEnabled,
  };

  if (moduleChecks[actionType] === false) {
    return { allowed: false, reason: `模块 ${actionType} 已禁用`, mode: settings.executionMode };
  }

  // Step 3: Check Work Hours
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour < settings.workHoursStart || currentHour >= settings.workHoursEnd) {
    return { allowed: false, reason: `当前时间不在工作时间 (${settings.workHoursStart}:00 - ${settings.workHoursEnd}:00)`, mode: settings.executionMode };
  }

  // Step 4: Check Policy Rules
  const rules = await prisma.aIPolicyRule.findMany({
    where: { isActive: true },
  });

  for (const rule of rules) {
    const blocked = evaluateRule(rule, actionType, entityType, entityId, metadata);
    if (blocked) {
      // Hard rules always block
      if (rule.type === "HARD") {
        return { allowed: false, reason: `规则拦截: ${rule.name} - ${rule.action}`, mode: settings.executionMode };
      }
      // Soft rules block but can be overridden in AUTO mode
      if (settings.executionMode !== "AUTO") {
        return { allowed: false, reason: `规则限制: ${rule.name} - ${rule.action}`, mode: settings.executionMode };
      }
    }
  }

  // Step 5: Check Rate Limit
  if (entityType && entityId) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = await prisma.aIExecutionLog.count({
      where: {
        entityType,
        entityId,
        createdAt: { gte: todayStart },
        allowed: true,
      },
    });

    if (todayCount >= settings.maxContactsPerDay) {
      return { allowed: false, reason: `今日已达触达上限 (${settings.maxContactsPerDay}次)`, mode: settings.executionMode };
    }
  }

  // All checks passed
  return { allowed: true, reason: "通过所有检查", mode: settings.executionMode };
}

function evaluateRule(
  rule: any,
  actionType: string,
  entityType?: string,
  entityId?: number,
  metadata?: Record<string, any>
): boolean {
  try {
    const condition = JSON.parse(rule.condition || "{}");

    // Block blacklist
    if (rule.action === "block_blacklist" && entityType === "Customer") {
      // Check if customer is in blacklist
      return true; // Simplified - real implementation would check customer status
    }

    // Block discount exceeding threshold
    if (rule.action === "block_discount" && metadata?.discount) {
      const maxDiscount = parseFloat(rule.value || "100");
      if (metadata.discount > maxDiscount) return true;
    }

    // Rate limit per entity
    if (rule.action === "limit_rate" && entityType) {
      const maxPerDay = parseInt(rule.value || "1");
      // Would check today's count - simplified
      return false;
    }

    return false;
  } catch {
    return false;
  }
}

// Log execution
export async function logAIExecution(
  actionType: string,
  entityType: string | undefined,
  entityId: number | undefined,
  allowed: boolean,
  reason: string,
  mode: string
) {
  await prisma.aIExecutionLog.create({
    data: {
      actionType,
      entityType: entityType || null,
      entityId: entityId || null,
      allowed,
      reason,
      mode,
    },
  });
}
