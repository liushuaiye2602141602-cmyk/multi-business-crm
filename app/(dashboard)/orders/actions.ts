"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, Currency } from "@/lib/generated/prisma/enums";
import { createActivityLog } from "@/lib/activity-log";

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

  const order = await prisma.order.create({ data });

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
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("订单不存在");

  await prisma.order.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "订单",
    entityId: id,
    entityName: order.orderNo,
    description: `删除订单: ${order.orderNo}`,
  });

  revalidatePath("/orders");
}

export async function createOrderFromQuote(quoteId: number) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!quote) throw new Error("报价不存在");

  // 检查是否已经创建过订单
  const existingOrder = await prisma.order.findFirst({
    where: { quoteId },
  });

  if (existingOrder) {
    throw new Error(`该报价已创建订单: ${existingOrder.orderNo}`);
  }

  const order = await prisma.order.create({
    data: {
      orderNo: generateOrderNo(),
      orderTitle: quote.quoteTitle || `订单 - ${quote.quoteNo}`,
      customerId: quote.customerId!,
      projectId: quote.projectId,
      quoteId: quote.id,
      contactId: quote.customerContactId,
      orderStatus: "DRAFT",
      totalAmount: quote.totalPrice,
      currency: quote.currency,
      paymentTerm: quote.paymentTerms,
      deliveryTerm: quote.deliveryTime,
      notes: quote.remarks,
    },
  });

  // 复制 QuoteItem 到 OrderItem
  if (quote.items.length > 0) {
    await prisma.orderItem.createMany({
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
}
