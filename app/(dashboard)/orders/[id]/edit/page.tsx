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
    prisma.customer.findMany({
      select: { id: true, company: true },
      orderBy: { company: "asc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.quote.findMany({
      select: { id: true, quoteNo: true },
      orderBy: { quoteNo: "asc" },
    }),
    prisma.contact.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.businessLine.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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
          id: order.id,
          orderNo: order.orderNo,
          orderTitle: order.orderTitle,
          customerId: order.customerId,
          projectId: order.projectId,
          quoteId: order.quoteId,
          contactId: order.contactId,
          businessLineId: order.businessLineId,
          orderStatus: order.orderStatus,
          totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
          currency: order.currency,
          paymentTerm: order.paymentTerm,
          deliveryTerm: order.deliveryTerm,
          expectedDeliveryDate: order.expectedDeliveryDate,
          notes: order.notes,
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
