import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProductForm from "@/components/ProductForm";
import { updateProduct } from "../../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
  });

  if (!product) return notFound();

  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑产品</h1>
      <ProductForm
        businessLines={businessLines}
        product={product}
        action={async (formData: FormData) => {
          "use server";
          await updateProduct(product.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
