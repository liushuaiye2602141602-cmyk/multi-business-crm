"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:order-items";

function itemData(orderId: number, formData: FormData) {
  const data = {
    orderId,
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

export async function createOrderItem(orderId: number, formData: FormData) {
  const data = itemData(orderId, formData);
  if (!data.itemName) throw new Error("产品名称不能为空");
  await executionKernel.execute({ intent: "CREATE_ORDER_ITEM", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function updateOrderItem(orderId: number, itemId: number, formData: FormData) {
  const data = itemData(orderId, formData);
  delete (data as any).orderId;
  if (!data.itemName) throw new Error("产品名称不能为空");
  await executionKernel.execute({ intent: "UPDATE_ORDER_ITEM", parameters: { orderItemId: itemId, data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function deleteOrderItem(orderId: number, itemId: number) {
  await executionKernel.execute({ intent: "DELETE_ORDER_ITEM", parameters: { orderItemId: itemId } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/orders/${orderId}`);
}
