"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeadSource, LeadStatus, LeadTemperature, LeadGrade, Currency } from "@/lib/generated/prisma/enums";
import { createActivityLog } from "@/lib/activity-log";

export async function createLead(formData: FormData) {
  const data = {
    company: formData.get("company") as string,
    contactName: formData.get("contactName") as string,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    source: (formData.get("source") as LeadSource) || "MANUAL_OUTREACH",
    sourceWebsite: (formData.get("sourceWebsite") as string) || null,
    status: (formData.get("status") as LeadStatus) || "NEW",
    temperature: (formData.get("temperature") as LeadTemperature) || "WARM",
    grade: (formData.get("grade") as LeadGrade) || "C",
    requirement: (formData.get("requirement") as string) || null,
    interestProducts: (formData.get("interestProducts") as string) || null,
    inquiryContent: (formData.get("inquiryContent") as string) || null,
    budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
    currency: (formData.get("currency") as Currency) || "USD",
    expectedClosing: formData.get("expectedClosing")
      ? new Date(formData.get("expectedClosing") as string)
      : null,
    nextFollowUp: formData.get("nextFollowUp")
      ? new Date(formData.get("nextFollowUp") as string)
      : null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };

  if (!data.company || !data.contactName) {
    throw new Error("公司名称和联系人姓名不能为空");
  }

  const lead = await prisma.lead.create({ data: { ...data, tenantId: 1 } });

  await createActivityLog({
    action: "创建",
    entityType: "线索",
    entityId: lead.id,
    entityName: lead.company,
    description: `创建线索: ${lead.company} - ${lead.contactName}`,
  });

  // Emit event — all AI processing goes through Event Bus
  try {
    const { emit } = await import("@/lib/events/bus");
    await emit({ type: "lead.created", entityId: lead.id, entityType: "Lead" });
  } catch {}

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: number, formData: FormData) {
  const data = {
    company: formData.get("company") as string,
    contactName: formData.get("contactName") as string,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    source: formData.get("source") as LeadSource,
    sourceWebsite: (formData.get("sourceWebsite") as string) || null,
    status: formData.get("status") as LeadStatus,
    temperature: formData.get("temperature") as LeadTemperature,
    grade: formData.get("grade") as LeadGrade,
    requirement: (formData.get("requirement") as string) || null,
    interestProducts: (formData.get("interestProducts") as string) || null,
    inquiryContent: (formData.get("inquiryContent") as string) || null,
    budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
    currency: formData.get("currency") as Currency,
    expectedClosing: formData.get("expectedClosing")
      ? new Date(formData.get("expectedClosing") as string)
      : null,
    nextFollowUp: formData.get("nextFollowUp")
      ? new Date(formData.get("nextFollowUp") as string)
      : null,
    remark: (formData.get("remark") as string) || null,
    businessLineId: parseInt(formData.get("businessLineId") as string),
  };

  if (!data.company || !data.contactName) {
    throw new Error("公司名称和联系人姓名不能为空");
  }

  await prisma.lead.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "线索",
    entityId: id,
    entityName: data.company,
    description: `更新线索: ${data.company}`,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function deleteLead(id: number) {
  // 检查是否有关联数据
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { followUps: true, quotes: true, tasks: true, projects: true },
  });

  if (!lead) throw new Error("线索不存在");

  if (lead.followUps.length > 0 || lead.quotes.length > 0 || lead.tasks.length > 0 || lead.projects.length > 0) {
    throw new Error("该线索存在关联数据，请先处理关联跟进、报价、任务或项目后再删除");
  }

  await prisma.lead.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "线索",
    entityId: id,
    entityName: lead.company,
    description: `删除线索: ${lead.company}`,
  });

  revalidatePath("/leads");
}

export async function convertLeadToCustomer(leadId: number) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) throw new Error("线索不存在");

  if (lead.convertedCustomerId) {
    throw new Error("该线索已转化为客户，不能重复转化");
  }

  // 创建客户
  const customer = await prisma.customer.create({
    data: {
      company: lead.company,
      contactName: lead.contactName,
      country: lead.country,
      phone: lead.phone,
      email: lead.email,
      whatsapp: lead.whatsapp,
      source: lead.source,
      sourceWebsite: lead.sourceWebsite,
      leadGrade: lead.grade,
      remark: lead.remark,
      businessLineId: lead.businessLineId,
      customerStatus: "POTENTIAL",
      customerType: "UNKNOWN",
      tenantId: 1,
    },
  });

  // 更新线索状态
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "QUALIFIED",
      convertedCustomerId: customer.id,
    },
  });

  await createActivityLog({
    action: "转化",
    entityType: "线索",
    entityId: leadId,
    entityName: lead.company,
    description: `线索 ${lead.company} 转为客户 ${customer.company}`,
  });

  revalidatePath("/leads");
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function addLeadActivity(leadId: number, formData: FormData) {
  const type = (formData.get("type") as string) || "note";
  const content = formData.get("content") as string;

  if (!content) {
    return { success: false, error: "跟进内容不能为空" };
  }

  const activity = await prisma.leadActivity.create({
    data: {
      leadId,
      type,
      content,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return { success: true, activity };
}

export async function updateLeadStatus(leadId: number, status: string) {
  const validStatuses = ["NEW", "CONTACTED", "QUALIFIED", "LOST"];
  if (!validStatuses.includes(status)) {
    return { success: false, error: "无效的状态" };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as any },
  });

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function updateLeadOwner(leadId: number, ownerName: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { ownerName: ownerName || null },
  });

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
