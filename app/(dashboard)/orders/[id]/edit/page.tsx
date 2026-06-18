import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import OrderForm from "@/components/OrderForm";
import { updateOrder } from "../../actions";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
  });

  if (!order) return notFound();

  const [customers, projects, quotes, contacts, businessLines] = await Promise.all([
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.quote.findMany({ orderBy: { quoteNo: "asc" } }),
    prisma.contact.findMany({ orderBy: { name: "asc" } }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑订单</h1>
      <OrderForm
        customers={customers}
        projects={projects}
        quotes={quotes}
        contacts={contacts}
        businessLines={businessLines}
        order={{
          ...order,
          totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
        }}
        action={async (formData: FormData) => {
          "use server";
          await updateOrder(order.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
