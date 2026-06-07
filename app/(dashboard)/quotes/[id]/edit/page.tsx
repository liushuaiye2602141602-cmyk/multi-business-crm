import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import QuoteForm from "@/components/QuoteForm";
import { updateQuote } from "../../actions";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id: parseInt(id) },
  });

  if (!quote) return notFound();

  const [leads, customers, projects] = await Promise.all([
    prisma.lead.findMany({ orderBy: { company: "asc" } }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑报价</h1>
      <QuoteForm
        leads={leads}
        customers={customers}
        projects={projects}
        quote={{
          ...quote,
          unitPrice: quote.unitPrice ? Number(quote.unitPrice) : null,
          totalPrice: quote.totalPrice ? Number(quote.totalPrice) : null,
        }}
        action={async (formData: FormData) => {
          "use server";
          await updateQuote(quote.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
