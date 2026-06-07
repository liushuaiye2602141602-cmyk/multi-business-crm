import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Trash2, Power } from "lucide-react";
import { deleteExternalSource, toggleExternalSource } from "./actions";
import { ExternalSourceTypeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function ExternalSourcesPage() {
  const sources = await prisma.externalSource.findMany({
    orderBy: { createdAt: "desc" },
    include: { businessLine: true, _count: { select: { webhookLogs: true } } },
  });

  return (
    <div>
      <PageHeader
        title="外部来源"
        action={{ label: "新增来源", href: "/external-sources/new" }}
      />

      <div className="bg-white rounded-lg border">
        {sources.length === 0 ? (
          <EmptyState
            message="暂无外部来源，点击右上角新增来源开始配置"
            actionLabel="新增来源"
            actionHref="/external-sources/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">代码</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">AI 分析</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Webhook 数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">
                      <Link href={`/external-sources/${source.id}`} className="hover:text-blue-600">
                        {source.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{source.code}</td>
                    <td className="py-3 px-4">
                      <Badge label={ExternalSourceTypeLabel[source.sourceType] || source.sourceType} />
                    </td>
                    <td className="py-3 px-4">{source.businessLine?.name || "-"}</td>
                    <td className="py-3 px-4">
                      <Badge
                        label={source.autoAnalyze ? "自动" : "手动"}
                        className={source.autoAnalyze ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        label={source.isActive ? "启用" : "停用"}
                        className={source.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                      />
                    </td>
                    <td className="py-3 px-4">{source._count.webhookLogs}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(source.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/external-sources/${source.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/external-sources/${source.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                          <Pencil size={16} />
                        </Link>
                        <form action={async () => { "use server"; await toggleExternalSource(source.id); }}>
                          <button type="submit" className={`p-1 ${source.isActive ? "text-green-400 hover:text-green-600" : "text-gray-400 hover:text-green-600"}`}>
                            <Power size={16} />
                          </button>
                        </form>
                        <form action={async () => { "use server"; await deleteExternalSource(source.id); }}>
                          <button type="submit" className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
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
