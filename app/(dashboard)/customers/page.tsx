import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus, Download, Anchor } from "lucide-react";
import { deleteCustomer } from "./actions";
import { CustomerStatusLabel, CustomerTypeLabel, LeadSourceLabel, LeadGradeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { getCustomerStatusVariant, getLeadGradeVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";
import CsvImportButton from "@/components/CsvImportButton";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";
  const customerType = typeof params.customerType === "string" ? params.customerType : "";
  const customerStatus = typeof params.customerStatus === "string" ? params.customerStatus : "";
  const source = typeof params.source === "string" ? params.source : "";
  const ownerView = typeof params.ownerView === "string" ? params.ownerView : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { whatsapp: { contains: search, mode: "insensitive" } },
      { remark: { contains: search, mode: "insensitive" } },
    ];
  }
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (customerType) where.customerType = customerType;
  if (customerStatus) where.customerStatus = customerStatus;
  if (source) where.source = source;
  if (ownerView === "mine") where.ownerId = 1; // 默认用户ID，待接入认证后替换

  const [customers, businessLines] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true, _count: { select: { projects: true } } },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || businessLineId || customerType || customerStatus || source || ownerView;

  return (
    <div>
      <PageHeader
        title="客户库"
        description="沉淀有效客户资料，查看客户项目、跟进、报价和 AI 复盘"
        actions={
          <>
            <Link href="/customers/pool" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors">
              <Anchor size={16} />
              公海
            </Link>
            <CsvImportButton importUrl="/api/import/customers" label="导入 CSV" />
            <a href="/api/export/customers" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} />
              导出 CSV
            </a>
            <Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              新增客户
            </Link>
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索公司、联系人、国家、邮箱、WhatsApp..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "customerType", label: "客户类型", options: Object.entries(CustomerTypeLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerStatus", label: "客户状态", options: Object.entries(CustomerStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "source", label: "来源渠道", options: Object.entries(LeadSourceLabel).map(([value, label]) => ({ value, label })) },
          { name: "ownerView", label: "客户归属", options: [{ value: "mine", label: "我的客户" }, { value: "", label: "全部客户" }] },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, customerType, customerStatus, source, ownerView }}
      />

      <Card padding="none">
        {customers.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的客户" : "暂无客户"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增客户开始记录"}
            actionLabel={hasFilters ? undefined : "新增客户"}
            actionHref={hasFilters ? undefined : "/customers/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">公司</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">联系人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">国家</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">负责人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">等级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">项目数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/customers/${customer.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {customer.company}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer.contactName}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.country || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.businessLine.name}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.ownerName || <span className="text-gray-400">未分配</span>}</td>
                    <td className="py-3 px-4 text-gray-600">{CustomerTypeLabel[customer.customerType] || customer.customerType}</td>
                    <td className="py-3 px-4">
                      <StatusBadge label={CustomerStatusLabel[customer.customerStatus] || customer.customerStatus} variant={getCustomerStatusVariant(customer.customerStatus)} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={LeadGradeLabel[customer.leadGrade] || customer.leadGrade} variant={getLeadGradeVariant(customer.leadGrade)} />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer._count.projects}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(customer.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/customers/${customer.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/customers/${customer.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteCustomer(customer.id); }} />
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
