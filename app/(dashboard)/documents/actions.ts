"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentType, DocumentRelatedType } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:documents";

function documentData(formData: FormData) {
  return {
    title: formData.get("title") as string,
    documentType: formData.get("documentType") as DocumentType,
    fileUrl: (formData.get("fileUrl") as string) || null,
    fileName: (formData.get("fileName") as string) || null,
    notes: (formData.get("notes") as string) || null,
    relatedType: formData.get("relatedType") as DocumentRelatedType,
    relatedId: parseInt(formData.get("relatedId") as string),
  };
}

export async function createDocument(formData: FormData) {
  const data = documentData(formData);
  if (!data.title) throw new Error("文档标题不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_DOCUMENT", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/documents");
  redirect(`/documents/${result.entityId}`);
}

export async function updateDocument(id: number, formData: FormData) {
  const data = documentData(formData);
  if (!data.title) throw new Error("文档标题不能为空");
  await executionKernel.execute({ intent: "UPDATE_DOCUMENT", parameters: { documentId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  redirect(`/documents/${id}`);
}

export async function deleteDocument(id: number) {
  await executionKernel.execute({ intent: "DELETE_DOCUMENT", parameters: { documentId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/documents");
}
