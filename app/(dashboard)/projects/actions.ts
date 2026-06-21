"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProjectStatus, Currency } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:projects";

function projectData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    status: (formData.get("status") as ProjectStatus) || "REQUIREMENT_CONFIRMING",
    productCategory: (formData.get("productCategory") as string) || null,
    productName: (formData.get("productName") as string) || null,
    specs: (formData.get("specs") as string) || null,
    quantity: (formData.get("quantity") as string) || null,
    usage: (formData.get("usage") as string) || null,
    targetMarket: (formData.get("targetMarket") as string) || null,
    specialRequirements: (formData.get("specialRequirements") as string) || null,
    amount: formData.get("amount") ? parseFloat(formData.get("amount") as string) : null,
    currency: (formData.get("currency") as Currency) || "USD",
    startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
    customerId: parseInt(formData.get("customerId") as string),
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
  };
}

export async function createProject(formData: FormData) {
  const data = projectData(formData);
  if (!data.name) throw new Error("项目名称不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_PROJECT", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/projects");
  redirect(`/projects/${result.entityId}`);
}

export async function updateProject(id: number, formData: FormData) {
  const data = projectData(formData);
  if (!data.name) throw new Error("项目名称不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_PROJECT", parameters: { projectId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: number) {
  await executionKernel.execute({ intent: "DELETE_PROJECT", parameters: { projectId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/projects");
}

export async function markProjectAsWon(id: number) {
  await executionKernel.execute({ intent: "UPDATE_PROJECT_STATUS", parameters: { projectId: id, status: "WON" } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}
