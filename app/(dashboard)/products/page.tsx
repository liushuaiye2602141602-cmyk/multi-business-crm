import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { deleteProduct } from "./actions";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";
  const isActive = typeof params.isActive === "string" ? params.isActive : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { englishKeywords: { contains: search, mode: "insensitive" } },
      { application: { contains: search, mode: "insensitive" } },
    ];
  }
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const [products, businessLines] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: { businessLine: true },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || businessLineId || isActive;

  return (
    <div>
      <PageHeader
        title="产品目录"
        action={{ label: "新增产品", href: "/products/new" }}
      />

      <SearchFilterBar
        searchPlaceholder="搜索产品名称、分类、关键词..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "isActive", label: "状态", options: [{ value: "true", label: "启用" }, { value: "false", label: "停用" }] },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, isActive }}
      />

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">产品名称</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">业务线</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">分类</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">关键词</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">
                  <Link href={`/products/${product.id}`} className="hover:text-blue-600">{product.name}</Link>
                </td>
                <td className="py-3 px-4">{product.businessLine.name}</td>
                <td className="py-3 px-4">{product.category || "-"}</td>
                <td className="py-3 px-4 max-w-xs truncate">{product.englishKeywords || "-"}</td>
                <td className="py-3 px-4">
                  <Badge label={product.isActive ? "启用" : "停用"}
                    className={product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/products/${product.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteProduct(product.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的产品" : "暂无产品，请点击右上角新增产品开始记录"}
                    actionLabel={hasFilters ? undefined : "新增产品"}
                    actionHref={hasFilters ? undefined : "/products/new"}
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
