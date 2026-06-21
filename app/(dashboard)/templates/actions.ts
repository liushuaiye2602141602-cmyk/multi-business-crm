"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TemplateScene, TemplateLanguage } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:templates";

function templateData(formData: FormData) {
  return {
    title: formData.get("title") as string,
    scene: formData.get("scene") as TemplateScene,
    subject: (formData.get("subject") as string) || null,
    content: formData.get("content") as string,
    language: (formData.get("language") as TemplateLanguage) || "EN",
    notes: (formData.get("notes") as string) || null,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    isActive: formData.get("isActive") === "on",
  };
}

export async function createTemplate(formData: FormData) {
  const data = templateData(formData);
  if (!data.title) throw new Error("模板标题不能为空");
  if (!data.content) throw new Error("模板内容不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_TEMPLATE", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/templates");
  redirect(`/templates/${result.entityId}`);
}

export async function updateTemplate(id: number, formData: FormData) {
  const data = templateData(formData);
  if (!data.title) throw new Error("模板标题不能为空");
  if (!data.content) throw new Error("模板内容不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_TEMPLATE", parameters: { templateId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  redirect(`/templates/${id}`);
}

export async function deleteTemplate(id: number) {
  await executionKernel.execute({ intent: "DELETE_TEMPLATE", parameters: { templateId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/templates");
}
