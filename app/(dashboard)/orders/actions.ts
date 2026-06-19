"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, Currency } from "@/lib/generated/prisma/enums";
import { createActivityLog } from "@/lib/activity-log";
import { getLocalWorkspaceId } from "@/lib/local-context";

function generateOrderNo(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `O-${dateStr}-${random}`;
}

export async function createOrder(formData: FormData) {
  const data = {
    orderNo: (formData.get("orderNo") as string) || generateOrderNo(),
    orderTitle: (formData.get("orderTitle") as string) || null,
    customerId: parseInt(formData.get("customerId") as string),
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
    quoteId: formData.get("quoteId") ? parseInt(formData.get("quoteId") as string) : null,
    contactId: formData.get("contactId") ? parseInt(formData.get("contactId") as string) : null,
    businessLineId: formData.get("businessLineId") ? parseInt(formData.get("businessLineId") as string) : null,
    orderStatus: (formData.get("orderStatus") as OrderStatus) || "DRAFT",
    totalAmount: formData.get("totalAmount") ? parseFloat(formData.get("totalAmount") as string) : null,
    currency: (formData.get("currency") as Currency) || "USD",
    paymentTerm: (formData.get("paymentTerm") as string) || null,
    deliveryTerm: (formData.get("deliveryTerm") as string) || null,
    expectedDeliveryDate: formData.get("expectedDeliveryDate")
      ? new Date(formData.get("expectedDeliveryDate") as string)
      : null,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.customerId) throw new Error("客户不能为空");

  const order = await prisma.order.create({ data: { ...data, tenantId: getLocalWorkspaceId() } });

  await createActivityLog({
    action: "创建",
    entityType: "订单",
    entityId: order.id,
    entityName: order.orderNo,
    description: `创建订单: ${order.orderNo}`,
  });

  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
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
    expectedDeliveryDate: formData.get("expectedDeliveryDate")
      ? new Date(formData.get("expectedDeliveryDate") as string)
      : null,
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.customerId) throw new Error("客户不能为空");

  await prisma.order.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "订单",
    entityId: id,
    entityName: `订单 #${id}`,
    description: `更新订单`,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function deleteOrder(id: number) {
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return { success: false, error: "订单不存在" };

    await prisma.order.delete({ where: { id } });

    await createActivityLog({
      action: "删除",
      entityType: "订单",
      entityId: id,
      entityName: order.orderNo,
      description: `删除订单: ${order.orderNo}`,
    });

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
  const validStatuses = ["DRAFT", "CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return { success: false, error: "无效的状态" };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  // Lock check: completed/cannot go back
  const terminalStatuses = ["COMPLETED", "CANCELLED"];
  if (terminalStatuses.includes(order.orderStatus)) {
    return { success: false, error: "该订单状态已锁定，不可修改" };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: status as any },
  });

  // Emit event AFTER DB commit (never inside a transaction)
  if (status === "CONFIRMED") {
    try {
      const { emit } = await import("@/lib/events/bus");
      await emit({ type: "order.confirmed", entityId: orderId, entityType: "Order" });
    } catch (err) {
      console.error("order.confirmed event emit failed:", err);
    }
  }

  return { success: true };
}

export async function recalculateOrderTotals(orderId: number) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
  });

  const totalAmount = items.reduce((sum, item) => {
    return sum + Number(item.totalPrice || 0);
  }, 0);

  await prisma.order.update({
    where: { id: orderId },
    data: { totalAmount },
  });

  return { success: true, totalAmount };
}

export async function createOrderFromQuote(quoteId: number) {
  // Use transaction to ensure atomicity: order + items + quote status update
  return await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, project: { select: { businessLineId: true } } },
    });

    if (!quote) throw new Error("报价不存在");

    // Only allow conversion from ACCEPTED quotes
    if (quote.status !== "ACCEPTED") {
      throw new Error("只有已接受(ACCEPTED)的报价才能转换为订单");
    }

    // Check customerId is present
    if (!quote.customerId) {
      throw new Error("该报价缺少客户信息，无法创建订单");
    }

    // Prevent duplicate order creation
    const existingOrder = await tx.order.findFirst({
      where: { quoteId },
    });

    if (existingOrder) {
      throw new Error(`该报价已创建订单: ${existingOrder.orderNo}`);
    }

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        orderTitle: quote.quoteTitle || `订单 - ${quote.quoteNo}`,
        customerId: quote.customerId,
        projectId: quote.projectId,
        quoteId: quote.id,
        contactId: quote.customerContactId,
        businessLineId: quote.project?.businessLineId ?? null,
        orderStatus: "DRAFT",
        totalAmount: quote.totalPrice,
        currency: quote.currency,
        paymentTerm: quote.paymentTerms,
        deliveryTerm: quote.deliveryTime,
        notes: quote.remarks,
        tenantId: quote.tenantId,
      },
    });

    // Copy QuoteItem to OrderItem
    if (quote.items.length > 0) {
      await tx.orderItem.createMany({
        data: quote.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          itemName: item.itemName,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
          sortOrder: item.sortOrder,
        })),
      });
    }

    // Mark quote as converted to prevent re-conversion
    await tx.quote.update({
      where: { id: quoteId },
      data: { status: "ACCEPTED" }, // Keep ACCEPTED but the duplicate check + customerId guard prevent re-conversion
    });

    await createActivityLog({
      action: "从报价创建",
      entityType: "订单",
      entityId: order.id,
      entityName: order.orderNo,
      description: `从报价 ${quote.quoteNo} 创建订单 ${order.orderNo}`,
    });

    revalidatePath("/orders");
    revalidatePath(`/quotes/${quoteId}`);
    redirect(`/orders/${order.id}`);
  });
}
