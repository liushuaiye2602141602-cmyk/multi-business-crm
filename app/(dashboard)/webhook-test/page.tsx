import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import WebhookTestForm from "@/components/WebhookTestForm";
import { formatDateTime } from "@/lib/format";
import { WebhookStatusLabel } from "@/lib/enums";
import Badge from "@/components/Badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WebhookTestPage() {
  const externalSources = await prisma.externalSource.findMany({
    where: { isActive: true },
    include: { businessLine: true },
    orderBy: { name: "asc" },
  });

  const recentLogs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div>
      <PageHeader title="Webhook 测试" />

      <WebhookTestForm externalSources={externalSources} />

      {/* 最近 Webhook 日志 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">最近 Webhook 日志</h2>
        {recentLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无 Webhook 日志</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">时间</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">来源</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">创建线索</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">错误</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 px-3 text-gray-500">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2 px-3 font-mono text-xs">{log.sourceCode || "-"}</td>
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
