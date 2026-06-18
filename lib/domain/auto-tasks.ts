import prisma from "@/lib/prisma";

export async function createFollowUpTaskForLead(leadId: number) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await prisma.task.create({
    data: {
      tenantId: 1,
      title: `跟进新线索: ${lead.company}`,
      description: `新线索 ${lead.company} 需要首次联系`,
      type: "FOLLOW_UP",
      status: "PENDING",
      priority: "HIGH",
      dueDate: tomorrow,
      leadId: lead.id,
      ownerName: lead.contactName || null,
    },
  });
}

export async function createFollowUpTaskForQuote(quoteId: number) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await prisma.task.create({
    data: {
      tenantId: 1,
      title: `跟进报价: ${quote.quoteNo}`,
      description: `报价 ${quote.quoteNo} 已发送，需要跟进客户反馈`,
      type: "FOLLOW_UP",
      status: "PENDING",
      priority: "MEDIUM",
      dueDate: tomorrow,
      quoteId: quote.id,
    },
  });
}

export async function createProductionTaskForOrder(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);

  await prisma.task.create({
    data: {
      tenantId: 1,
      title: `跟进生产进度: ${order.orderNo}`,
      description: `订单 ${order.orderNo} 已确认，需要跟进生产进度`,
      type: "FOLLOW_UP",
      status: "PENDING",
      priority: "MEDIUM",
      dueDate: nextWeek,
      orderId: order.id,
    },
  });
}
