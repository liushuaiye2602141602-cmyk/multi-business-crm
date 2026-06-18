"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function AIAnalyzeButton({ leadId }: { leadId: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    summary: string;
    tags: string[];
    intentLevel: string;
    suggestedAction: string;
  } | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("AI analysis failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
      >
        <Sparkles size={16} />
        {loading ? "分析中..." : "AI 分析"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-purple-900">AI 评分：{result.score}/100</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              result.intentLevel === "High" ? "bg-green-100 text-green-700" :
              result.intentLevel === "Low" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              意向：{result.intentLevel}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{result.summary}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {result.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-purple-800 font-medium">{result.suggestedAction}</p>
        </div>
      )}
    </div>
  );
}
