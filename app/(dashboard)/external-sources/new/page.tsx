import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import ExternalSourceForm from "@/components/ExternalSourceForm";
import { createExternalSource } from "../actions";

export default async function NewExternalSourcePage() {
  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增外部来源</h1>
      <ExternalSourceForm
        businessLines={businessLines}
        action={createExternalSource}
        submitLabel="创建"
      />
    </div>
  );
}
