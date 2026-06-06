import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { deleteBusinessLine } from "./actions";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
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
        action={{ label: "新增业务线", href: "/business-lines/new" }}
      />

      <SearchFilterBar
        searchPlaceholder="搜索名称、代码、产品..."
        defaultSearch={search}
      />

      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">名称</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">代码</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">描述</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">线索数</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">客户数</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">项目数</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {businessLines.map((bl) => (
              <tr key={bl.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{bl.name}</td>
                <td className="py-3 px-4 text-gray-500">{bl.code || "-"}</td>
                <td className="py-3 px-4 text-gray-600">{bl.description || "-"}</td>
                <td className="py-3 px-4">{bl._count.leads}</td>
                <td className="py-3 px-4">{bl._count.customers}</td>
                <td className="py-3 px-4">{bl._count.projects}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/business-lines/${bl.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton
                      action={async () => { "use server"; await deleteBusinessLine(bl.id); }}
                      message="确定要删除这条业务线吗？如果该业务线下存在数据，将无法删除。"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {businessLines.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    message={search ? "没有找到匹配的业务线" : "暂无业务线，请点击右上角新增业务线开始记录"}
                    actionLabel={search ? undefined : "新增业务线"}
                    actionHref={search ? undefined : "/business-lines/new"}
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
