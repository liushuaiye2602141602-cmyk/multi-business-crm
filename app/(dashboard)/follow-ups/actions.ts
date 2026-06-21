"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FollowUpMethod } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:follow-ups";

function followUpData(formData: FormData) {
  return {
    method: (formData.get("method") as FollowUpMethod) || "EMAIL",
    content: formData.get("content") as string,
    customerFeedback: (formData.get("customerFeedback") as string) || null,
    nextAction: (formData.get("nextAction") as string) || null,
    followUpDate: formData.get("followUpDate") ? new Date(formData.get("followUpDate") as string) : new Date(),
    nextFollowUpDate: formData.get("nextFollowUpDate") ? new Date(formData.get("nextFollowUpDate") as string) : null,
    remark: (formData.get("remark") as string) || null,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };
}

export async function createFollowUp(formData: FormData) {
  const data = followUpData(formData);
  if (!data.content) throw new Error("跟进内容不能为空");
  if (!data.leadId && !data.customerId && !data.projectId) throw new Error("请至少选择一个关联对象");
  const result = await executionKernel.execute({ intent: "CREATE_FOLLOW_UP", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/follow-ups");
  if (data.leadId) redirect(`/leads/${data.leadId}`);
  if (data.customerId) redirect(`/customers/${data.customerId}`);
  if (data.projectId) redirect(`/projects/${data.projectId}`);
  redirect("/follow-ups");
}

export async function updateFollowUp(id: number, formData: FormData) {
  const data = followUpData(formData);
  if (!data.content) throw new Error("跟进内容不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_FOLLOW_UP", parameters: { followUpId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/follow-ups");
  redirect("/follow-ups");
}

export async function deleteFollowUp(id: number) {
  await executionKernel.execute({ intent: "DELETE_FOLLOW_UP", parameters: { followUpId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/follow-ups");
}
