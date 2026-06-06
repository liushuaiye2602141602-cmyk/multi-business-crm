import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProjectForm from "@/components/ProjectForm";
import { updateProject } from "../../actions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id: parseInt(id) },
  });

  if (!project) return notFound();

  const [businessLines, customers, leads] = await Promise.all([
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.lead.findMany({ orderBy: { company: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑项目</h1>
      <ProjectForm
        businessLines={businessLines}
        customers={customers}
        leads={leads}
        project={{
          ...project,
          amount: project.amount ? Number(project.amount) : null,
        }}
        action={async (formData: FormData) => {
          "use server";
          await updateProject(project.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
