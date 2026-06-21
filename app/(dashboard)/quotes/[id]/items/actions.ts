"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:quote-items";

function itemData(quoteId: number, formData: FormData) {
  const data = {
    quoteId,
    productId: formData.get("productId") ? parseInt(formData.get("productId") as string) : null,
    itemName: formData.get("itemName") as string,
    specification: (formData.get("specification") as string) || null,
    quantity: formData.get("quantity") ? parseFloat(formData.get("quantity") as string) : null,
    unit: (formData.get("unit") as string) || null,
    unitPrice: formData.get("unitPrice") ? parseFloat(formData.get("unitPrice") as string) : null,
    totalPrice: formData.get("totalPrice") ? parseFloat(formData.get("totalPrice") as string) : null,
    notes: (formData.get("notes") as string) || null,
    sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
  };
  if (data.quantity && data.unitPrice && !data.totalPrice) data.totalPrice = data.quantity * data.unitPrice;
  return data;
}

export async function createQuoteItem(quoteId: number, formData: FormData) {
  const data = itemData(quoteId, formData);
  if (!data.itemName) throw new Error("产品名称不能为空");
  await executionKernel.execute({ intent: "CREATE_QUOTE_ITEM", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}`);
}

export async function updateQuoteItem(quoteId: number, itemId: number, formData: FormData) {
  const data = itemData(quoteId, formData);
  delete (data as any).quoteId;
  if (!data.itemName) throw new Error("产品名称不能为空");
  await executionKernel.execute({ intent: "UPDATE_QUOTE_ITEM", parameters: { quoteItemId: itemId, data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}`);
}

export async function deleteQuoteItem(quoteId: number, itemId: number) {
  await executionKernel.execute({ intent: "DELETE_QUOTE_ITEM", parameters: { quoteItemId: itemId } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/quotes/${quoteId}`);
}
