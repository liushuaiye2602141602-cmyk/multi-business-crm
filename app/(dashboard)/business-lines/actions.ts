"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:business-lines";

function businessLineData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    code: (formData.get("code") as string) || null,
    description: (formData.get("description") as string) || null,
    website: (formData.get("website") as string) || null,
    mainProducts: (formData.get("mainProducts") as string) || null,
  };
}

export async function createBusinessLine(formData: FormData) {
  const data = businessLineData(formData);
  if (!data.name) throw new Error("业务线名称不能为空");
  await executionKernel.execute({ intent: "CREATE_BUSINESS_LINE", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/business-lines");
  redirect("/business-lines");
}

export async function updateBusinessLine(id: number, formData: FormData) {
  const data = businessLineData(formData);
  if (!data.name) throw new Error("业务线名称不能为空");
  await executionKernel.execute({ intent: "UPDATE_BUSINESS_LINE", parameters: { businessLineId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/business-lines");
  redirect("/business-lines");
}

export async function deleteBusinessLine(id: number) {
  await executionKernel.execute({ intent: "DELETE_BUSINESS_LINE", parameters: { businessLineId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/business-lines");
}
