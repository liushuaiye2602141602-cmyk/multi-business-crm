import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import TemplateForm from "@/components/TemplateForm";
import { updateTemplate } from "../../actions";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.followUpTemplate.findUnique({
    where: { id: parseInt(id) },
  });

  if (!template) return notFound();

  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑跟进模板</h1>
      <TemplateForm
        businessLines={businessLines}
        template={template}
        action={async (formData: FormData) => {
          "use server";
          await updateTemplate(template.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
