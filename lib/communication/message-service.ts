import prisma from "@/lib/prisma";

interface SendMessageInput {
  channel: string;
  direction: "inbound" | "outbound";
  fromAddr: string;
  toAddr?: string;
  content: string;
  contentType?: string;
  customerId?: number;
  leadId?: number;
  contactId?: number;
  externalId?: string;
  metadata?: any;
  tenantId?: number;
}

// Send or record a message in the unified system
export async function sendMessage(input: SendMessageInput) {
  const message = await prisma.message.create({
    data: {
      channel: input.channel,
      direction: input.direction,
      fromAddr: input.fromAddr,
      toAddr: input.toAddr || null,
      content: input.content,
      contentType: input.contentType || "text",
      customerId: input.customerId || null,
      leadId: input.leadId || null,
      contactId: input.contactId || null,
      externalId: input.externalId || null,
      metadata: input.metadata || null,
      tenantId: input.tenantId || null,
    },
  });

  return message;
}

// Identity Resolution: match email/phone to existing CRM entities
export async function resolveIdentity(identifier: string, type: "email" | "phone"): Promise<{
  entityType: string;
  entityId: number;
  name: string;
} | null> {
  // Try Contact first (most specific)
  if (type === "email") {
    const contact = await prisma.contact.findFirst({
      where: { email: identifier },
      include: { customer: { select: { id: true, company: true } } },
    });
    if (contact) {
      return { entityType: "Contact", entityId: contact.id, name: contact.name };
    }
  }

  // Try Customer
  if (type === "email") {
    const customer = await prisma.customer.findFirst({
      where: { email: identifier },
    });
    if (customer) {
      return { entityType: "Customer", entityId: customer.id, name: customer.company };
    }
  }

  // Try Lead
  if (type === "email") {
    const lead = await prisma.lead.findFirst({
      where: { email: identifier },
    });
    if (lead) {
      return { entityType: "Lead", entityId: lead.id, name: lead.company };
    }
  }

  // Phone matching
  if (type === "phone") {
    const contact = await prisma.contact.findFirst({
      where: { phone: identifier },
    });
    if (contact) {
      return { entityType: "Contact", entityId: contact.id, name: contact.name };
    }
  }

  return null;
}

// Get unified conversation for a customer
export async function getConversation(customerId: number, limit = 50) {
  const messages = await prisma.message.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages;
}

// Get unified timeline for a customer (messages + activities + tasks)
export async function getCustomerTimeline(customerId: number) {
  const [messages, followUps, tasks, quotes, orders] = await Promise.all([
    prisma.message.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.followUp.findMany({
      where: { customerId },
      orderBy: { followUpDate: "desc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.quote.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Combine and sort by date
  const timeline: Array<{
    type: string;
    date: Date;
    data: any;
  }> = [];

  messages.forEach(m => timeline.push({ type: "message", date: m.createdAt, data: m }));
  followUps.forEach(f => timeline.push({ type: "followup", date: f.followUpDate, data: f }));
  tasks.forEach(t => timeline.push({ type: "task", date: t.createdAt, data: t }));
  quotes.forEach(q => timeline.push({ type: "quote", date: q.createdAt, data: q }));
  orders.forEach(o => timeline.push({ type: "order", date: o.createdAt, data: o }));

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return timeline.slice(0, 50);
}

// AI analysis for a message (lightweight)
export async function analyzeMessage(messageId: number) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return null;

  // Simple rule-based analysis
  let intent = "inquiry";
  let sentiment = "neutral";
  let urgency = "low";

  const content = message.content.toLowerCase();

  // Intent detection
  if (content.includes("price") || content.includes("quote") || content.includes("报价")) {
    intent = "order";
  } else if (content.includes("help") || content.includes("issue") || content.includes("problem") || content.includes("问题")) {
    intent = "support";
  } else if (content.includes("follow") || content.includes("跟进") || content.includes("check")) {
    intent = "follow_up";
  }

  // Sentiment detection
  if (content.includes("thank") || content.includes("great") || content.includes("good") || content.includes("谢谢") || content.includes("好")) {
    sentiment = "positive";
  } else if (content.includes("bad") || content.includes("issue") || content.includes("complaint") || content.includes("差") || content.includes("投诉")) {
    sentiment = "negative";
  }

  // Urgency detection
  if (content.includes("urgent") || content.includes("asap") || content.includes("紧急") || content.includes("马上")) {
    urgency = "high";
  } else if (content.includes("soon") || content.includes("快") || content.includes("尽快")) {
    urgency = "medium";
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { intent, sentiment, urgency },
  });

  return { intent, sentiment, urgency };
}
