import prisma from "@/lib/prisma";

interface SalesSuggestion {
  channel: "whatsapp" | "email" | "phone";
  message: string;
  language: "en" | "zh";
  priority: "high" | "medium" | "low";
}

export async function generateSalesMessage(
  entityType: "Lead" | "Customer",
  entityId: number
): Promise<SalesSuggestion[]> {
  let entity: any;

  if (entityType === "Lead") {
    entity = await prisma.lead.findUnique({ where: { id: entityId } });
  } else {
    entity = await prisma.customer.findUnique({ where: { id: entityId } });
  }

  if (!entity) throw new Error(`${entityType} not found`);

  const suggestions: SalesSuggestion[] = [];
  const name = entity.contactName || entity.company;
  const company = entity.company;

  // WhatsApp suggestion
  suggestions.push({
    channel: "whatsapp",
    message: `Hi ${name}, thank you for your interest in our products at ${company}. I wanted to follow up on your inquiry. Do you have any specific requirements I can help with?`,
    language: "en",
    priority: "high",
  });

  // Email suggestion
  suggestions.push({
    channel: "email",
    message: `Dear ${name},\n\nI hope this message finds you well. I'm following up regarding your inquiry about our products.\n\nWe have a wide range of solutions that could meet your needs. Could we schedule a brief call to discuss your specific requirements?\n\nBest regards`,
    language: "en",
    priority: "medium",
  });

  // Phone script
  suggestions.push({
    channel: "phone",
    message: `打电话给 ${name} (${company})，确认产品需求，介绍我们的优势，询问预算和时间线。`,
    language: "zh",
    priority: "low",
  });

  // Log the AI action
  await prisma.aILog.create({
    data: {
      entityType,
      entityId,
      actionType: "suggest",
      aiOutput: JSON.stringify(suggestions),
    },
  });

  return suggestions;
}
