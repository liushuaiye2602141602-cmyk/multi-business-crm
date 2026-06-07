"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createActivityLog } from "@/lib/activity-log";

export async function createOrderItem(orderId: number, formData: FormData) {
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

  if (!data.itemName) throw new Error("产品名称不能为空");

  if (data.quantity && data.unitPrice && !data.totalPrice) {
    data.totalPrice = data.quantity * data.unitPrice;
  }

  await prisma.orderItem.create({ data });

  await createActivityLog({
    action: "创建",
    entityType: "订单明细",
    entityName: data.itemName,
    description: `创建订单明细: ${data.itemName}`,
  });

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function updateOrderItem(orderId: number, itemId: number, formData: FormData) {
  const data = {
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

  if (!data.itemName) throw new Error("产品名称不能为空");

  if (data.quantity && data.unitPrice && !data.totalPrice) {
    data.totalPrice = data.quantity * data.unitPrice;
  }

  await prisma.orderItem.update({ where: { id: itemId }, data });

  await createActivityLog({
    action: "更新",
    entityType: "订单明细",
    entityId: itemId,
    entityName: data.itemName,
    description: `更新订单明细: ${data.itemName}`,
  });

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function deleteOrderItem(orderId: number, itemId: number) {
  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("明细不存在");

  await prisma.orderItem.delete({ where: { id: itemId } });

  await createActivityLog({
    action: "删除",
    entityType: "订单明细",
    entityId: itemId,
    entityName: item.itemName,
    description: `删除订单明细: ${item.itemName}`,
  });

  revalidatePath(`/orders/${orderId}`);
}
