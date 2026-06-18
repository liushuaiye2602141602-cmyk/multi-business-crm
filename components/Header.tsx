import Link from "next/link";
import { Search, Settings, Bell, HelpCircle } from "lucide-react";
import { isAIConfigured } from "@/lib/ai/types";
import CurrencyPopup from "./CurrencyPopup";
import LogoutButton from "./LogoutButton";

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
        <div className="flex items-center gap-1">
          <CurrencyPopup />

          <Link
            href="/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Bell size={14} />
            <span>消息</span>
          </Link>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              aiConfigured
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${aiConfigured ? "bg-green-500" : "bg-yellow-500"}`} />
            {aiConfigured ? "AI 已配置" : "AI 未配置"}
          </span>

          <Link href="/ai-settings" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="设置">
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
