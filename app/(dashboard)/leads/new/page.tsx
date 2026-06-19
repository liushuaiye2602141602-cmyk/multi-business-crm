import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import LeadForm from "@/components/LeadForm";
import { createLead } from "../actions";

export default async function NewLeadPage() {
  const businessLines = await prisma.businessLine.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增线索</h1>
      <LeadForm
        businessLines={businessLines}
        action={createLead}
        submitLabel="创建"
      />
    </div>
  );
}
