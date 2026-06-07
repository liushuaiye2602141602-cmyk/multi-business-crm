"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExternalSourceType, LeadSource, LeadGrade, TaskPriority } from "@/lib/generated/prisma/enums";
import { generateApiKey, hashApiKey } from "@/lib/webhook";
import { createActivityLog } from "@/lib/activity-log";

export async function createExternalSource(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    sourceType: formData.get("sourceType") as ExternalSourceType,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    defaultSource: (formData.get("defaultSource") as LeadSource) || "WEBSITE",
    defaultLeadGrade: (formData.get("defaultLeadGrade") as LeadGrade) || "C",
    defaultPriority: (formData.get("defaultPriority") as TaskPriority) || "MEDIUM",
    autoAnalyze: formData.get("autoAnalyze") === "on",
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.name || !data.code) {
    throw new Error("名称和代码不能为空");
  }

  // 检查 code 唯一性
  const existing = await prisma.externalSource.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    throw new Error("代码已存在，请使用不同的代码");
  }

  const source = await prisma.externalSource.create({ data });

  await createActivityLog({
    action: "创建",
    entityType: "外部来源",
    entityId: source.id,
    entityName: source.name,
    description: `创建外部来源: ${source.name} (${source.code})`,
  });

  revalidatePath("/external-sources");
  redirect(`/external-sources/${source.id}`);
}

export async function updateExternalSource(id: number, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    sourceType: formData.get("sourceType") as ExternalSourceType,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    defaultSource: (formData.get("defaultSource") as LeadSource) || "WEBSITE",
    defaultLeadGrade: (formData.get("defaultLeadGrade") as LeadGrade) || "C",
    defaultPriority: (formData.get("defaultPriority") as TaskPriority) || "MEDIUM",
    autoAnalyze: formData.get("autoAnalyze") === "on",
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.name) {
    throw new Error("名称不能为空");
  }

  await prisma.externalSource.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "外部来源",
    entityId: id,
    entityName: data.name,
    description: `更新外部来源: ${data.name}`,
  });

  revalidatePath("/external-sources");
  revalidatePath(`/external-sources/${id}`);
  redirect(`/external-sources/${id}`);
}

export async function deleteExternalSource(id: number) {
  const source = await prisma.externalSource.findUnique({ where: { id } });
  if (!source) throw new Error("外部来源不存在");

  await prisma.externalSource.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "外部来源",
    entityId: id,
    entityName: source.name,
    description: `删除外部来源: ${source.name}`,
  });

  revalidatePath("/external-sources");
}

export async function toggleExternalSource(id: number) {
  const source = await prisma.externalSource.findUnique({ where: { id } });
  if (!source) throw new Error("外部来源不存在");

  const newIsActive = !source.isActive;
  await prisma.externalSource.update({
    where: { id },
    data: { isActive: newIsActive },
  });

  await createActivityLog({
    action: newIsActive ? "启用" : "停用",
    entityType: "外部来源",
    entityId: id,
    entityName: source.name,
    description: `${newIsActive ? "启用" : "停用"}外部来源: ${source.name}`,
  });

  revalidatePath("/external-sources");
  revalidatePath(`/external-sources/${id}`);
}

export async function generateApiKeyForSource(id: number) {
  const source = await prisma.externalSource.findUnique({ where: { id } });
  if (!source) throw new Error("外部来源不存在");

  const apiKey = generateApiKey();
  const hash = hashApiKey(apiKey);

  await prisma.externalSource.update({
    where: { id },
    data: { apiKeyHash: hash },
  });

  await createActivityLog({
    action: "生成API Key",
    entityType: "外部来源",
    entityId: id,
    entityName: source.name,
    description: `生成 API Key: ${source.name}`,
  });

  revalidatePath("/external-sources");
  revalidatePath(`/external-sources/${id}`);

  // 只在生成时返回明文 Key
  return { apiKey };
}
