import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus, Download } from "lucide-react";
import { deleteProject } from "./actions";
import { ProjectStatusLabel, CurrencyLabel } from "@/lib/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { getProjectStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
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
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { productName: { contains: search, mode: "insensitive" } },
      { specs: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { remark: { contains: search, mode: "insensitive" } },
    ];
  }
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (status) where.status = status;
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

  const hasFilters = search || businessLineId || status || customerId;

  return (
    <div>
      <PageHeader
        title="商机项目"
        description="管理客户的具体需求、产品项目、报价阶段和成交状态"
        actions={
          <>
            <Link href="/projects/pipeline" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              漏斗视图
            </Link>
            <a href="/api/export/projects" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} />
              导出 CSV
            </a>
            <Link href="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              新增项目
            </Link>
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索项目名称、产品、规格..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "status", label: "状态", options: Object.entries(ProjectStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerId", label: "客户", options: customers.map((c) => ({ value: String(c.id), label: c.company })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, status, customerId }}
      />

      <Card padding="none">
        {projects.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的项目" : "暂无项目"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增项目开始记录"}
            actionLabel={hasFilters ? undefined : "新增项目"}
            actionHref={hasFilters ? undefined : "/projects/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">项目名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">客户</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">产品</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">金额</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {project.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/customers/${project.customerId}`} className="text-gray-600 hover:text-blue-600">
                        {project.customer.company}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{project.businessLine.name}</td>
                    <td className="py-3 px-4 text-gray-600">{project.productName || "-"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge label={ProjectStatusLabel[project.status] || project.status} variant={getProjectStatusVariant(project.status)} />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{project.amount ? formatMoney(Number(project.amount), project.currency) : "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(project.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/projects/${project.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/projects/${project.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteProject(project.id); }} />
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
