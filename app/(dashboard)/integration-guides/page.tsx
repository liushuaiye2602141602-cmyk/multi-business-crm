import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { ExternalLink } from "lucide-react";

export default function IntegrationGuidesPage() {
  const guides = [
    {
      title: "n8n 接入指南",
      description: "把网站表单、Facebook 表单、Google Sheet、AI 营销系统等线索通过 n8n 推送到 CRM",
      href: "/integration-guides/n8n",
      color: "bg-orange-50 border-orange-200",
    },
    {
      title: "独立站表单接入指南",
      description: "WordPress、Elementor、Contact Form 7 等网站表单接入 CRM",
      href: "/integration-guides/website-form",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "AI 营销系统接入指南",
      description: "AI 营销系统产生的线索推送到 CRM",
      href: "/integration-guides/ai-marketing-system",
      color: "bg-purple-50 border-purple-200",
    },
  ];

  return (
    <div>
      <PageHeader title="接入指南" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className={`block p-6 rounded-lg border hover:shadow-md transition-shadow ${guide.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{guide.title}</h3>
              <ExternalLink size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">{guide.description}</p>
          </Link>
        ))}
      </div>

      {/* 快速参考 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">快速参考</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Webhook API 地址</p>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
              POST http://localhost:3003/api/webhooks/leads
            </code>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">必需 Headers</p>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
              x-crm-source-code: your-source-code<br />
              x-crm-api-key: crm_sk_xxxxx
            </code>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">必填字段</p>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
              companyName (公司名称)
            </code>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">业务线代码</p>
            <div className="flex flex-wrap gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">flexible-packaging</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">packaging-machinery</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">wooden-crafts</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
