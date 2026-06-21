"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, Currency } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const DASHBOARD_SESSION = "dashboard:orders";

export async function createOrder(formData: FormData) {
  const data = {
    orderNo: (formData.get("orderNo") as string) || null,
    orderTitle: (formData.get("orderTitle") as string) || null,
    customerId: parseInt(formData.get("customerId") as string),
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
    quoteId: formData.get("quoteId") ? parseInt(formData.get("quoteId") as string) : null,
    contactId: formData.get("contactId") ? parseInt(formData.get("contactId") as string) : null,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    orderStatus: (formData.get("orderStatus") as OrderStatus) || "PENDING_CONFIRMATION",
    totalAmount: formData.get("totalAmount") ? parseFloat(formData.get("totalAmount") as string) : null,
    currency: (formData.get("currency") as Currency) || "USD",
    paymentTerm: (formData.get("paymentTerm") as string) || null,
    deliveryTerm: (formData.get("deliveryTerm") as string) || null,
    expectedDeliveryDate: formData.get("expectedDeliveryDate") ? new Date(formData.get("expectedDeliveryDate") as string) : null,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.customerId) throw new Error("客户不能为空");

  const result = await executionKernel.execute(
    { intent: "CREATE_ORDER", parameters: { data } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success || !result.entityId) throw new Error(result.message);

  revalidatePath("/orders");
  redirect(`/orders/${result.entityId}`);
}

export async function updateOrder(id: number, formData: FormData) {
  const data = {
    orderTitle: (formData.get("orderTitle") as string) || null,
    customerId: parseInt(formData.get("customerId") as string),
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
    contactId: formData.get("contactId") ? parseInt(formData.get("contactId") as string) : null,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    orderStatus: formData.get("orderStatus") as OrderStatus,
    totalAmount: formData.get("totalAmount") ? parseFloat(formData.get("totalAmount") as string) : null,
    currency: formData.get("currency") as Currency,
    paymentTerm: (formData.get("paymentTerm") as string) || null,
    deliveryTerm: (formData.get("deliveryTerm") as string) || null,
    expectedDeliveryDate: formData.get("expectedDeliveryDate") ? new Date(formData.get("expectedDeliveryDate") as string) : null,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.customerId) throw new Error("客户不能为空");

  const result = await executionKernel.execute(
    { intent: "UPDATE_ORDER", parameters: { orderId: id, data } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success) throw new Error(result.message);

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function deleteOrder(id: number) {
  try {
    const result = await executionKernel.execute(
      { intent: "DELETE_ORDER", parameters: { orderId: id } },
      { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
    );
    if (!result.success) return { success: false, error: result.message };

    revalidatePath("/orders");
    return { success: true };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      return { success: false, error: "该订单存在关联数据，无法删除" };
    }
    console.error("Delete order error:", error);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}

export async function updateOrderStatus(orderId: number, status: string) {
  try {
    const result = await executionKernel.execute(
      { intent: "UPDATE_ORDER_STATUS", parameters: { orderId, status } },
      { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
    );
    return result.success ? { success: true } : { success: false, error: result.message };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "INVALID_STATE_TRANSITION" };
  }
}

export async function recalculateOrderTotals(orderId: number) {
  const result = await executionKernel.execute(
    { intent: "RECALCULATE_ORDER_TOTALS", parameters: { orderId } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  return { success: result.success, totalAmount: result.data?.totalAmount };
}

export async function createOrderFromQuote(quoteId: number) {
  const result = await executionKernel.execute(
    { intent: "CONVERT_QUOTE_TO_ORDER", parameters: { quoteId } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success || !result.entityId) throw new Error(result.message);

  revalidatePath("/orders");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/orders/${result.entityId}`);
}
