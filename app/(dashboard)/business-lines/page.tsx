import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil, Plus } from "lucide-react";
import { deleteBusinessLine } from "./actions";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function BusinessLinesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { mainProducts: { contains: search, mode: "insensitive" } },
    ];
  }

  const businessLines = await prisma.businessLine.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { leads: true, customers: true, projects: true } } },
  });

  return (
    <div>
      <PageHeader
        title="业务线管理"
        description="管理所有业务线"
        actions={
          <Link href="/business-lines/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增业务线
          </Link>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索名称、代码、产品..."
        defaultSearch={search}
      />

      <Card padding="none">
        {businessLines.length === 0 ? (
          <EmptyState
            message={search ? "没有找到匹配的业务线" : "暂无业务线"}
            description={search ? "请调整筛选条件" : "点击右上角新增业务线开始记录"}
            actionLabel={search ? undefined : "新增业务线"}
            actionHref={search ? undefined : "/business-lines/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">代码</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">描述</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">线索数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">客户数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">项目数</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {businessLines.map((bl) => (
                  <tr key={bl.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{bl.name}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{bl.code || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{bl.description || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{bl._count.leads}</td>
                    <td className="py-3 px-4 text-gray-600">{bl._count.customers}</td>
                    <td className="py-3 px-4 text-gray-600">{bl._count.projects}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/business-lines/${bl.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton
                          action={async () => { "use server"; await deleteBusinessLine(bl.id); }}
                          confirmMessage="确定要删除这条业务线吗？如果该业务线下存在数据，将无法删除。"
                        />
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
