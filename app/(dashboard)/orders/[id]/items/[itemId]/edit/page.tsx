import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import OrderItemForm from "@/components/OrderItemForm";
import { updateOrderItem } from "../../actions";

export default async function EditOrderItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const orderId = parseInt(id);
  const itemIdNum = parseInt(itemId);

  const [item, products] = await Promise.all([
    prisma.orderItem.findUnique({ where: { id: itemIdNum } }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!item) return notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑订单明细</h1>
      <OrderItemForm
        orderId={orderId}
        products={products}
        item={{
          id: item.id,
          productId: item.productId,
          itemName: item.itemName,
          specification: item.specification,
          quantity: item.quantity ? Number(item.quantity) : null,
          unit: item.unit,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          totalPrice: item.totalPrice ? Number(item.totalPrice) : null,
          notes: item.notes,
          sortOrder: item.sortOrder,
        }}
        action={async (formData: FormData) => {
          "use server";
          await updateOrderItem(orderId, itemIdNum, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
