import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil, Plus } from "lucide-react";
import { deleteFollowUp } from "./actions";
import { FollowUpMethodLabel } from "@/lib/enums";
import { formatDate, formatEnumLabel } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const method = typeof params.method === "string" ? params.method : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { content: { contains: search, mode: "insensitive" } },
      { customerFeedback: { contains: search, mode: "insensitive" } },
      { nextAction: { contains: search, mode: "insensitive" } },
      { remark: { contains: search, mode: "insensitive" } },
    ];
  }
  if (method) where.method = method;

  const followUps = await prisma.followUp.findMany({
    where,
    orderBy: { followUpDate: "desc" },
    include: { lead: true, customer: true, project: true },
  });

  const hasFilters = search || method;

  return (
    <div>
      <PageHeader
        title="跟进记录"
        description="记录每一次客户沟通、客户反馈和下一步动作"
        actions={
          <Link href="/follow-ups/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增跟进
          </Link>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索跟进内容、客户反馈、下一步动作..."
        filters={[
          { name: "method", label: "跟进方式", options: Object.entries(FollowUpMethodLabel).map(([value, label]) => ({ value, label })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ method }}
      />

      <Card padding="none">
        {followUps.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的跟进记录" : "暂无跟进记录"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增跟进开始记录"}
            actionLabel={hasFilters ? undefined : "新增跟进"}
            actionHref={hasFilters ? undefined : "/follow-ups/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">关联对象</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">方式</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">内容</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">跟进日期</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">下次跟进</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {followUps.map((fu) => (
                  <tr key={fu.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      {fu.customer ? (
                        <Link href={`/customers/${fu.customerId}`} className="text-gray-900 hover:text-blue-600">{fu.customer.company}</Link>
                      ) : fu.lead ? (
                        <Link href={`/leads/${fu.leadId}`} className="text-gray-900 hover:text-blue-600">{fu.lead.company}</Link>
                      ) : fu.project ? (
                        <Link href={`/projects/${fu.projectId}`} className="text-gray-900 hover:text-blue-600">{fu.project.name}</Link>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={FollowUpMethodLabel[fu.method] || fu.method} variant="info" />
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-[300px] truncate">{fu.content}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(fu.followUpDate)}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(fu.nextFollowUpDate)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/follow-ups/${fu.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteFollowUp(fu.id); }} />
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
