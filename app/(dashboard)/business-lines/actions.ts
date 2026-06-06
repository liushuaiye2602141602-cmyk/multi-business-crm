"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBusinessLine(formData: FormData) {
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  const description = (formData.get("description") as string) || null;
  const website = (formData.get("website") as string) || null;
  const mainProducts = (formData.get("mainProducts") as string) || null;

  if (!name) throw new Error("业务线名称不能为空");

  await prisma.businessLine.create({
    data: { name, code, description, website, mainProducts },
  });

  revalidatePath("/business-lines");
  redirect("/business-lines");
}

export async function updateBusinessLine(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  const description = (formData.get("description") as string) || null;
  const website = (formData.get("website") as string) || null;
  const mainProducts = (formData.get("mainProducts") as string) || null;

  if (!name) throw new Error("业务线名称不能为空");

  await prisma.businessLine.update({
    where: { id },
    data: { name, code, description, website, mainProducts },
  });

  revalidatePath("/business-lines");
  redirect("/business-lines");
}

export async function deleteBusinessLine(id: number) {
  // 检查是否有关联数据
  const bl = await prisma.businessLine.findUnique({
    where: { id },
    include: { leads: true, customers: true, projects: true },
  });

  if (!bl) throw new Error("业务线不存在");

  if (bl.leads.length > 0 || bl.customers.length > 0 || bl.projects.length > 0) {
    throw new Error("该业务线下存在数据，不能删除");
  }

  await prisma.businessLine.delete({ where: { id } });
  revalidatePath("/business-lines");
}
