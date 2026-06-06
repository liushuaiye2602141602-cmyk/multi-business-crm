"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import AIAnalysisResult from "./AIAnalysisResult";
import { rewriteTemplate } from "@/lib/ai/actions";

interface TemplateAISectionProps {
  templateId: number;
  isAIConfigured: boolean;
  latestAnalysis: {
    summary?: string | null;
    leadLevel?: string | null;
    intentLevel?: string | null;
    painPoints?: string | null;
    missingInfo?: string | null;
    suggestedQuestions?: string | null;
    suggestedReplyWhatsapp?: string | null;
    suggestedReplyEmail?: string | null;
    nextAction?: string | null;
    createdAt?: Date;
  } | null;
}

export default function TemplateAISection({
  templateId,
  isAIConfigured,
  latestAnalysis,
}: TemplateAISectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [rewriteType, setRewriteType] = useState<"whatsapp" | "email" | "high_intent" | null>(null);
  const [result, setResult] = useState<{
    summary?: string | null;
    leadLevel?: string | null;
    intentLevel?: string | null;
    painPoints?: string | null;
    missingInfo?: string | null;
    suggestedQuestions?: string | null;
    suggestedReplyWhatsapp?: string | null;
    suggestedReplyEmail?: string | null;
    nextAction?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRewrite(type: "whatsapp" | "email" | "high_intent") {
    setIsLoading(true);
    setRewriteType(type);
    setError(null);
    setResult(null);

    try {
      const response = await rewriteTemplate(templateId, type);
      if (response.success && response.analysis) {
        setResult(response.analysis);
      } else {
        setError(response.error || "AI 改写失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 改写失败");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isAIConfigured) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">AI 改写</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            AI 未配置，请先在 <code className="bg-yellow-100 px-1 rounded">.env</code> 中配置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">AI 改写</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => handleRewrite("whatsapp")}
          disabled={isLoading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isLoading && rewriteType === "whatsapp" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          WhatsApp 口语版
        </button>
        <button
          onClick={() => handleRewrite("email")}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading && rewriteType === "email" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          正式 Email 版
        </button>
        <button
          onClick={() => handleRewrite("high_intent")}
          disabled={isLoading}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isLoading && rewriteType === "high_intent" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          高意向客户版
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 pt-4 border-t">
          <AIAnalysisResult analysis={result} />
        </div>
      )}

      {!result && !error && latestAnalysis && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500 mb-2">
            最近一次改写：{latestAnalysis.createdAt ? new Date(latestAnalysis.createdAt).toLocaleString("zh-CN") : ""}
          </p>
          <AIAnalysisResult analysis={latestAnalysis} />
        </div>
      )}
    </div>
  );
}
