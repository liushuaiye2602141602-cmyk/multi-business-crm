import prisma from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="操作日志" />

      <div className="bg-white rounded-lg border">
        {logs.length === 0 ? (
          <EmptyState message="暂无操作日志" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">对象类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">对象名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">描述</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.action === "创建" ? "bg-green-100 text-green-700" :
                        log.action === "更新" ? "bg-blue-100 text-blue-700" :
                        log.action === "删除" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">{log.entityType}</td>
                    <td className="py-3 px-4 font-medium">{log.entityName || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{log.description || "-"}</td>
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
