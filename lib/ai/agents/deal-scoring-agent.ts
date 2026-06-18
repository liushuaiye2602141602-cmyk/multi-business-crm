import prisma from "@/lib/prisma";

export async function scoreDealProbability(entityType: "Lead" | "Customer", entityId: number): Promise<number> {
  let score = 50;

  if (entityType === "Lead") {
    const lead = await prisma.lead.findUnique({
      where: { id: entityId },
      include: { followUps: true, quotes: true },
    });

    if (!lead) return 0;

    // Contact completeness
    if (lead.email) score += 8;
    if (lead.phone) score += 8;
    if (lead.whatsapp) score += 8;

    // Engagement
    score += Math.min(lead.followUps.length * 3, 15);
    score += Math.min(lead.quotes.length * 5, 15);

    // Content quality
    if (lead.requirement && lead.requirement.length > 20) score += 10;
    if (lead.budget && Number(lead.budget) > 1000) score += 10;

    // Status
    if (lead.status === "QUALIFIED") score += 15;
    if (lead.status === "LOST") score -= 30;

  } else {
    const customer = await prisma.customer.findUnique({
      where: { id: entityId },
      include: { quotes: true, orders: true, followUps: true },
    });

    if (!customer) return 0;

    // Lifecycle
    if (customer.lifecycleStage === "FIRST_DEAL") score += 20;
    if (customer.lifecycleStage === "REPEAT_DEAL") score += 25;
    if (customer.lifecycleStage === "VIP") score += 30;

    // Activity
    score += Math.min(customer.quotes.length * 3, 10);
    score += Math.min(customer.orders.length * 5, 15);
    score += Math.min(customer.followUps.length * 2, 10);
  }

  score = Math.max(0, Math.min(100, score));

  // Update entity
  if (entityType === "Lead") {
    await prisma.lead.update({ where: { id: entityId }, data: { aiScore: score } });
  } else {
    const intentLevel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
    await prisma.customer.update({
      where: { id: entityId },
      data: { aiScore: score, aiIntentLevel: intentLevel, lastAiActionAt: new Date() },
    });
  }

  // Log
  await prisma.aILog.create({
    data: {
      entityType,
      entityId,
      actionType: "score",
      aiOutput: JSON.stringify({ score }),
    },
  });

  return score;
}
