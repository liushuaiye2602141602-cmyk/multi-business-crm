import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import ProjectForm from "@/components/ProjectForm";
import { createProject } from "../actions";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultLeadId = typeof params.leadId === "string" ? parseInt(params.leadId) : undefined;
  const defaultCustomerId = typeof params.customerId === "string" ? parseInt(params.customerId) : undefined;

  const [businessLines, customers, leads] = await Promise.all([
    prisma.businessLine.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      select: { id: true, company: true },
      orderBy: { company: "asc" },
    }),
    prisma.lead.findMany({
      select: { id: true, company: true, contactName: true },
      orderBy: { company: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增项目</h1>
      <ProjectForm
        businessLines={businessLines}
        customers={customers}
        leads={leads}
        action={createProject}
        submitLabel="创建"
      />
    </div>
  );
}
