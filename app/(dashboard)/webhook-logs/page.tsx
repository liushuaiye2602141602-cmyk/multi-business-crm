import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { WebhookStatusLabel } from "@/lib/enums";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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
      <PageHeader title="Webhook 日志" />

      <SearchFilterBar
        searchPlaceholder="搜索 sourceCode、错误信息..."
        filters={[
          { name: "status", label: "状态", options: Object.entries(WebhookStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "sourceId", label: "来源", options: externalSources.map((s) => ({ value: String(s.id), label: s.name })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ status, sourceId }}
      />

      <div className="bg-white rounded-lg border">
        {logs.length === 0 ? (
          <EmptyState message={hasFilters ? "没有找到匹配的日志" : "暂无 Webhook 日志"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">来源</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">创建线索</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">错误信息</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">IP</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 px-4 font-mono text-xs">{log.sourceCode || "-"}</td>
                    <td className="py-3 px-4">
                      <Badge
                        label={WebhookStatusLabel[log.status] || log.status}
                        className={
                          log.status === "SUCCESS" ? "bg-green-100 text-green-700" :
                          log.status === "DUPLICATE" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      {log.createdLeadId ? (
                        <Link href={`/leads/${log.createdLeadId}`} className="text-blue-600 hover:underline">
                          #{log.createdLeadId}
                        </Link>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4 text-red-600 max-w-xs truncate">{log.errorMessage || "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{log.ipAddress || "-"}</td>
                    <td className="py-3 px-4">
                      <Link href={`/webhook-logs/${log.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                        <Eye size={16} />
                      </Link>
                    </td>
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
