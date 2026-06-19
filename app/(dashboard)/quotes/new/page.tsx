import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import QuoteForm from "@/components/QuoteForm";
import { createQuote } from "../actions";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultLeadId = typeof params.leadId === "string" ? parseInt(params.leadId) : undefined;
  const defaultCustomerId = typeof params.customerId === "string" ? parseInt(params.customerId) : undefined;
  const defaultProjectId = typeof params.projectId === "string" ? parseInt(params.projectId) : undefined;

  const [leads, customers, projects] = await Promise.all([
    prisma.lead.findMany({
      select: { id: true, company: true, contactName: true },
      orderBy: { company: "asc" },
    }),
    prisma.customer.findMany({
      select: { id: true, company: true },
      orderBy: { company: "asc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增报价</h1>
      <QuoteForm
        leads={leads}
        customers={customers}
        projects={projects}
        defaultLeadId={defaultLeadId}
        defaultCustomerId={defaultCustomerId}
        defaultProjectId={defaultProjectId}
        action={createQuote}
        submitLabel="创建"
      />
    </div>
  );
}
