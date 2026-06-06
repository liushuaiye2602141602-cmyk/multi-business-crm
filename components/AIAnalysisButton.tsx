"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import AIAnalysisResult from "./AIAnalysisResult";

interface AIAnalysisButtonProps {
  action: () => Promise<{
    success: boolean;
    analysis?: {
      summary?: string | null;
      requirementSummary?: string | null;
      extractedRequirements?: string | null;
      qualificationLevel?: string | null;
      intentLevel?: string | null;
      buyerTypeGuess?: string | null;
      riskPoints?: string | null;
      missingInfo?: string | null;
      suggestedQuestions?: string | null;
      nextAction?: string | null;
      whatsappReply?: string | null;
      emailSubject?: string | null;
      emailReply?: string | null;
      internalSalesNote?: string | null;
    };
    error?: string;
  }>;
  label: string;
  isAIConfigured: boolean;
  onApplyGrade?: () => Promise<void>;
  onAppendToNotes?: () => Promise<void>;
  onCreateTask?: () => Promise<void>;
}

export default function AIAnalysisButton({
  action,
  label,
  isAIConfigured,
  onApplyGrade,
  onAppendToNotes,
  onCreateTask,
}: AIAnalysisButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    summary?: string | null;
    requirementSummary?: string | null;
    extractedRequirements?: string | null;
    qualificationLevel?: string | null;
    intentLevel?: string | null;
    buyerTypeGuess?: string | null;
    riskPoints?: string | null;
    missingInfo?: string | null;
    suggestedQuestions?: string | null;
    nextAction?: string | null;
    whatsappReply?: string | null;
    emailSubject?: string | null;
    emailReply?: string | null;
    internalSalesNote?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await action();
      if (response.success && response.analysis) {
        setResult(response.analysis);
      } else {
        setError(response.error || "AI 分析失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 分析失败");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isAIConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          AI 未配置，请先在 <code className="bg-yellow-100 px-1 rounded">.env</code> 中配置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL。
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            分析中...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            {label}
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-white border rounded-lg p-4">
          <AIAnalysisResult
            analysis={result}
            onApplyGrade={onApplyGrade}
            onAppendToNotes={onAppendToNotes}
            onCreateTask={onCreateTask}
          />
        </div>
      )}
    </div>
  );
}
