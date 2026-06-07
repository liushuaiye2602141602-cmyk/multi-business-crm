import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import QuoteItemForm from "@/components/QuoteItemForm";
import { updateQuoteItem } from "../../actions";

export default async function EditQuoteItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const quoteId = parseInt(id);
  const itemIdNum = parseInt(itemId);

  const [item, products] = await Promise.all([
    prisma.quoteItem.findUnique({ where: { id: itemIdNum } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!item) return notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑报价明细</h1>
      <QuoteItemForm
        quoteId={quoteId}
        products={products}
        item={{
          ...item,
          quantity: item.quantity ? Number(item.quantity) : null,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          totalPrice: item.totalPrice ? Number(item.totalPrice) : null,
        }}
        action={async (formData: FormData) => {
          "use server";
          await updateQuoteItem(quoteId, itemIdNum, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
