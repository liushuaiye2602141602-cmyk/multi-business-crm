import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import OrderItemForm from "@/components/OrderItemForm";
import { createOrderItem } from "../actions";

export default async function NewOrderItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = parseInt(id);

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增订单明细</h1>
      <OrderItemForm
        orderId={orderId}
        products={products}
        action={async (formData: FormData) => {
          "use server";
          await createOrderItem(orderId, formData);
        }}
        submitLabel="添加"
      />
    </div>
  );
}
