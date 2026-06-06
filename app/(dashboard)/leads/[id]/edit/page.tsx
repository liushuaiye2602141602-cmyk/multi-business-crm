import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import LeadForm from "@/components/LeadForm";
import { updateLead } from "../../actions";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id: parseInt(id) },
  });

  if (!lead) return notFound();

  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑线索</h1>
      <LeadForm
        businessLines={businessLines}
        lead={{
          ...lead,
          budget: lead.budget ? Number(lead.budget) : null,
        }}
        action={async (formData: FormData) => {
          "use server";
          await updateLead(lead.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
