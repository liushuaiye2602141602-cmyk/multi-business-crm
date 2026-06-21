"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:contacts";

function contactData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : undefined,
    position: (formData.get("position") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    phone: (formData.get("phone") as string) || null,
    wechat: (formData.get("wechat") as string) || null,
    linkedin: (formData.get("linkedin") as string) || null,
    isPrimary: formData.get("isPrimary") === "on",
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createContact(formData: FormData) {
  const data = contactData(formData);
  if (!data.name) throw new Error("联系人姓名不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_CONTACT", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/contacts");
  if (data.customerId) revalidatePath(`/customers/${data.customerId}`);
  redirect(`/contacts/${result.entityId}`);
}

export async function updateContact(id: number, formData: FormData) {
  const data = contactData(formData);
  if (!data.name) throw new Error("联系人姓名不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_CONTACT", parameters: { contactId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: number) {
  try {
    const result = await executionKernel.execute({ intent: "DELETE_CONTACT", parameters: { contactId: id } }, { sessionId: SESSION, actorId: "web-action" });
    if (!result.success) return { success: false, error: result.message };
    revalidatePath("/contacts");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "删除失败，请稍后重试" };
  }
}
