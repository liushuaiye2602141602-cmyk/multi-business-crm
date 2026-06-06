import { getAIConfig } from "@/lib/ai/types";
import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import AITestForm from "@/components/AITestForm";

export const dynamic = "force-dynamic";

export default async function AITestPage() {
  const config = getAIConfig();

  const businessLines = await prisma.businessLine.findMany({
    where: { code: { not: null } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="AI 测试" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 配置状态 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">当前 AI 配置</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">AI 功能</span>
              <Badge
                label={config.isEnabled ? "已启用" : "未启用"}
                className={config.isEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Provider</span>
              <span className="font-medium">{config.provider || "未配置"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Model</span>
              <span className="font-medium">{config.model || "未配置"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Base URL</span>
              <span className="font-medium text-sm truncate max-w-[200px]">{config.baseUrl || "未配置"}</span>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">使用说明</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>此页面用于测试 AI 分析功能，不会保存到正式数据。</p>
            <p>您可以：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>输入一段客户询盘</li>
              <li>选择对应的业务线</li>
              <li>点击"测试 AI 分析"</li>
              <li>查看 AI 返回的结构化结果</li>
              <li>复制 WhatsApp 和 Email 回复草稿</li>
            </ul>
            <p className="mt-2 text-gray-500">用途：测试 API 是否稳定，以及 Prompt 效果是否满意。</p>
          </div>
        </div>
      </div>

      {/* 测试表单 */}
      <div className="mt-6">
        <AITestForm businessLines={businessLines} />
      </div>
    </div>
  );
}
