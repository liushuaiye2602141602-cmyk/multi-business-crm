import DocumentForm from "@/components/DocumentForm";
import { createDocument } from "../actions";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultRelatedType = typeof params.relatedType === "string" ? params.relatedType : undefined;
  const defaultRelatedId = typeof params.relatedId === "string" ? parseInt(params.relatedId) : undefined;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增文档</h1>
      <DocumentForm
        defaultRelatedType={defaultRelatedType}
        defaultRelatedId={defaultRelatedId}
        action={createDocument}
        submitLabel="创建"
      />
    </div>
  );
}
