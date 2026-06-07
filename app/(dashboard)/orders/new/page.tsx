import prisma from "@/lib/prisma";
import OrderForm from "@/components/OrderForm";
import { createOrder } from "../actions";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultCustomerId = typeof params.customerId === "string" ? parseInt(params.customerId) : undefined;
  const defaultQuoteId = typeof params.quoteId === "string" ? parseInt(params.quoteId) : undefined;

  const [customers, projects, quotes, contacts] = await Promise.all([
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.quote.findMany({ orderBy: { quoteNo: "asc" } }),
    prisma.contact.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增订单</h1>
      <OrderForm
        customers={customers}
        projects={projects}
        quotes={quotes}
        contacts={contacts}
        defaultCustomerId={defaultCustomerId}
        defaultQuoteId={defaultQuoteId}
        action={createOrder}
        submitLabel="创建"
      />
    </div>
  );
}
