import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Download } from "lucide-react";
import { deleteCustomer } from "./actions";
import { CustomerStatusLabel, CustomerTypeLabel, LeadSourceLabel, LeadGradeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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
  const country = typeof params.country === "string" ? params.country : "";

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
  if (country) where.country = { contains: country, mode: "insensitive" };

  const [customers, businessLines] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true, _count: { select: { projects: true } } },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || businessLineId || customerType || customerStatus || source || country;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <div className="flex items-center gap-3">
          <CsvImportButton importUrl="/api/import/customers" label="导入客户 CSV" />
          <a
            href="/api/export/customers"
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download size={16} />
            导出 CSV
          </a>
          <Link
            href="/customers/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            新增客户
          </Link>
        </div>
      </div>

      <SearchFilterBar
        searchPlaceholder="搜索公司、联系人、国家、邮箱、WhatsApp..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "customerType", label: "客户类型", options: Object.entries(CustomerTypeLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerStatus", label: "客户状态", options: Object.entries(CustomerStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "source", label: "来源渠道", options: Object.entries(LeadSourceLabel).map(([value, label]) => ({ value, label })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, customerType, customerStatus, source }}
      />

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">公司</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">联系人</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">国家</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">业务线</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">类型</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">等级</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">项目数</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{customer.company}</td>
                <td className="py-3 px-4">{customer.contactName}</td>
                <td className="py-3 px-4">{customer.country || "-"}</td>
                <td className="py-3 px-4">{customer.businessLine.name}</td>
                <td className="py-3 px-4">{CustomerTypeLabel[customer.customerType] || customer.customerType}</td>
                <td className="py-3 px-4">
                  <Badge label={CustomerStatusLabel[customer.customerStatus] || customer.customerStatus}
                    className={CustomerStatusLabel[customer.customerStatus] === "活跃" ? "bg-green-100 text-green-700" : CustomerStatusLabel[customer.customerStatus] === "潜在" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"} />
                </td>
                <td className="py-3 px-4">
                  <Badge label={LeadGradeLabel[customer.leadGrade] || customer.leadGrade}
                    className={customer.leadGrade === "A" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"} />
                </td>
                <td className="py-3 px-4">{customer._count.projects}</td>
                <td className="py-3 px-4 text-gray-500">{formatDate(customer.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/customers/${customer.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Eye size={16} />
                    </Link>
                    <Link href={`/customers/${customer.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteCustomer(customer.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的客户，请调整筛选条件" : "暂无客户，请点击右上角新增客户开始记录"}
                    actionLabel={hasFilters ? undefined : "新增客户"}
                    actionHref={hasFilters ? undefined : "/customers/new"}
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
