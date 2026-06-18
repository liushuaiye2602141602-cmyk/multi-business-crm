import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="系统设置"
        description="管理系统配置和偏好"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI 配置</h2>
          <p className="text-sm text-gray-500">配置 AI 模型和 API Key</p>
          <a href="/ai-settings" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            前往 AI 设置 →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">IM 配置</h2>
          <p className="text-sm text-gray-500">配置飞书等 IM 平台接入</p>
          <a href="/im-settings" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            前往 IM 设置 →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">邮件配置</h2>
          <p className="text-sm text-gray-500">配置 SMTP/IMAP 邮件服务</p>
          <a href="/email/settings" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            前往邮件设置 →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">业务线管理</h2>
          <p className="text-sm text-gray-500">管理业务线配置</p>
          <a href="/business-lines" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            前往业务线管理 →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">外部接入</h2>
          <p className="text-sm text-gray-500">配置 Webhook 和外部数据源</p>
          <a href="/external-sources" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            前往外部接入 →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统健康</h2>
          <p className="text-sm text-gray-500">检查系统运行状态</p>
          <a href="/system-health" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            前往系统检查 →
          </a>
        </div>
      </div>
    </div>
  );
}
