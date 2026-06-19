import prisma from "@/lib/prisma";
import QuoteItemForm from "@/components/QuoteItemForm";
import { createQuoteItem } from "../actions";

export default async function NewQuoteItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quoteId = parseInt(id);

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增报价明细</h1>
      <QuoteItemForm
        quoteId={quoteId}
        products={products}
        action={async (formData: FormData) => {
          "use server";
          await createQuoteItem(quoteId, formData);
        }}
        submitLabel="添加"
      />
    </div>
  );
}
