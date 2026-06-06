"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CustomerType, CustomerStatus, LeadGrade, LeadSource } from "@/lib/generated/prisma/enums";

export async function createCustomer(formData: FormData) {
  const data = {
    company: formData.get("company") as string,
    contactName: formData.get("contactName") as string,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    website: (formData.get("website") as string) || null,
    address: (formData.get("address") as string) || null,
    industry: (formData.get("industry") as string) || null,
    customerType: (formData.get("customerType") as CustomerType) || "UNKNOWN",
    customerStatus: (formData.get("customerStatus") as CustomerStatus) || "POTENTIAL",
    leadGrade: (formData.get("leadGrade") as LeadGrade) || "C",
    source: (formData.get("source") as LeadSource) || null,
    sourceWebsite: (formData.get("sourceWebsite") as string) || null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };

  if (!data.company || !data.contactName) {
    throw new Error("公司名称和联系人姓名不能为空");
  }

  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: number, formData: FormData) {
  const data = {
    company: formData.get("company") as string,
    contactName: formData.get("contactName") as string,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    website: (formData.get("website") as string) || null,
    address: (formData.get("address") as string) || null,
    industry: (formData.get("industry") as string) || null,
    customerType: formData.get("customerType") as CustomerType,
    customerStatus: formData.get("customerStatus") as CustomerStatus,
    leadGrade: formData.get("leadGrade") as LeadGrade,
    source: (formData.get("source") as LeadSource) || null,
    sourceWebsite: (formData.get("sourceWebsite") as string) || null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };

  if (!data.company || !data.contactName) {
    throw new Error("公司名称和联系人姓名不能为空");
  }

  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: number) {
  // 检查是否有关联数据
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { projects: true, followUps: true, quotes: true, tasks: true },
  });

  if (!customer) throw new Error("客户不存在");

  if (customer.projects.length > 0 || customer.followUps.length > 0 || customer.quotes.length > 0 || customer.tasks.length > 0) {
    throw new Error("该客户存在关联数据，请先处理关联项目、跟进、报价或任务后再删除");
  }

  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}
