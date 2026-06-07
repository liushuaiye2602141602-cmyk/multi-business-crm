import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus, Power } from "lucide-react";
import { deleteExternalSource, toggleExternalSource } from "./actions";
import { ExternalSourceTypeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

export default async function ExternalSourcesPage() {
  const sources = await prisma.externalSource.findMany({
    orderBy: { createdAt: "desc" },
    include: { businessLine: true, _count: { select: { webhookLogs: true } } },
  });

  return (
    <div>
      <PageHeader
        title="外部来源 / 连接器"
        description="管理独立站、n8n、AI 营销系统、飞书、OpenClaw 等外部线索入口"
        actions={
          <Link href="/external-sources/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增来源
          </Link>
        }
      />

      <Card padding="none">
        {sources.length === 0 ? (
          <EmptyState
            message="暂无外部来源"
            description="点击右上角新增来源开始配置 Webhook 接入"
            actionLabel="新增来源"
            actionHref="/external-sources/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">代码</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">AI 分析</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Webhook 数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/external-sources/${source.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {source.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{source.code}</td>
                    <td className="py-3 px-4">
                      <StatusBadge label={ExternalSourceTypeLabel[source.sourceType] || source.sourceType} variant="info" />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{source.businessLine?.name || "-"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={source.autoAnalyze ? "自动" : "手动"}
                        variant={source.autoAnalyze ? "success" : "default"}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={source.isActive ? "启用" : "停用"}
                        variant={source.isActive ? "success" : "default"}
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{source._count.webhookLogs}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(source.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/external-sources/${source.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/external-sources/${source.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <form action={async () => { "use server"; await toggleExternalSource(source.id); }}>
                          <button type="submit" className={`p-1.5 rounded transition-colors ${source.isActive ? "text-green-500 hover:text-green-600 hover:bg-green-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                            <Power size={16} />
                          </button>
                        </form>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteExternalSource(source.id); }} />
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
