"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QuoteStatus, Currency } from "@/lib/generated/prisma/enums";
import { generateQuoteNo } from "@/lib/format";

export async function createQuote(formData: FormData) {
  const unitPrice = formData.get("unitPrice") ? parseFloat(formData.get("unitPrice") as string) : null;
  const quantity = formData.get("quantity") as string;
  const quantityNum = quantity ? parseFloat(quantity) : null;

  // 自动计算总价
  let totalPrice = formData.get("totalPrice") ? parseFloat(formData.get("totalPrice") as string) : null;
  if (unitPrice && quantityNum && !isNaN(quantityNum)) {
    totalPrice = unitPrice * quantityNum;
  }

  const data = {
    quoteNo: (formData.get("quoteNo") as string) || generateQuoteNo(),
    productName: (formData.get("productName") as string) || null,
    specs: (formData.get("specs") as string) || null,
    quantity: quantity || null,
    unitPrice: unitPrice,
    totalPrice: totalPrice,
    currency: (formData.get("currency") as Currency) || "USD",
    paymentTerms: (formData.get("paymentTerms") as string) || null,
    deliveryTime: (formData.get("deliveryTime") as string) || null,
    validUntil: formData.get("validUntil")
      ? new Date(formData.get("validUntil") as string)
      : null,
    content: (formData.get("content") as string) || null,
    status: (formData.get("status") as QuoteStatus) || "DRAFT",
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };

  if (!data.quoteNo) throw new Error("报价编号不能为空");

  const quote = await prisma.quote.create({ data: { ...data, tenantId: 1 } });
  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuote(id: number, formData: FormData) {
  const unitPrice = formData.get("unitPrice") ? parseFloat(formData.get("unitPrice") as string) : null;
  const quantity = formData.get("quantity") as string;
  const quantityNum = quantity ? parseFloat(quantity) : null;

  let totalPrice = formData.get("totalPrice") ? parseFloat(formData.get("totalPrice") as string) : null;
  if (unitPrice && quantityNum && !isNaN(quantityNum)) {
    totalPrice = unitPrice * quantityNum;
  }

  const data = {
    quoteNo: formData.get("quoteNo") as string,
    productName: (formData.get("productName") as string) || null,
    specs: (formData.get("specs") as string) || null,
    quantity: quantity || null,
    unitPrice: unitPrice,
    totalPrice: totalPrice,
    currency: formData.get("currency") as Currency,
    paymentTerms: (formData.get("paymentTerms") as string) || null,
    deliveryTime: (formData.get("deliveryTime") as string) || null,
    validUntil: formData.get("validUntil")
      ? new Date(formData.get("validUntil") as string)
      : null,
    content: (formData.get("content") as string) || null,
    status: formData.get("status") as QuoteStatus,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };

  if (!data.quoteNo) throw new Error("报价编号不能为空");

  await prisma.quote.update({ where: { id }, data });
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function deleteQuote(id: number) {
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/quotes");
}

export async function updateQuoteStatus(quoteId: number, status: string) {
  const validStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
  if (!validStatuses.includes(status)) {
    return { success: false, error: "无效的状态" };
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    return { success: false, error: "报价不存在" };
  }

  // Lock check: accepted/rejected/expired cannot change back
  const lockedStatuses = ["ACCEPTED", "REJECTED", "EXPIRED"];
  if (lockedStatuses.includes(quote.status)) {
    return { success: false, error: "该报价状态已锁定，不可修改" };
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: status as any },
  });

  // Emit event — all AI processing goes through Event Bus
  if (status === "SENT") {
    try {
      const { emit } = await import("@/lib/events/bus");
      await emit({ type: "quote.sent", entityId: quoteId, entityType: "Quote" });
    } catch {}
  }

  return { success: true };
}

export async function recalculateQuoteTotals(quoteId: number) {
  const items = await prisma.quoteItem.findMany({
    where: { quoteId },
  });

  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.totalPrice || 0);
  }, 0);

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  const discount = quote ? Number(quote.discountAmount) : 0;
  const totalAmount = subtotal - discount;

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      totalPrice: totalAmount,
    },
  });

  return { success: true, totalAmount };
}
