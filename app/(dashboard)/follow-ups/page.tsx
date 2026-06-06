import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { deleteFollowUp } from "./actions";
import { FollowUpMethodLabel } from "@/lib/enums";
import { formatDate, formatEnumLabel } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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
        action={{ label: "新增跟进", href: "/follow-ups/new" }}
      />

      <SearchFilterBar
        searchPlaceholder="搜索跟进内容、客户反馈、下一步动作..."
        filters={[
          { name: "method", label: "跟进方式", options: Object.entries(FollowUpMethodLabel).map(([value, label]) => ({ value, label })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ method }}
      />

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">关联对象</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">方式</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">内容</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">跟进日期</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">下次跟进</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {followUps.map((fu) => (
              <tr key={fu.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4">
                  {fu.customer ? (
                    <Link href={`/customers/${fu.customerId}`} className="hover:text-blue-600">{fu.customer.company}</Link>
                  ) : fu.lead ? (
                    <Link href={`/leads/${fu.leadId}`} className="hover:text-blue-600">{fu.lead.company}</Link>
                  ) : fu.project ? (
                    <Link href={`/projects/${fu.projectId}`} className="hover:text-blue-600">{fu.project.name}</Link>
                  ) : "-"}
                </td>
                <td className="py-3 px-4">
                  <Badge label={formatEnumLabel(fu.method, FollowUpMethodLabel)} />
                </td>
                <td className="py-3 px-4 max-w-xs truncate">{fu.content}</td>
                <td className="py-3 px-4">{formatDate(fu.followUpDate)}</td>
                <td className="py-3 px-4">{formatDate(fu.nextFollowUpDate)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/follow-ups/${fu.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteFollowUp(fu.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {followUps.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的跟进记录" : "暂无跟进记录，请点击右上角新增跟进开始记录"}
                    actionLabel={hasFilters ? undefined : "新增跟进"}
                    actionHref={hasFilters ? undefined : "/follow-ups/new"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
