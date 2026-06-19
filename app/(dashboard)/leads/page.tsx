import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus, Download, Upload } from "lucide-react";
import { deleteLead } from "./actions";
import { LeadStatusLabel, LeadTemperatureLabel, LeadSourceLabel, LeadGradeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { getLeadStatusVariant, getLeadGradeVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";
import CsvImportButton from "@/components/CsvImportButton";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";
  const source = typeof params.source === "string" ? params.source : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const status = typeof params.status === "string" ? params.status : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { whatsapp: { contains: search, mode: "insensitive" } },
      { interestProducts: { contains: search, mode: "insensitive" } },
      { inquiryContent: { contains: search, mode: "insensitive" } },
    ];
  }
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (source) where.source = source;
  if (grade) where.grade = grade;
  if (status) where.status = status;

  // Default: exclude converted leads unless explicitly filtering for them
  const hasFilters = search || businessLineId || source || grade || status;
  if (!hasFilters) {
    where.status = { notIn: ["CONVERTED"] };
  }

  const [leads, businessLines] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="线索池"
        description="管理来自独立站、社媒、Webhook、手动开发和外部系统的潜在客户"
        actions={
          <>
            <CsvImportButton importUrl="/api/import/leads" label="导入 CSV" />
            <a href="/api/export/leads" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} />
              导出 CSV
            </a>
            <Link href="/leads/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              新增线索
            </Link>
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索公司、联系人、国家、邮箱、WhatsApp、产品..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "source", label: "来源渠道", options: Object.entries(LeadSourceLabel).map(([value, label]) => ({ value, label })) },
          { name: "grade", label: "客户等级", options: Object.entries(LeadGradeLabel).map(([value, label]) => ({ value, label })) },
          { name: "status", label: "状态", options: Object.entries(LeadStatusLabel).map(([value, label]) => ({ value, label })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, source, grade, status }}
      />

      <Card padding="none">
        {leads.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的线索" : "暂无线索"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增线索开始记录客户询盘"}
            actionLabel={hasFilters ? undefined : "新增线索"}
            actionHref={hasFilters ? undefined : "/leads/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">公司</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">联系人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">来源</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">等级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">意向</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">下次跟进</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {lead.company}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{lead.contactName}</td>
                    <td className="py-3 px-4 text-gray-600">{lead.businessLine.name}</td>
                    <td className="py-3 px-4 text-gray-600">{LeadSourceLabel[lead.source] || lead.source}</td>
                    <td className="py-3 px-4">
                      <StatusBadge label={LeadGradeLabel[lead.grade] || lead.grade} variant={getLeadGradeVariant(lead.grade)} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={LeadStatusLabel[lead.status] || lead.status} variant={getLeadStatusVariant(lead.status)} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={LeadTemperatureLabel[lead.temperature] || lead.temperature}
                        variant={lead.temperature === "HOT" ? "danger" : lead.temperature === "WARM" ? "warning" : "default"}
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(lead.nextFollowUp)}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(lead.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/leads/${lead.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/leads/${lead.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; const result = await deleteLead(lead.id); if (!result.success) throw new Error(result.error); }} />
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
