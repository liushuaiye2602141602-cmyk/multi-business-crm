import prisma from "@/lib/prisma";

type EventPayload = {
  type: "lead.created" | "lead.updated" | "lead.converted"
    | "quote.created" | "quote.sent" | "quote.accepted"
    | "order.created" | "order.confirmed" | "order.completed"
    | "customer.created" | "customer.updated"
    | "task.created" | "task.completed"
    | "email.received" | "email.sent";
  entityId: number;
  entityType: string;
  data?: Record<string, any>;
};

// Single event bus for all system events
export async function emit(event: EventPayload) {
  // Log to ActivityLog
  await prisma.activityLog.create({
    data: {
      action: event.type,
      entityType: event.entityType,
      entityId: String(event.entityId),
      description: `${event.type} on ${event.entityType} #${event.entityId}`,
    },
  });

  // Route to appropriate handlers based on event type
  switch (event.type) {
    case "lead.created":
      await handleLeadCreated(event);
      break;
    case "quote.sent":
      await handleQuoteSent(event);
      break;
    case "order.confirmed":
      await handleOrderConfirmed(event);
      break;
    // Add more as needed
  }
}

async function handleLeadCreated(event: EventPayload) {
  // Auto-create follow-up task
  try {
    const { createFollowUpTaskForLead } = await import("../domain/auto-tasks");
    await createFollowUpTaskForLead(event.entityId);
  } catch {}

  // Auto AI scoring
  try {
    const { checkAIPermission, logAIExecution } = await import("../ai/control/guard");
    const perm = await checkAIPermission("lead_analyze", "Lead", event.entityId);
    if (perm.allowed) {
      const { scoreDealProbability } = await import("../ai/agents");
      await scoreDealProbability("Lead", event.entityId);
      await logAIExecution("lead_analyze", "Lead", event.entityId, true, "Event-triggered scoring", perm.mode);
    }
  } catch {}
}

async function handleQuoteSent(event: EventPayload) {
  // Auto-create follow-up task for quote
  try {
    const { createFollowUpTaskForQuote } = await import("../domain/auto-tasks");
    await createFollowUpTaskForQuote(event.entityId);
  } catch {}

  // Auto score deal
  try {
    const { checkAIPermission, logAIExecution } = await import("../ai/control/guard");
    const perm = await checkAIPermission("score_deal", "Quote", event.entityId);
    if (perm.allowed) {
      const quote = await prisma.quote.findUnique({ where: { id: event.entityId } });
      if (quote?.customerId) {
        const { scoreDealProbability } = await import("../ai/agents");
        await scoreDealProbability("Customer", quote.customerId);
        await logAIExecution("score_deal", "Quote", event.entityId, true, "Event-triggered scoring", perm.mode);
      }
    }
  } catch {}
}

async function handleOrderConfirmed(event: EventPayload) {
  // Future: create production tasks, notify customer
}
