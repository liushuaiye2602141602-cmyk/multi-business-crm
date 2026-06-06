export interface AIAnalysisResult {
  summary?: string;
  requirementSummary?: string;
  extractedRequirements?: string;
  qualificationLevel?: string;
  intentLevel?: string;
  buyerTypeGuess?: string;
  riskPoints?: string;
  missingInfo?: string;
  suggestedQuestions?: string;
  nextAction?: string;
  whatsappReply?: string;
  emailSubject?: string;
  emailReply?: string;
  internalSalesNote?: string;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  isEnabled: boolean;
}

export function getAIConfig(): AIConfig {
  const provider = process.env.AI_PROVIDER || "OPENAI_COMPATIBLE";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "";
  const baseUrl = process.env.AI_BASE_URL || "";

  return {
    provider,
    apiKey,
    model,
    baseUrl,
    isEnabled: !!apiKey,
  };
}

export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return config.isEnabled && !!config.model;
}
