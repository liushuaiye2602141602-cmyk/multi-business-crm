import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Download } from "lucide-react";
import { deleteProject } from "./actions";
import { ProjectStatusLabel, CurrencyLabel } from "@/lib/enums";
import { formatDate, formatMoney } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";
  const status = typeof params.status === "string" ? params.status : "";
  const currency = typeof params.currency === "string" ? params.currency : "";
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { productName: { contains: search, mode: "insensitive" } },
      { specs: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { specialRequirements: { contains: search, mode: "insensitive" } },
      { remark: { contains: search, mode: "insensitive" } },
    ];
  }
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (status) where.status = status;
  if (currency) where.currency = currency;
  if (customerId) where.customerId = parseInt(customerId);

  const [projects, businessLines, customers] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true, customer: true },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
  ]);

  const hasFilters = search || businessLineId || status || currency || customerId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">项目管理</h1>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/projects"
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download size={16} />
            导出 CSV
          </a>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            新增项目
          </Link>
        </div>
      </div>

      <SearchFilterBar
        searchPlaceholder="搜索项目名称、产品、规格、备注..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "status", label: "状态", options: Object.entries(ProjectStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "currency", label: "币种", options: Object.entries(CurrencyLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerId", label: "客户", options: customers.map((c) => ({ value: String(c.id), label: c.company })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, status, currency, customerId }}
      />

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">项目名称</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">客户</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">业务线</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">产品</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">金额</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{project.name}</td>
                <td className="py-3 px-4">
                  <Link href={`/customers/${project.customerId}`} className="hover:text-blue-600">
                    {project.customer.company}
                  </Link>
                </td>
                <td className="py-3 px-4">{project.businessLine.name}</td>
                <td className="py-3 px-4">{project.productName || "-"}</td>
                <td className="py-3 px-4">
                  <Badge label={ProjectStatusLabel[project.status] || project.status}
                    className={project.status === "WON" ? "bg-green-100 text-green-700" : project.status === "LOST" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"} />
                </td>
                <td className="py-3 px-4">{project.amount ? formatMoney(Number(project.amount), project.currency) : "-"}</td>
                <td className="py-3 px-4 text-gray-500">{formatDate(project.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/projects/${project.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Eye size={16} />
                    </Link>
                    <Link href={`/projects/${project.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteProject(project.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的项目，请调整筛选条件" : "暂无项目，请点击右上角新增项目开始记录"}
                    actionLabel={hasFilters ? undefined : "新增项目"}
                    actionHref={hasFilters ? undefined : "/projects/new"}
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
