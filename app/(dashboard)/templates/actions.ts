"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TemplateScene, TemplateLanguage } from "@/lib/generated/prisma/enums";
import { createActivityLog } from "@/lib/activity-log";

export async function createTemplate(formData: FormData) {
  const data = {
    title: formData.get("title") as string,
    scene: formData.get("scene") as TemplateScene,
    subject: (formData.get("subject") as string) || null,
    content: formData.get("content") as string,
    language: (formData.get("language") as TemplateLanguage) || "EN",
    notes: (formData.get("notes") as string) || null,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    isActive: formData.get("isActive") === "on",
  };

  if (!data.title) throw new Error("模板标题不能为空");
  if (!data.content) throw new Error("模板内容不能为空");

  const template = await prisma.followUpTemplate.create({ data });

  await createActivityLog({
    action: "创建",
    entityType: "跟进模板",
    entityId: template.id,
    entityName: template.title,
    description: `创建跟进模板: ${template.title}`,
  });

  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}

export async function updateTemplate(id: number, formData: FormData) {
  const data = {
    title: formData.get("title") as string,
    scene: formData.get("scene") as TemplateScene,
    subject: (formData.get("subject") as string) || null,
    content: formData.get("content") as string,
    language: formData.get("language") as TemplateLanguage,
    notes: (formData.get("notes") as string) || null,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    isActive: formData.get("isActive") === "on",
  };

  if (!data.title) throw new Error("模板标题不能为空");
  if (!data.content) throw new Error("模板内容不能为空");

  await prisma.followUpTemplate.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "跟进模板",
    entityId: id,
    entityName: data.title,
    description: `更新跟进模板: ${data.title}`,
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  redirect(`/templates/${id}`);
}

export async function deleteTemplate(id: number) {
  const template = await prisma.followUpTemplate.findUnique({ where: { id } });
  if (!template) throw new Error("模板不存在");

  await prisma.followUpTemplate.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "跟进模板",
    entityId: id,
    entityName: template.title,
    description: `删除跟进模板: ${template.title}`,
  });

  revalidatePath("/templates");
}
