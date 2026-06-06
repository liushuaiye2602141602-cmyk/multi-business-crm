"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import AIAnalysisResult from "./AIAnalysisResult";
import { testAIAnalysis } from "@/lib/ai/actions";

interface AITestFormProps {
  businessLines: Array<{
    id: number;
    name: string;
    code: string | null;
  }>;
}

export default function AITestForm({ businessLines }: AITestFormProps) {
  const [inquiry, setInquiry] = useState("");
  const [businessLineCode, setBusinessLineCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    analysis: {
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
    rawOutput: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiry.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await testAIAnalysis(inquiry, businessLineCode);
      if (response.success && response.analysis) {
        setResult({
          analysis: response.analysis,
          rawOutput: response.rawOutput || "",
        });
      } else {
        setError(response.error || "AI 分析失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 分析失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">测试 AI 分析</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择业务线
            </label>
            <select
              value={businessLineCode}
              onChange={(e) => setBusinessLineCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">通用（不指定业务线）</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.code || ""}>
                  {bl.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              输入客户询盘
            </label>
            <textarea
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              rows={8}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: Hi, I'm interested in your stand up pouches. We need 50,000pcs for food packaging. Can you send me your catalog and price list?"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !inquiry.trim()}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                测试 AI 分析
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <>
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">分析结果</h2>
            <AIAnalysisResult analysis={result.analysis} />
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">AI 原始输出</h2>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
              {result.rawOutput}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
