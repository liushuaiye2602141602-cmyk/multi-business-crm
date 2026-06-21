"use server";

import prisma from "@/lib/prisma";
import { getDefaultColumnConfig } from "@/lib/customer-list/field-registry";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:customer-views";

export async function getViews() {
  return prisma.customerListView.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

export async function createView(data: { name: string; description?: string; columns?: any; filters?: any; sort?: any; pageSize?: number }) {
  const result = await executionKernel.execute({
    intent: "CREATE_CUSTOMER_LIST_VIEW",
    parameters: {
      data: {
        name: data.name,
        description: data.description || null,
        columns: data.columns || getDefaultColumnConfig(),
        filters: data.filters || {},
        sort: data.sort || { field: "updatedAt", order: "desc" },
        pageSize: data.pageSize || 20,
      },
    },
  }, { sessionId: SESSION, actorId: "web-action" });
  return result.data?.entity;
}

export async function updateView(id: number, data: { name?: string; description?: string; columns?: any; filters?: any; sort?: any; pageSize?: number }) {
  const result = await executionKernel.execute({ intent: "UPDATE_CUSTOMER_LIST_VIEW", parameters: { customerListViewId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  return result.data?.entity;
}

export async function deleteView(id: number) {
  const view = await prisma.customerListView.findUnique({ where: { id } });
  if (view?.isDefault) return { success: false, error: "不能删除默认视图" };
  await executionKernel.execute({ intent: "DELETE_CUSTOMER_LIST_VIEW", parameters: { customerListViewId: id } }, { sessionId: SESSION, actorId: "web-action" });
  return { success: true };
}

export async function duplicateView(id: number, newName: string) {
  const result = await executionKernel.execute({ intent: "DUPLICATE_CUSTOMER_LIST_VIEW", parameters: { customerListViewId: id, name: newName } }, { sessionId: SESSION, actorId: "web-action" });
  return result.success ? { success: true, view: result.data?.entity } : { success: false, error: result.message };
}

export async function setDefaultView(id: number) {
  await executionKernel.execute({ intent: "SET_DEFAULT_CUSTOMER_LIST_VIEW", parameters: { customerListViewId: id } }, { sessionId: SESSION, actorId: "web-action" });
  return { success: true };
}
