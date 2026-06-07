import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import { ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FeishuGuidePage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="飞书接入预留说明" backHref="/integration-guides" />

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">接入方式</h2>
        <p className="text-gray-600 mb-4">
          当前阶段暂不直接对接飞书 API，建议通过以下方式实现线索同步：
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <span>飞书表格 / 多维表格 / 飞书机器人</span>
            <ArrowRight size={16} />
            <span>n8n</span>
            <ArrowRight size={16} />
            <span>CRM Webhook</span>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">推荐方案</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900">方案一：飞书表格 → n8n → CRM</h3>
            <p className="text-sm text-gray-600 mt-1">
              在飞书表格中整理客户数据，通过 n8n 定时读取并推送到 CRM Webhook。
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-medium text-gray-900">方案二：飞书机器人 → n8n → CRM</h3>
            <p className="text-sm text-gray-600 mt-1">
              通过飞书机器人接收消息，转发到 n8n 处理后推送到 CRM。
            </p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-medium text-gray-900">方案三：飞书多维表格 Webhook</h3>
            <p className="text-sm text-gray-600 mt-1">
              利用飞书多维表格的 Webhook 功能，在数据变更时自动推送到 CRM。
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">相关资源</h2>
        <div className="space-y-2">
          <Link href="/integration-guides/n8n" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            n8n 接入详细指南
          </Link>
          <Link href="/integration-guides/n8n-templates" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            n8n 工作流模板
          </Link>
          <Link href="/webhook-test" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            Webhook 测试页
          </Link>
        </div>
      </Card>
    </div>
  );
}
