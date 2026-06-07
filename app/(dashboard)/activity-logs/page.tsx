import prisma from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="操作日志"
        description="查看系统操作记录"
      />

      <Card padding="none">
        {logs.length === 0 ? (
          <EmptyState message="暂无操作日志" description="系统操作记录将显示在这里" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">对象类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">对象名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={log.action}
                        variant={
                          log.action.includes("创建") ? "success" :
                          log.action.includes("更新") ? "info" :
                          log.action.includes("删除") ? "danger" :
                          log.action.includes("AI") ? "purple" :
                          "default"
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{log.entityType}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{log.entityName || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[300px] truncate">{log.description || "-"}</td>
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
