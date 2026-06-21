"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeadSource, LeadStatus, LeadTemperature, LeadGrade, Currency } from "@/lib/generated/prisma/enums";
import { success, failure, ActionResult } from "@/lib/action-result";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const DASHBOARD_SESSION = "dashboard:leads";

function leadDataFromForm(formData: FormData) {
  return {
    company: formData.get("company") as string,
    contactName: formData.get("contactName") as string,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    source: (formData.get("source") as LeadSource) || "MANUAL_OUTREACH",
    sourceWebsite: (formData.get("sourceWebsite") as string) || null,
    status: (formData.get("status") as LeadStatus) || "NEW",
    temperature: (formData.get("temperature") as LeadTemperature) || "WARM",
    grade: (formData.get("grade") as LeadGrade) || "C",
    requirement: (formData.get("requirement") as string) || null,
    interestProducts: (formData.get("interestProducts") as string) || null,
    inquiryContent: (formData.get("inquiryContent") as string) || null,
    budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
    currency: (formData.get("currency") as Currency) || "USD",
    expectedClosing: formData.get("expectedClosing") ? new Date(formData.get("expectedClosing") as string) : null,
    nextFollowUp: formData.get("nextFollowUp") ? new Date(formData.get("nextFollowUp") as string) : null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };
}

export async function createLead(formData: FormData) {
  const data = leadDataFromForm(formData);
  if (!data.company || !data.contactName) throw new Error("公司名称和联系人姓名不能为空");

  const result = await executionKernel.execute(
    { intent: "CREATE_LEAD", parameters: { data } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success || !result.entityId) throw new Error(result.message);

  revalidatePath("/leads");
  redirect(`/leads/${result.entityId}`);
}

export async function updateLead(id: number, formData: FormData) {
  const data = leadDataFromForm(formData);
  if (!data.company || !data.contactName) throw new Error("公司名称和联系人姓名不能为空");

  const result = await executionKernel.execute(
    { intent: "UPDATE_LEAD", parameters: { leadId: id, data } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success) throw new Error(result.message);

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function deleteLead(id: number): Promise<ActionResult> {
  try {
    const result = await executionKernel.execute(
      { intent: "DELETE_LEAD", parameters: { leadId: id } },
      { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
    );
    if (!result.success) return failure(result.message);

    revalidatePath("/leads");
    return success();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      return failure("该线索存在关联数据，无法删除");
    }
    const message = error instanceof Error ? error.message : "删除线索失败，请稍后重试";
    return failure(message);
  }
}

export async function convertLeadToCustomer(leadId: number): Promise<ActionResult<{ customerId: number }>> {
  try {
    const result = await executionKernel.execute(
      { intent: "CONVERT_LEAD_TO_CUSTOMER", parameters: { leadId } },
      { sessionId: DASHBOARD_SESSION, actorId: "web-action", messageId: "web-action" },
    );
    if (!result.success || !result.entityId) return failure(result.message);
    return success({ customerId: result.entityId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "转化失败，请稍后重试";
    return failure(message);
  }
}

export async function addLeadActivity(leadId: number, formData: FormData) {
  const type = (formData.get("type") as string) || "note";
  const content = formData.get("content") as string;

  const result = await executionKernel.execute(
    { intent: "ADD_LEAD_ACTIVITY", parameters: { leadId, type, content } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success) return { success: false, error: result.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true, activity: result.data?.activity };
}

export async function updateLeadStatus(leadId: number, status: string) {
  const result = await executionKernel.execute(
    { intent: "UPDATE_LEAD_STATUS", parameters: { leadId, status } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success) return { success: false, error: result.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function updateLeadOwner(leadId: number, ownerName: string) {
  const result = await executionKernel.execute(
    { intent: "UPDATE_LEAD_OWNER", parameters: { leadId, ownerName } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success) return { success: false, error: result.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
