"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExternalSourceType, LeadSource, LeadGrade, TaskPriority } from "@/lib/generated/prisma/enums";
import { generateApiKey, hashApiKey } from "@/lib/webhook";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:external-sources";

function sourceData(formData: FormData, includeCode = false) {
  return {
    name: formData.get("name") as string,
    ...(includeCode ? { code: formData.get("code") as string } : {}),
    sourceType: formData.get("sourceType") as ExternalSourceType,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    defaultSource: (formData.get("defaultSource") as LeadSource) || "WEBSITE",
    defaultLeadGrade: (formData.get("defaultLeadGrade") as LeadGrade) || "C",
    defaultPriority: (formData.get("defaultPriority") as TaskPriority) || "MEDIUM",
    autoAnalyze: formData.get("autoAnalyze") === "on",
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createExternalSource(formData: FormData) {
  const data = sourceData(formData, true);
  if (!data.name || !(data as any).code) throw new Error("名称和代码不能为空");
  const existing = await prisma.externalSource.findUnique({ where: { code: (data as any).code } });
  if (existing) throw new Error("代码已存在，请使用不同的代码");
  const result = await executionKernel.execute({ intent: "CREATE_EXTERNAL_SOURCE", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/external-sources");
  redirect(`/external-sources/${result.entityId}`);
}

export async function updateExternalSource(id: number, formData: FormData) {
  const data = sourceData(formData);
  if (!data.name) throw new Error("名称不能为空");
  await executionKernel.execute({ intent: "UPDATE_EXTERNAL_SOURCE", parameters: { externalSourceId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/external-sources");
  revalidatePath(`/external-sources/${id}`);
  redirect(`/external-sources/${id}`);
}

export async function deleteExternalSource(id: number) {
  await executionKernel.execute({ intent: "DELETE_EXTERNAL_SOURCE", parameters: { externalSourceId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/external-sources");
}

export async function toggleExternalSource(id: number) {
  const source = await prisma.externalSource.findUnique({ where: { id } });
  if (!source) throw new Error("外部来源不存在");
  await executionKernel.execute({ intent: "TOGGLE_EXTERNAL_SOURCE_ACTIVE", parameters: { externalSourceId: id, isActive: !source.isActive } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/external-sources");
  revalidatePath(`/external-sources/${id}`);
}

export async function generateApiKeyForSource(id: number) {
  const source = await prisma.externalSource.findUnique({ where: { id } });
  if (!source) throw new Error("外部来源不存在");
  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  await executionKernel.execute({ intent: "REGENERATE_EXTERNAL_SOURCE_API_KEY", parameters: { externalSourceId: id, apiKeyHash } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/external-sources");
  revalidatePath(`/external-sources/${id}`);
  return { apiKey };
}
