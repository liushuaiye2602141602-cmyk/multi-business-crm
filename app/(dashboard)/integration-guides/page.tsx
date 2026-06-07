import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import { ExternalLink, Workflow, Globe, Bot, Server } from "lucide-react";

export default function IntegrationGuidesPage() {
  const guides = [
    {
      title: "n8n 工作流接入",
      description: "适合连接网站表单、Google Sheet、AI 营销系统和其他自动化流程",
      href: "/integration-guides/n8n",
      icon: Workflow,
      color: "bg-orange-50 border-orange-200 text-orange-700",
    },
    {
      title: "独立站表单接入",
      description: "WordPress、Elementor、Contact Form 7 等网站表单接入 CRM",
      href: "/integration-guides/website-form",
      icon: Globe,
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      title: "AI 营销系统接入",
      description: "AI 营销系统产生的线索推送到 CRM",
      href: "/integration-guides/ai-marketing-system",
      icon: Bot,
      color: "bg-purple-50 border-purple-200 text-purple-700",
    },
    {
      title: "飞书接入（预留）",
      description: "后续通过飞书表格、多维表格或机器人把线索推送到 CRM",
      href: "/integration-guides/feishu",
      icon: Bot,
      color: "bg-green-50 border-green-200 text-green-700",
    },
    {
      title: "Docker 本地服务",
      description: "当前 CRM 使用 Docker PostgreSQL，本地部署可扩展更多服务",
      href: "/integration-guides/docker",
      icon: Server,
      color: "bg-gray-50 border-gray-200 text-gray-700",
    },
  ];

  return (
    <div>
      <PageHeader title="接入指南" description="管理独立站、n8n、AI 营销系统、飞书等外部线索入口" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link
              key={guide.href}
              href={guide.href}
              className={`block p-6 rounded-lg border hover:shadow-md transition-shadow ${guide.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={20} />
                  <h3 className="text-lg font-semibold">{guide.title}</h3>
                </div>
                <ExternalLink size={16} className="opacity-50" />
              </div>
              <p className="text-sm opacity-80">{guide.description}</p>
            </Link>
          );
        })}
      </div>

      {/* 快速参考 */}
      <Card>
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
      </Card>
    </div>
  );
}
