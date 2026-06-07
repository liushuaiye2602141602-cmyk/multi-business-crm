import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import DocumentForm from "@/components/DocumentForm";
import { updateDocument } from "../../actions";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id: parseInt(id) },
  });

  if (!document) return notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑文档</h1>
      <DocumentForm
        document={document}
        action={async (formData: FormData) => {
          "use server";
          await updateDocument(document.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
