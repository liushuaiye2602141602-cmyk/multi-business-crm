"use server";

import prisma from "@/lib/prisma";
import { getDefaultColumnConfig } from "@/lib/customer-list/field-registry";

export async function getViews() {
  return prisma.customerListView.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function createView(data: { name: string; description?: string; columns?: any; filters?: any; sort?: any; pageSize?: number }) {
  const view = await prisma.customerListView.create({
    data: {
      name: data.name,
      description: data.description || null,
      columns: data.columns || getDefaultColumnConfig(),
      filters: data.filters || {},
      sort: data.sort || { field: "updatedAt", order: "desc" },
      pageSize: data.pageSize || 20,
    },
  });
  return view;
}

export async function updateView(id: number, data: { name?: string; description?: string; columns?: any; filters?: any; sort?: any; pageSize?: number }) {
  const view = await prisma.customerListView.update({
    where: { id },
    data,
  });
  return view;
}

export async function deleteView(id: number) {
  const view = await prisma.customerListView.findUnique({ where: { id } });
  if (view?.isDefault) {
    return { success: false, error: "不能删除默认视图" };
  }
  await prisma.customerListView.delete({ where: { id } });
  return { success: true };
}

export async function duplicateView(id: number, newName: string) {
  const source = await prisma.customerListView.findUnique({ where: { id } });
  if (!source) return { success: false, error: "视图不存在" };
  const view = await prisma.customerListView.create({
    data: {
      name: newName,
      description: source.description,
      columns: source.columns as any,
      filters: source.filters as any,
      sort: source.sort as any,
      pageSize: source.pageSize,
    },
  });
  return { success: true, view };
}

export async function setDefaultView(id: number) {
  await prisma.customerListView.updateMany({ data: { isDefault: false } });
  await prisma.customerListView.update({ where: { id }, data: { isDefault: true } });
  return { success: true };
}
