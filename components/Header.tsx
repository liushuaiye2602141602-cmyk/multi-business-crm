import { isAIConfigured } from "@/lib/ai/types";

export default function Header() {
  const aiConfigured = isAIConfigured();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-500">
            本地环境 / Port 3003
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              aiConfigured
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                aiConfigured ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            {aiConfigured ? "AI 已配置" : "AI 未配置"}
          </span>
        </div>
      </div>
    </header>
  );
}
