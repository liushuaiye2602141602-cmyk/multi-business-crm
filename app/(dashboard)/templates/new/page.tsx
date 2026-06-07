import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import TemplateForm from "@/components/TemplateForm";
import { createTemplate } from "../actions";

export default async function NewTemplatePage() {
  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增跟进模板</h1>
      <TemplateForm
        businessLines={businessLines}
        action={createTemplate}
        submitLabel="创建"
      />
    </div>
  );
}
