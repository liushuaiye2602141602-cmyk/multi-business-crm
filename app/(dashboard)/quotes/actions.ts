"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QuoteStatus, Currency } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const DASHBOARD_SESSION = "dashboard:quotes";

function quoteDataFromForm(formData: FormData, includeQuoteNo: boolean) {
  const unitPrice = formData.get("unitPrice") ? parseFloat(formData.get("unitPrice") as string) : null;
  const quantity = formData.get("quantity") as string;
  const quantityNum = quantity ? parseFloat(quantity) : null;
  let totalPrice = formData.get("totalPrice") ? parseFloat(formData.get("totalPrice") as string) : null;
  if (unitPrice && quantityNum && !Number.isNaN(quantityNum)) {
    totalPrice = unitPrice * quantityNum;
  }

  return {
    ...(includeQuoteNo ? { quoteNo: (formData.get("quoteNo") as string) || null } : { quoteNo: formData.get("quoteNo") as string }),
    productName: (formData.get("productName") as string) || null,
    specs: (formData.get("specs") as string) || null,
    quantity: quantity || null,
    unitPrice,
    totalPrice,
    currency: ((formData.get("currency") as Currency) || "USD") as Currency,
    paymentTerms: (formData.get("paymentTerms") as string) || null,
    deliveryTime: (formData.get("deliveryTime") as string) || null,
    validUntil: formData.get("validUntil") ? new Date(formData.get("validUntil") as string) : null,
    content: (formData.get("content") as string) || null,
    status: ((formData.get("status") as QuoteStatus) || "DRAFT") as QuoteStatus,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };
}

export async function createQuote(formData: FormData) {
  const data = quoteDataFromForm(formData, true);
  const result = await executionKernel.execute(
    { intent: "CREATE_QUOTE", parameters: { data } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success || !result.entityId) throw new Error(result.message);

  revalidatePath("/quotes");
  redirect(`/quotes/${result.entityId}`);
}

export async function updateQuote(id: number, formData: FormData) {
  const data = quoteDataFromForm(formData, false);
  if (!data.quoteNo) throw new Error("报价编号不能为空");

  const result = await executionKernel.execute(
    { intent: "UPDATE_QUOTE", parameters: { quoteId: id, data } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  if (!result.success) throw new Error(result.message);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function deleteQuote(id: number) {
  try {
    const result = await executionKernel.execute(
      { intent: "DELETE_QUOTE", parameters: { quoteId: id } },
      { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
    );
    if (!result.success) return { success: false, error: result.message };
    revalidatePath("/quotes");
    return { success: true };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      return { success: false, error: "该报价存在关联数据，无法删除" };
    }
    console.error("Delete quote error:", error);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}

export async function updateQuoteStatus(quoteId: number, status: string) {
  const result = await executionKernel.execute(
    { intent: "UPDATE_QUOTE_STATUS", parameters: { quoteId, status } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  return result.success ? { success: true } : { success: false, error: result.message };
}

export async function recalculateQuoteTotals(quoteId: number) {
  const result = await executionKernel.execute(
    { intent: "RECALCULATE_QUOTE_TOTALS", parameters: { quoteId } },
    { sessionId: DASHBOARD_SESSION, actorId: "web-action" },
  );
  return { success: result.success, totalAmount: result.data?.totalAmount };
}
