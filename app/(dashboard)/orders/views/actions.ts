"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getOrderViews(tenantId?: number, userId?: number) {
  const where: Record<string, unknown> = {};
  if (tenantId) where.tenantId = tenantId;
  if (userId) {
    where.OR = [
      { userId },
      { isShared: true },
    ];
  }

  return prisma.orderListView.findMany({
    where,
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function createOrderView(data: {
  name: string;
  description?: string;
  columns?: unknown;
  filters?: unknown;
  sort?: unknown;
  pageSize?: number;
  tenantId?: number;
  userId?: number;
}) {
  const view = await prisma.orderListView.create({
    data: {
      name: data.name,
      description: data.description || null,
      columns: data.columns || [],
      filters: data.filters || {},
      sort: data.sort || {},
      pageSize: data.pageSize || 20,
      tenantId: data.tenantId || null,
      userId: data.userId || null,
    },
  });

  revalidatePath("/orders");
  return view;
}

export async function updateOrderView(
  id: number,
  data: {
    name?: string;
    description?: string;
    columns?: Prisma.InputJsonValue;
    filters?: Prisma.InputJsonValue;
    sort?: Prisma.InputJsonValue;
    pageSize?: number;
    isDefault?: boolean;
  }
) {
  const view = await prisma.orderListView.update({
    where: { id },
    data,
  });

  revalidatePath("/orders");
  return view;
}

export async function deleteOrderView(id: number) {
  await prisma.orderListView.delete({ where: { id } });
  revalidatePath("/orders");
}

export async function setDefaultOrderView(id: number) {
  const view = await prisma.orderListView.findUnique({ where: { id } });
  if (!view) throw new Error("View not found");

  // Unset other defaults for the same tenant/user
  await prisma.orderListView.updateMany({
    where: {
      tenantId: view.tenantId,
      userId: view.userId,
      isDefault: true,
    },
    data: { isDefault: false },
  });

  await prisma.orderListView.update({
    where: { id },
    data: { isDefault: true },
  });

  revalidatePath("/orders");
}
