import Link from "next/link";
import { Search, Settings, HelpCircle } from "lucide-react";
import { isAIConfigured } from "@/lib/ai/types";
import CurrencyPopup from "./CurrencyPopup";
import LogoutButton from "./LogoutButton";

function LiveClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" });
  const dateStr = now.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" });
  return <span className="text-sm font-mono text-gray-700">{dateStr} {timeStr}</span>;
}

export default function Header() {
  const aiConfigured = isAIConfigured();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-2.5 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {/* Left: Search */}
        <Link
          href="/search"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Search size={14} />
          <span>全局搜索...</span>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Live clock */}
          <LiveClock />

          {/* Currency converter */}
          <CurrencyPopup />

          {/* AI status */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              aiConfigured
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${aiConfigured ? "bg-green-500" : "bg-yellow-500"}`} />
            {aiConfigured ? "AI" : "AI"}
          </span>

          <Link href="/settings" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="设置">
            <Settings size={16} />
          </Link>

          <Link href="/maintenance-guide" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="帮助">
            <HelpCircle size={16} />
          </Link>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
