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

  const customer = await prisma.customer.create({ data: { ...data, tenantId: 1 } });
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

import { createActivityLog } from "@/lib/activity-log";

// ==================== 客户公海操作 ====================

// 认领客户（从公海取出）
export async function claimCustomer(customerId: number, ownerName: string) {
  if (!ownerName) {
    throw new Error("认领人姓名不能为空");
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("客户不存在");
  if (customer.ownerId) throw new Error("该客户已被其他人认领");

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      ownerId: 1, // 默认用户ID，待接入认证后替换
      ownerName,
      poolEnteredAt: null,
      poolReason: null,
    },
  });

  await createActivityLog({
    action: "认领客户",
    entityType: "客户",
    entityId: customerId,
    entityName: customer.company,
    description: `${ownerName} 从公海认领了客户: ${customer.company}`,
  });

  revalidatePath("/customers/pool");
  revalidatePath("/customers");
}

// 退回公海
export async function returnToPool(customerId: number, reason: string = "manual") {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("客户不存在");

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      ownerId: null,
      ownerName: null,
      poolEnteredAt: new Date(),
      poolReason: reason,
    },
  });

  await createActivityLog({
    action: "退回公海",
    entityType: "客户",
    entityId: customerId,
    entityName: customer.company,
    description: `客户 ${customer.company} 已退回公海，原因: ${reason}`,
  });

  revalidatePath("/customers/pool");
  revalidatePath("/customers");
}

// 批量自动退回（无跟进超过指定天数的客户）
export async function autoReturnInactiveCustomers(days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const customers = await prisma.customer.findMany({
    where: {
      ownerId: { not: null },
      followUps: {
        none: {
          followUpDate: { gte: cutoffDate },
        },
      },
    },
    include: {
      followUps: { orderBy: { followUpDate: "desc" }, take: 1 },
    },
  });

  let returnedCount = 0;
  for (const customer of customers) {
    // If the customer has no follow-ups at all, or the last follow-up is before the cutoff
    const lastFollowUp = customer.followUps[0];
    if (!lastFollowUp || new Date(lastFollowUp.followUpDate) < cutoffDate) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          ownerId: null,
          ownerName: null,
          poolEnteredAt: new Date(),
          poolReason: "auto_inactive",
        },
      });

      await createActivityLog({
        action: "自动退回公海",
        entityType: "客户",
        entityId: customer.id,
        entityName: customer.company,
        description: `客户 ${customer.company} 因 ${days} 天无跟进自动退回公海`,
      });

      returnedCount++;
    }
  }

  revalidatePath("/customers/pool");
  revalidatePath("/customers");

  return returnedCount;
}

// ==================== 沉睡客户检测 ====================

export async function addCustomerActivity(customerId: number, formData: FormData) {
  const type = (formData.get("type") as string) || "note";
  const content = formData.get("content") as string;

  if (!content) {
    return { success: false, error: "跟进内容不能为空" };
  }

  const activity = await prisma.customerActivity.create({
    data: {
      customerId,
      type,
      content,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  return { success: true, activity };
}

export async function getDormantCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      followUps: { orderBy: { followUpDate: "desc" }, take: 1 },
    },
  });

  const now = new Date();
  return customers
    .map((c) => {
      const lastFollowUp = c.followUps[0]?.followUpDate || null;
      const daysSince = lastFollowUp
        ? Math.floor((now.getTime() - new Date(lastFollowUp).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        id: c.id,
        company: c.company,
        contactName: c.contactName,
        country: c.country,
        leadGrade: c.leadGrade,
        ownerName: c.ownerName,
        lastFollowUp: lastFollowUp?.toISOString() || null,
        daysSince,
      };
    })
    .filter((c) => c.daysSince >= 60)
    .sort((a, b) => b.daysSince - a.daysSince);
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

// ==================== 客户归档 ====================

export async function archiveCustomer(customerId: number) {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { isArchived: true, archivedAt: new Date() },
  });
  return { success: true, customer };
}

export async function restoreCustomer(customerId: number) {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { isArchived: false, archivedAt: null },
  });
  return { success: true, customer };
}

// ==================== 联系人主联系人设置 ====================

export async function setPrimaryContact(contactId: number, customerId: number) {
  // Reset all contacts for this customer
  await prisma.contact.updateMany({
    where: { customerId },
    data: { isPrimary: false },
  });
  // Set the target as primary
  await prisma.contact.update({
    where: { id: contactId },
    data: { isPrimary: true },
  });
  return { success: true };
}

// ==================== 社交资料 ====================

export async function addContactSocialProfile(data: {
  contactId: number;
  platform: string;
  account: string;
  profileUrl?: string;
  isPrimary?: boolean;
}) {
  const profile = await prisma.contactSocialProfile.create({
    data: {
      contactId: data.contactId,
      platform: data.platform,
      account: data.account,
      profileUrl: data.profileUrl || null,
      isPrimary: data.isPrimary || false,
    },
  });
  return { success: true, profile };
}

export async function deleteContactSocialProfile(profileId: number) {
  await prisma.contactSocialProfile.delete({ where: { id: profileId } });
  return { success: true };
}

// ==================== 自定义字段 ====================

export async function getCustomFieldDefinitions(entityType: string) {
  return prisma.customFieldDefinition.findMany({
    where: { entityType, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createCustomFieldDefinition(data: {
  entityType: string;
  key: string;
  label: string;
  fieldType?: string;
  description?: string;
  isRequired?: boolean;
  options?: any;
}) {
  const definition = await prisma.customFieldDefinition.create({
    data: {
      entityType: data.entityType,
      key: data.key,
      label: data.label,
      fieldType: data.fieldType || "TEXT",
      description: data.description || null,
      isRequired: data.isRequired || false,
      options: data.options || null,
    },
  });
  return { success: true, definition };
}

export async function updateCustomFieldDefinition(id: number, data: any) {
  const definition = await prisma.customFieldDefinition.update({
    where: { id },
    data,
  });
  return { success: true, definition };
}

export async function deleteCustomFieldDefinition(id: number) {
  await prisma.customFieldDefinition.update({
    where: { id },
    data: { isActive: false },
  });
  return { success: true };
}

export async function setCustomFieldValue(data: {
  fieldDefinitionId: number;
  entityType: string;
  entityId: number;
  value: string;
}) {
  const fieldValue = await prisma.customFieldValue.upsert({
    where: {
      fieldDefinitionId_entityType_entityId: {
        fieldDefinitionId: data.fieldDefinitionId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    update: { value: data.value },
    create: {
      fieldDefinitionId: data.fieldDefinitionId,
      entityType: data.entityType,
      entityId: data.entityId,
      value: data.value,
    },
  });
  return { success: true, fieldValue };
}

export async function getCustomFieldValues(entityType: string, entityId: number) {
  return prisma.customFieldValue.findMany({
    where: { entityType, entityId },
    include: { fieldDefinition: true },
  });
}
