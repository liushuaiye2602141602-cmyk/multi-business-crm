import { getAIConfig } from "@/lib/ai/types";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function AISettingsPage() {
  const config = getAIConfig();

  return (
    <div>
      <PageHeader title="AI 设置" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 当前配置状态 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">当前配置状态</h2>
          <div className="space-y-4">
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
              <span className="font-medium">{config.baseUrl || "未配置"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API Key</span>
              <Badge
                label={config.apiKey ? "已配置" : "未配置"}
                className={config.apiKey ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
              />
            </div>
          </div>
        </div>

        {/* 配置说明 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">配置说明</h2>
          <div className="space-y-4 text-sm text-gray-600">
            {!config.isEnabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">当前未配置 AI Key</p>
                <p className="text-yellow-700 mt-1">
                  请在项目根目录的 <code className="bg-yellow-100 px-1 rounded">.env</code> 文件中配置以下变量：
                </p>
                <pre className="mt-2 bg-yellow-100 p-2 rounded text-xs overflow-x-auto">
{`AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://your-api-url.com/v1"
AI_API_KEY="your-api-key"
AI_MODEL="your-model-name"`}
                </pre>
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-800 mb-2">支持的 Provider</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>OPENAI</strong> - OpenAI 官方 API</li>
                <li><strong>OPENAI_COMPATIBLE</strong> - 兼容 OpenAI API 的第三方服务</li>
                <li><strong>LOCAL</strong> - 本地部署的模型</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">配置示例</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">OpenAI 官方：</p>
                <pre className="text-xs">
{`AI_PROVIDER="OPENAI"
AI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"`}
                </pre>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg mt-2">
                <p className="font-medium mb-1">兼容 API（如 DeepSeek、Moonshot 等）：</p>
                <pre className="text-xs">
{`AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://api.deepseek.com/v1"
AI_API_KEY="sk-..."
AI_MODEL="deepseek-chat"`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">安全说明</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>API Key 存储在 .env 文件中，不会泄露到前端</li>
                <li>页面只显示是否已配置，不显示完整 Key</li>
                <li>即使 AI 未配置，CRM 基础功能仍然正常可用</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI 功能说明 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">AI 功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">线索 AI 分析</h3>
            <p className="text-sm text-gray-600">分析客户需求、判断等级意向、提取产品需求、生成回复草稿</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">客户 AI 复盘</h3>
            <p className="text-sm text-gray-600">总结客户历史、判断当前阶段、生成唤醒话术</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">项目 AI 分析</h3>
            <p className="text-sm text-gray-600">总结项目需求、识别缺失信息、生成报价前确认问题</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">跟进 AI 回复</h3>
            <p className="text-sm text-gray-600">根据客户反馈生成下一步回复、判断客户意向</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">模板 AI 改写</h3>
            <p className="text-sm text-gray-600">改写为 WhatsApp 口语版、正式 Email 版、高意向版</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">分析历史</h3>
            <p className="text-sm text-gray-600">查看所有 AI 分析记录，方便回顾和参考</p>
          </div>
        </div>
      </div>
    </div>
  );
}
