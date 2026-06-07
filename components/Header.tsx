import Link from "next/link";
import { Search } from "lucide-react";
import { isAIConfigured } from "@/lib/ai/types";

export default function Header() {
  const aiConfigured = isAIConfigured();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <Link
          href="/search"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Search size={14} />
          <span>全局搜索...</span>
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              aiConfigured
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                aiConfigured ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            {aiConfigured ? "AI 已配置" : "AI 未配置"}
          </span>
          <span className="text-xs text-gray-400">Local · 3003</span>
        </div>
      </div>
    </header>
  );
}
