import Link from "next/link";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, TestTube, BookOpen, Map } from "lucide-react";
import { ExternalSourceTypeLabel, WebhookStatusLabel, LeadSourceLabel } from "@/lib/enums";
import { formatDate, formatDateTime } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import GenerateApiKeyButton from "@/components/GenerateApiKeyButton";

export default async function ExternalSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sourceId = parseInt(id);

  const [source, recentLogs, recentLeads] = await Promise.all([
    prisma.externalSource.findUnique({
      where: { id: sourceId },
      include: { businessLine: true },
    }),
    prisma.webhookLog.findMany({
      where: { externalSourceId: sourceId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.lead.findMany({
      where: {
        source: "WEBSITE",
        businessLineId: sourceId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!source) return notFound();

  const webhookUrl = `http://localhost:3003/api/webhooks/leads`;

  // 统计最近 20 次 Webhook 成功率
  const logStats = {
    total: recentLogs.length,
    success: recentLogs.filter((l) => l.status === "SUCCESS").length,
    failed: recentLogs.filter((l) => l.status === "FAILED").length,
    duplicate: recentLogs.filter((l) => l.status === "DUPLICATE").length,
    unauthorized: recentLogs.filter((l) => l.status === "UNAUTHORIZED").length,
  };

  return (
    <div>
      <PageHeader
        title={source.name}
        backHref="/external-sources"
        action={{ label: "编辑", href: `/external-sources/${source.id}/edit`, icon: <Pencil size={16} /> }}
      />

      {/* 快捷按钮 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link
          href={`/webhook-test?sourceId=${source.id}`}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <TestTube size={16} />
          测试 Webhook
        </Link>
        <Link
          href="/integration-guides/n8n-templates"
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          <BookOpen size={16} />
          n8n 模板指南
        </Link>
        <Link
          href="/integration-guides/lead-field-mapping"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Map size={16} />
          字段映射指南
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基础信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">名称：</span>
              <span className="font-medium">{source.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">代码：</span>
              <span className="font-mono text-xs">{source.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">类型：</span>
              <Badge label={ExternalSourceTypeLabel[source.sourceType] || source.sourceType} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">默认业务线：</span>
              <span>{source.businessLine?.name || "不指定"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">默认来源：</span>
              <span>{LeadSourceLabel[source.defaultSource] || source.defaultSource}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">默认等级：</span>
              <span>{source.defaultLeadGrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">自动 AI 分析：</span>
              <Badge
                label={source.autoAnalyze ? "是" : "否"}
                className={source.autoAnalyze ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">状态：</span>
              <Badge
                label={source.isActive ? "启用" : "停用"}
                className={source.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">创建时间：</span>
              <span>{formatDate(source.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* API Key 管理 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">API Key 管理</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">API Key 状态：</span>
              <Badge
                label={source.apiKeyHash ? "已配置" : "未配置"}
                className={source.apiKeyHash ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
              />
            </div>
            <GenerateApiKeyButton sourceId={source.id} hasExistingKey={!!source.apiKeyHash} />
            {source.apiKeyHash && (
              <p className="text-xs text-gray-500">
                API Key 仅在生成时显示一次，请使用生成时复制的 Key。
              </p>
            )}
          </div>

          {/* Webhook 成功率统计 */}
          {logStats.total > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-3">最近 {logStats.total} 次 Webhook 统计</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 p-2 rounded text-center">
                  <div className="text-lg font-bold text-green-700">{logStats.success}</div>
                  <div className="text-xs text-green-600">成功</div>
                </div>
                <div className="bg-yellow-50 p-2 rounded text-center">
                  <div className="text-lg font-bold text-yellow-700">{logStats.duplicate}</div>
                  <div className="text-xs text-yellow-600">重复</div>
                </div>
                <div className="bg-red-50 p-2 rounded text-center">
                  <div className="text-lg font-bold text-red-700">{logStats.failed}</div>
                  <div className="text-xs text-red-600">失败</div>
                </div>
                <div className="bg-orange-50 p-2 rounded text-center">
                  <div className="text-lg font-bold text-orange-700">{logStats.unauthorized}</div>
                  <div className="text-xs text-orange-600">未授权</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook 调用示例 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">标准调用信息</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Webhook URL</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
              POST {webhookUrl}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">请求 Headers</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs">
              Content-Type: application/json<br />
              x-crm-source-code: {source.code}<br />
              x-crm-api-key: [使用生成时复制的 API Key]
            </div>
          </div>
        </div>
      </div>

      {/* 最近创建的 Leads */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近创建的线索</h2>
          <Link href="/leads" className="text-blue-600 hover:underline text-sm">
            查看全部
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无线索</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">公司</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">联系人</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">邮箱</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      <Link href={`/leads/${lead.id}`} className="text-blue-600 hover:underline">
                        {lead.company}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{lead.contactName}</td>
                    <td className="py-2 px-3">{lead.email || "-"}</td>
                    <td className="py-2 px-3 text-gray-500">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 最近 Webhook 日志 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近 Webhook 日志</h2>
          <Link href={`/webhook-logs?sourceId=${source.id}`} className="text-blue-600 hover:underline text-sm">
            查看全部
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无 Webhook 调用记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">时间</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">创建线索</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">错误信息</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 px-3 text-gray-500">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2 px-3">
                      <Badge
                        label={WebhookStatusLabel[log.status] || log.status}
                        className={
                          log.status === "SUCCESS" ? "bg-green-100 text-green-700" :
                          log.status === "DUPLICATE" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }
                      />
                    </td>
                    <td className="py-2 px-3">
                      {log.createdLeadId ? (
                        <Link href={`/leads/${log.createdLeadId}`} className="text-blue-600 hover:underline">
                          #{log.createdLeadId}
                        </Link>
                      ) : "-"}
                    </td>
                    <td className="py-2 px-3 text-red-600 max-w-xs truncate">{log.errorMessage || "-"}</td>
                    <td className="py-2 px-3 text-gray-500">{log.ipAddress || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
