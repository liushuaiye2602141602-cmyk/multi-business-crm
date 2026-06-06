import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { businessLine: true },
  });

  if (!product) return notFound();

  return (
    <div>
      <PageHeader
        title={product.name}
        backHref="/products"
        action={{ label: "编辑", href: `/products/${product.id}/edit`, icon: <Pencil size={16} /> }}
      />

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Badge label={product.isActive ? "启用" : "停用"}
            className={product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} />
          <span className="text-sm text-gray-500">{product.businessLine.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">产品名称：</span><span className="font-medium">{product.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">业务线：</span>{product.businessLine.name}</div>
            <div className="flex justify-between"><span className="text-gray-500">分类：</span>{product.category || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">常见规格：</span>{product.commonSpecs || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">用途：</span>{product.application || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">目标市场：</span>{product.targetMarket || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">创建时间：</span>{formatDate(product.createdAt)}</div>
          </div>
          <div>
            {product.englishKeywords && (
              <div className="mb-4">
                <p className="text-gray-500 text-sm mb-1">英文关键词：</p>
                <p className="text-sm">{product.englishKeywords}</p>
              </div>
            )}
            {product.notes && (
              <div>
                <p className="text-gray-500 text-sm mb-1">备注：</p>
                <p className="text-sm">{product.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
