"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createActivityLog } from "@/lib/activity-log";

export async function createProduct(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || null,
    englishKeywords: (formData.get("englishKeywords") as string) || null,
    commonSpecs: (formData.get("commonSpecs") as string) || null,
    application: (formData.get("application") as string) || null,
    targetMarket: (formData.get("targetMarket") as string) || null,
    notes: (formData.get("notes") as string) || null,
    isActive: formData.get("isActive") === "on",
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };

  if (!data.name) throw new Error("产品名称不能为空");

  const product = await prisma.product.create({ data });

  await createActivityLog({
    action: "创建",
    entityType: "产品",
    entityId: product.id,
    entityName: product.name,
    description: `创建产品: ${product.name}`,
  });

  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function updateProduct(id: number, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || null,
    englishKeywords: (formData.get("englishKeywords") as string) || null,
    commonSpecs: (formData.get("commonSpecs") as string) || null,
    application: (formData.get("application") as string) || null,
    targetMarket: (formData.get("targetMarket") as string) || null,
    notes: (formData.get("notes") as string) || null,
    isActive: formData.get("isActive") === "on",
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };

  if (!data.name) throw new Error("产品名称不能为空");

  await prisma.product.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "产品",
    entityId: id,
    entityName: data.name,
    description: `更新产品: ${data.name}`,
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}

export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("产品不存在");

  await prisma.product.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "产品",
    entityId: id,
    entityName: product.name,
    description: `删除产品: ${product.name}`,
  });

  revalidatePath("/products");
}
