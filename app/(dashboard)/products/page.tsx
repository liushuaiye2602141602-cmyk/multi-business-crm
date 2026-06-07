import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil, Plus } from "lucide-react";
import { deleteProduct } from "./actions";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
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
        description="管理所有产品信息"
        actions={
          <Link href="/products/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增产品
          </Link>
        }
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

      <Card padding="none">
        {products.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的产品" : "暂无产品"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增产品开始记录"}
            actionLabel={hasFilters ? undefined : "新增产品"}
            actionHref={hasFilters ? undefined : "/products/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">产品名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">分类</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">关键词</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/products/${product.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.businessLine.name}</td>
                    <td className="py-3 px-4 text-gray-600">{product.category || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{product.englishKeywords || "-"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={product.isActive ? "启用" : "停用"}
                        variant={product.isActive ? "success" : "default"}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/products/${product.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteProduct(product.id); }} />
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
