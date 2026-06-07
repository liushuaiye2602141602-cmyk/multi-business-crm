"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentType, DocumentRelatedType } from "@/lib/generated/prisma/enums";
import { createActivityLog } from "@/lib/activity-log";

export async function createDocument(formData: FormData) {
  const data = {
    title: formData.get("title") as string,
    documentType: formData.get("documentType") as DocumentType,
    fileUrl: (formData.get("fileUrl") as string) || null,
    fileName: (formData.get("fileName") as string) || null,
    notes: (formData.get("notes") as string) || null,
    relatedType: formData.get("relatedType") as DocumentRelatedType,
    relatedId: parseInt(formData.get("relatedId") as string),
  };

  if (!data.title) throw new Error("文档标题不能为空");

  const document = await prisma.document.create({ data });

  await createActivityLog({
    action: "创建",
    entityType: "文档",
    entityId: document.id,
    entityName: document.title,
    description: `创建文档: ${document.title}`,
  });

  revalidatePath("/documents");
  redirect(`/documents/${document.id}`);
}

export async function updateDocument(id: number, formData: FormData) {
  const data = {
    title: formData.get("title") as string,
    documentType: formData.get("documentType") as DocumentType,
    fileUrl: (formData.get("fileUrl") as string) || null,
    fileName: (formData.get("fileName") as string) || null,
    notes: (formData.get("notes") as string) || null,
    relatedType: formData.get("relatedType") as DocumentRelatedType,
    relatedId: parseInt(formData.get("relatedId") as string),
  };

  if (!data.title) throw new Error("文档标题不能为空");

  await prisma.document.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "文档",
    entityId: id,
    entityName: data.title,
    description: `更新文档: ${data.title}`,
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  redirect(`/documents/${id}`);
}

export async function deleteDocument(id: number) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) throw new Error("文档不存在");

  await prisma.document.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "文档",
    entityId: id,
    entityName: document.title,
    description: `删除文档: ${document.title}`,
  });

  revalidatePath("/documents");
}
