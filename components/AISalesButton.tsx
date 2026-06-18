"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

export default function AISalesButton({
  entityType,
  entityId,
}: {
  entityType: "Lead" | "Customer";
  entityId: number;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/sales-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
      >
        <Bot size={16} />
        {loading ? "生成中..." : "AI Sales Assistant"}
      </button>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-indigo-700 uppercase">{s.channel}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.priority === "high" ? "bg-red-100 text-red-700" :
                  s.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {s.priority}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
