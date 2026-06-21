"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:products";

function productData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || null,
    englishKeywords: (formData.get("englishKeywords") as string) || null,
    commonSpecs: (formData.get("commonSpecs") as string) || null,
    application: (formData.get("application") as string) || null,
    targetMarket: (formData.get("targetMarket") as string) || null,
    notes: (formData.get("notes") as string) || null,
    isActive: formData.get("isActive") === "on",
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };
}

export async function createProduct(formData: FormData) {
  const data = productData(formData);
  if (!data.name) throw new Error("产品名称不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_PRODUCT", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/products");
  redirect(`/products/${result.entityId}`);
}

export async function updateProduct(id: number, formData: FormData) {
  const data = productData(formData);
  if (!data.name) throw new Error("产品名称不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_PRODUCT", parameters: { productId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}

export async function deleteProduct(id: number) {
  await executionKernel.execute({ intent: "DELETE_PRODUCT", parameters: { productId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/products");
}
