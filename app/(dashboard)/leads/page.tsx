import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Download } from "lucide-react";
import { deleteLead } from "./actions";
import { LeadStatusLabel, LeadTemperatureLabel, LeadSourceLabel, LeadGradeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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

  const [leads, businessLines] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || businessLineId || source || grade || status;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">线索管理</h1>
        <div className="flex items-center gap-3">
          <CsvImportButton importUrl="/api/import/leads" label="导入线索 CSV" />
          <a
            href="/api/export/leads"
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download size={16} />
            导出 CSV
          </a>
          <Link
            href="/leads/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            新增线索
          </Link>
        </div>
      </div>

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

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">公司</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">联系人</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">业务线</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">来源</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">等级</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">意向</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">下次跟进</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{lead.company}</td>
                <td className="py-3 px-4">{lead.contactName}</td>
                <td className="py-3 px-4">{lead.businessLine.name}</td>
                <td className="py-3 px-4">{LeadSourceLabel[lead.source] || lead.source}</td>
                <td className="py-3 px-4">
                  <Badge label={LeadGradeLabel[lead.grade] || lead.grade}
                    className={lead.grade === "A" ? "bg-red-100 text-red-700" : lead.grade === "B" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"} />
                </td>
                <td className="py-3 px-4">
                  <Badge label={LeadStatusLabel[lead.status] || lead.status}
                    className="bg-blue-100 text-blue-700" />
                </td>
                <td className="py-3 px-4">
                  <Badge label={LeadTemperatureLabel[lead.temperature] || lead.temperature}
                    className={lead.temperature === "HOT" ? "bg-red-100 text-red-700" : lead.temperature === "WARM" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"} />
                </td>
                <td className="py-3 px-4 text-gray-500">{formatDate(lead.nextFollowUp)}</td>
                <td className="py-3 px-4 text-gray-500">{formatDate(lead.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/leads/${lead.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Eye size={16} />
                    </Link>
                    <Link href={`/leads/${lead.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteLead(lead.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的线索，请调整筛选条件" : "暂无线索，请点击右上角新增线索开始记录"}
                    actionLabel={hasFilters ? undefined : "新增线索"}
                    actionHref={hasFilters ? undefined : "/leads/new"}
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
