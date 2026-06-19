import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
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

  const businessLines = await prisma.businessLine.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑线索</h1>
      <LeadForm
        businessLines={businessLines}
        lead={{
          id: lead.id,
          company: lead.company,
          contactName: lead.contactName,
          country: lead.country,
          phone: lead.phone,
          email: lead.email,
          whatsapp: lead.whatsapp,
          source: lead.source,
          sourceWebsite: lead.sourceWebsite,
          status: lead.status,
          temperature: lead.temperature,
          grade: lead.grade,
          requirement: lead.requirement,
          interestProducts: lead.interestProducts,
          inquiryContent: lead.inquiryContent,
          budget: lead.budget ? Number(lead.budget) : null,
          currency: lead.currency,
          expectedClosing: lead.expectedClosing,
          nextFollowUp: lead.nextFollowUp,
          remark: lead.remark,
          businessLineId: lead.businessLineId,
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
