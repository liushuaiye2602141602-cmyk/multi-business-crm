"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:order-views";

export async function getOrderViews(tenantId?: number, userId?: number) {
  const where: Record<string, unknown> = {};
  if (tenantId) where.tenantId = tenantId;
  if (userId) where.OR = [{ userId }, { isShared: true }];
  return prisma.orderListView.findMany({ where, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
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
  const result = await executionKernel.execute({
    intent: "CREATE_ORDER_LIST_VIEW",
    parameters: { data: { ...data, description: data.description || null, columns: data.columns || [], filters: data.filters || {}, sort: data.sort || {}, pageSize: data.pageSize || 20, tenantId: data.tenantId || null, userId: data.userId || null } },
  }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/orders");
  return result.data?.entity;
}

export async function updateOrderView(id: number, data: {
  name?: string;
  description?: string;
  columns?: Prisma.InputJsonValue;
  filters?: Prisma.InputJsonValue;
  sort?: Prisma.InputJsonValue;
  pageSize?: number;
  isDefault?: boolean;
}) {
  const result = await executionKernel.execute({ intent: "UPDATE_ORDER_LIST_VIEW", parameters: { orderListViewId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/orders");
  return result.data?.entity;
}

export async function deleteOrderView(id: number) {
  await executionKernel.execute({ intent: "DELETE_ORDER_LIST_VIEW", parameters: { orderListViewId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/orders");
}

export async function setDefaultOrderView(id: number) {
  await executionKernel.execute({ intent: "SET_DEFAULT_ORDER_LIST_VIEW", parameters: { orderListViewId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/orders");
}
