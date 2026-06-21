import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增订单</h1>
      <OrderForm
        customers={customers}
        projects={projects}
        quotes={quotes}
        contacts={contacts}
        businessLines={businessLines}
        defaultCustomerId={defaultCustomerId}
        defaultQuoteId={defaultQuoteId}
        action={createOrder}
        submitLabel="创建"
      />
    </div>
  );
}
