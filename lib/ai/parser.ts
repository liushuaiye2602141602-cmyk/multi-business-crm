import { AIAnalysisResult } from "./types";

export function parseAIResponse(rawOutput: string): AIAnalysisResult {
  try {
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      return {
        summary: parsed.summary || undefined,
        requirementSummary: parsed.requirementSummary || undefined,
        extractedRequirements: parsed.extractedRequirements
          ? (typeof parsed.extractedRequirements === "string"
              ? parsed.extractedRequirements
              : JSON.stringify(parsed.extractedRequirements))
          : undefined,
        qualificationLevel: parsed.qualificationLevel || parsed.leadLevel || undefined,
        intentLevel: parsed.intentLevel || undefined,
        buyerTypeGuess: parsed.buyerTypeGuess || undefined,
        riskPoints: parsed.riskPoints || parsed.painPoints || undefined,
        missingInfo: parsed.missingInfo || undefined,
        suggestedQuestions: parsed.suggestedQuestions || undefined,
        nextAction: parsed.nextAction || undefined,
        whatsappReply: parsed.whatsappReply || parsed.suggestedReplyWhatsapp || undefined,
        emailSubject: parsed.emailSubject || undefined,
        emailReply: parsed.emailReply || parsed.suggestedReplyEmail || undefined,
        internalSalesNote: parsed.internalSalesNote || undefined,
      };
    }
  } catch {
    // JSON 解析失败
  }

  return {
    summary: rawOutput,
    internalSalesNote: "AI 返回内容不是标准 JSON，已保存原始输出。",
  };
}

export function buildAnalysisTitle(
  targetType: string,
  entityName?: string
): string {
  const typeLabels: Record<string, string> = {
    LEAD: "线索分析",
    CUSTOMER: "客户复盘",
    PROJECT: "项目分析",
    FOLLOW_UP: "跟进回复",
    TEMPLATE: "模板改写",
  };

  const typeLabel = typeLabels[targetType] || "AI 分析";
  return entityName ? `${typeLabel}: ${entityName}` : typeLabel;
}
