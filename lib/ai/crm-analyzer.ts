import prisma from "@/lib/prisma";

interface LeadAnalysis {
  score: number;
  summary: string;
  tags: string[];
  intentLevel: "High" | "Medium" | "Low";
  suggestedAction: string;
}

/**
 * Analyze a lead and return AI insights.
 * Uses rule-based analysis (no external API dependency).
 * Can be upgraded to use LLM later.
 */
export async function analyzeLead(leadId: number): Promise<LeadAnalysis> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { followUps: true, tasks: true, quotes: true },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  let score = 50; // base score
  const tags: string[] = [];

  // Score adjustments
  if (lead.email) { score += 10; tags.push("有邮箱"); }
  if (lead.phone) { score += 10; tags.push("有电话"); }
  if (lead.whatsapp) { score += 10; tags.push("有WhatsApp"); }
  if (lead.country) { score += 5; tags.push(`来自${lead.country}`); }
  if (lead.requirement) { score += 15; tags.push("有明确需求"); }
  if (lead.interestProducts) { score += 10; tags.push("有产品兴趣"); }
  if (lead.budget && Number(lead.budget) > 1000) { score += 10; tags.push("有预算"); }
  if (lead.followUps.length > 0) { score += 5; tags.push("已跟进"); }
  if (lead.quotes.length > 0) { score += 10; tags.push("已有报价"); }

  // Deductions
  if (lead.status === "LOST") { score -= 30; tags.push("已流失"); }
  if (lead.status === "DORMANT") { score -= 20; tags.push("休眠"); }
  if (!lead.email && !lead.phone && !lead.whatsapp) { score -= 15; tags.push("无联系方式"); }

  score = Math.max(0, Math.min(100, score));

  // Determine intent level
  let intentLevel: "High" | "Medium" | "Low" = "Medium";
  if (score >= 70) intentLevel = "High";
  else if (score < 40) intentLevel = "Low";

  // Generate summary
  const summary = generateLeadSummary(lead, score, intentLevel, tags);

  // Suggest action
  const suggestedAction = generateSuggestedAction(lead, score, intentLevel);

  // Save to database
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      aiScore: score,
      aiSummary: summary,
      aiTags: tags,
    },
  });

  return { score, summary, tags, intentLevel, suggestedAction };
}

function generateLeadSummary(lead: any, score: number, intent: string, tags: string[]): string {
  const parts: string[] = [];
  parts.push(`${lead.company} 是一个来自 ${lead.country || "未知地区"} 的潜在客户。`);

  if (intent === "High") {
    parts.push("该客户意向较高，建议优先跟进。");
  } else if (intent === "Low") {
    parts.push("该客户意向较低，建议持续培育。");
  } else {
    parts.push("该客户意向中等，建议正常跟进。");
  }

  if (lead.requirement) {
    parts.push(`需求：${lead.requirement}`);
  }

  return parts.join("");
}

function generateSuggestedAction(lead: any, score: number, intent: string): string {
  if (intent === "High") return "建议24小时内电话跟进，发送产品报价";
  if (intent === "Low") return "建议发送公司介绍邮件，持续培育";

  if (lead.followUps.length === 0) return "建议首次联系，了解客户需求";
  if (lead.quotes.length === 0) return "建议发送报价单";
  return "建议跟进报价反馈";
}

/**
 * Generate sales suggestions for a customer
 */
export async function generateSalesSuggestions(customerId: number) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { quotes: true, orders: true, followUps: true, contacts: true },
  });

  if (!customer) throw new Error("Customer not found");

  const suggestions: string[] = [];

  // Based on lifecycle stage
  if (customer.lifecycleStage === "POTENTIAL") {
    suggestions.push("该客户处于潜在阶段，建议发送公司介绍和产品目录");
  } else if (customer.lifecycleStage === "INTENT") {
    suggestions.push("该客户有意向，建议发送针对性报价");
  } else if (customer.lifecycleStage === "FIRST_DEAL") {
    suggestions.push("首次成交客户，建议跟进使用反馈，推动复购");
  }

  // Based on quote status
  const pendingQuotes = customer.quotes.filter(q => ["SENT", "WAITING_FEEDBACK"].includes(q.status));
  if (pendingQuotes.length > 0) {
    suggestions.push(`有 ${pendingQuotes.length} 个报价等待客户反馈，建议主动跟进`);
  }

  // Based on order status
  const activeOrders = customer.orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
  if (activeOrders.length > 0) {
    suggestions.push(`有 ${activeOrders.length} 个活跃订单，建议关注交付进度`);
  }

  // Based on follow-up recency
  const lastFollowUp = customer.followUps.sort((a, b) =>
    new Date(b.followUpDate).getTime() - new Date(a.followUpDate).getTime()
  )[0];

  if (!lastFollowUp) {
    suggestions.push("暂无跟进记录，建议尽快建立联系");
  } else {
    const daysSince = Math.floor((Date.now() - new Date(lastFollowUp.followUpDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 30) {
      suggestions.push(`已 ${daysSince} 天未跟进，建议尽快联系`);
    } else if (daysSince > 7) {
      suggestions.push(`上次跟进在 ${daysSince} 天前，建议安排下次跟进`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("客户状态良好，继续保持定期跟进");
  }

  return suggestions;
}
