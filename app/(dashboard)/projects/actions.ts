"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProjectStatus, Currency } from "@/lib/generated/prisma/enums";

export async function createProject(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    status: (formData.get("status") as ProjectStatus) || "REQUIREMENT_CONFIRMING",
    productCategory: (formData.get("productCategory") as string) || null,
    productName: (formData.get("productName") as string) || null,
    specs: (formData.get("specs") as string) || null,
    quantity: (formData.get("quantity") as string) || null,
    usage: (formData.get("usage") as string) || null,
    targetMarket: (formData.get("targetMarket") as string) || null,
    specialRequirements: (formData.get("specialRequirements") as string) || null,
    amount: formData.get("amount") ? parseFloat(formData.get("amount") as string) : null,
    currency: (formData.get("currency") as Currency) || "USD",
    startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
    customerId: parseInt(formData.get("customerId") as string),
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
  };

  if (!data.name) throw new Error("项目名称不能为空");

  const project = await prisma.project.create({ data });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: number, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    status: formData.get("status") as ProjectStatus,
    productCategory: (formData.get("productCategory") as string) || null,
    productName: (formData.get("productName") as string) || null,
    specs: (formData.get("specs") as string) || null,
    quantity: (formData.get("quantity") as string) || null,
    usage: (formData.get("usage") as string) || null,
    targetMarket: (formData.get("targetMarket") as string) || null,
    specialRequirements: (formData.get("specialRequirements") as string) || null,
    amount: formData.get("amount") ? parseFloat(formData.get("amount") as string) : null,
    currency: formData.get("currency") as Currency,
    startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
    customerId: parseInt(formData.get("customerId") as string),
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
  };

  if (!data.name) throw new Error("项目名称不能为空");

  await prisma.project.update({ where: { id }, data });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: number) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { followUps: true, quotes: true, tasks: true },
  });

  if (!project) throw new Error("项目不存在");

  if (project.followUps.length > 0 || project.quotes.length > 0 || project.tasks.length > 0) {
    throw new Error("该项目存在关联数据，请先处理关联跟进、报价或任务后再删除");
  }

  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
}

export async function markProjectAsWon(id: number) {
  await prisma.project.update({
    where: { id },
    data: { status: "WON" },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}
