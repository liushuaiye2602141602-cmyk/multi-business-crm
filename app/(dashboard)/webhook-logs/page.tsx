import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { WebhookStatusLabel } from "@/lib/enums";
import { getWebhookStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function WebhookLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const status = typeof params.status === "string" ? params.status : "";
  const sourceId = typeof params.sourceId === "string" ? params.sourceId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { sourceCode: { contains: search, mode: "insensitive" } },
      { errorMessage: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (sourceId) where.externalSourceId = parseInt(sourceId);

  const [logs, externalSources] = await Promise.all([
    prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.externalSource.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || status || sourceId;

  return (
    <div>
      <PageHeader
        title="Webhook 日志"
        description="查看所有 Webhook 调用记录"
      />

      <SearchFilterBar
        searchPlaceholder="搜索 sourceCode、错误信息..."
        filters={[
          { name: "status", label: "状态", options: Object.entries(WebhookStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "sourceId", label: "来源", options: externalSources.map((s) => ({ value: String(s.id), label: s.name })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ status, sourceId }}
      />

      <Card padding="none">
        {logs.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的日志" : "暂无 Webhook 日志"}
            description={hasFilters ? "请调整筛选条件" : "Webhook 调用记录将显示在这里"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">来源</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">创建线索</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">错误信息</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">IP</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{log.sourceCode || "-"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={WebhookStatusLabel[log.status] || log.status}
                        variant={getWebhookStatusVariant(log.status)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {log.createdLeadId ? (
                        <Link href={`/leads/${log.createdLeadId}`} className="text-blue-600 hover:underline">
                          #{log.createdLeadId}
                        </Link>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4 text-red-600 max-w-[200px] truncate">{log.errorMessage || "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{log.ipAddress || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end">
                        <Link href={`/webhook-logs/${log.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
