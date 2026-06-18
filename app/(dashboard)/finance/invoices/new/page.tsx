import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import NewInvoiceForm from "./NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [customers, orders] = await Promise.all([
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, company: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="新增发票" backHref="/finance" />
      <NewInvoiceForm
        customers={customers.map((c) => ({ id: c.id, company: c.company }))}
        orders={orders.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          customerId: o.customerId,
          customerCompany: o.customer.company,
          totalAmount: o.totalAmount ? Number(o.totalAmount) : null,
          currency: o.currency,
        }))}
      />
    </div>
  );
}
