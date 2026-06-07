import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import ProductForm from "@/components/ProductForm";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增产品</h1>
      <ProductForm
        businessLines={businessLines}
        action={createProduct}
        submitLabel="创建"
      />
    </div>
  );
}
