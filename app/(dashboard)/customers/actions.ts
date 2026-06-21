"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CustomerType, CustomerStatus, LeadGrade, LeadSource } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:customers";

function customerData(formData: FormData) {
  return {
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
}

export async function createCustomer(formData: FormData) {
  const data = customerData(formData);
  if (!data.company || !data.contactName) throw new Error("公司名称和联系人姓名不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_CUSTOMER", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success || !result.entityId) throw new Error(result.message);
  revalidatePath("/customers");
  redirect(`/customers/${result.entityId}`);
}

export async function updateCustomer(id: number, formData: FormData) {
  const data = customerData(formData);
  if (!data.company || !data.contactName) throw new Error("公司名称和联系人姓名不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_CUSTOMER", parameters: { customerId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function claimCustomer(customerId: number, ownerName: string) {
  if (!ownerName) throw new Error("认领人姓名不能为空");
  await executionKernel.execute({ intent: "CLAIM_CUSTOMER", parameters: { customerId, ownerName } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/customers/pool");
  revalidatePath("/customers");
}

export async function returnToPool(customerId: number, reason: string = "manual") {
  await executionKernel.execute({ intent: "RELEASE_CUSTOMER", parameters: { customerId, reason } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/customers/pool");
  revalidatePath("/customers");
}

export async function autoReturnInactiveCustomers(days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const customers = await prisma.customer.findMany({
    where: {
      ownerId: { not: null },
      followUps: { none: { followUpDate: { gte: cutoffDate } } },
    },
    include: { followUps: { orderBy: { followUpDate: "desc" }, take: 1 } },
  });
  let returnedCount = 0;
  for (const customer of customers) {
    const lastFollowUp = customer.followUps[0];
    if (!lastFollowUp || new Date(lastFollowUp.followUpDate) < cutoffDate) {
      await executionKernel.execute({ intent: "RELEASE_CUSTOMER", parameters: { customerId: customer.id, reason: "auto_inactive" } }, { sessionId: SESSION, actorId: "web-action" });
      returnedCount++;
    }
  }
  revalidatePath("/customers/pool");
  revalidatePath("/customers");
  return returnedCount;
}

export async function addCustomerActivity(customerId: number, formData: FormData) {
  const type = (formData.get("type") as string) || "note";
  const content = formData.get("content") as string;
  if (!content) return { success: false, error: "跟进内容不能为空" };
  const result = await executionKernel.execute({ intent: "ADD_CUSTOMER_ACTIVITY", parameters: { data: { customerId, type, content } } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath(`/customers/${customerId}`);
  return { success: result.success, activity: result.data?.entity };
}

export async function getDormantCustomers() {
  const customers = await prisma.customer.findMany({
    include: { followUps: { orderBy: { followUpDate: "desc" }, take: 1 } },
  });
  const now = new Date();
  return customers
    .map((c) => {
      const lastFollowUp = c.followUps[0]?.followUpDate || null;
      const daysSince = lastFollowUp ? Math.floor((now.getTime() - new Date(lastFollowUp).getTime()) / (1000 * 60 * 60 * 24)) : 999;
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
  try {
    const [contacts, quotes, orders, tasks, followUps, emails, projects, customValues] = await Promise.all([
      prisma.contact.count({ where: { customerId: id } }),
      prisma.quote.count({ where: { customerId: id } }),
      prisma.order.count({ where: { customerId: id } }),
      prisma.task.count({ where: { customerId: id } }),
      prisma.followUp.count({ where: { customerId: id } }),
      prisma.emailMessage.count({ where: { customerId: id } }),
      prisma.project.count({ where: { customerId: id } }),
      prisma.customFieldValue.count({ where: { entityType: "CUSTOMER", entityId: id } }),
    ]);
    const hasRelations = contacts + quotes + orders + tasks + followUps + emails + projects + customValues > 0;
    if (hasRelations) return { success: false, error: "该客户存在关联数据，无法删除。请使用归档功能。", code: "CUSTOMER_HAS_RELATIONS" };
    const result = await executionKernel.execute({ intent: "DELETE_CUSTOMER", parameters: { customerId: id } }, { sessionId: SESSION, actorId: "web-action" });
    revalidatePath("/customers");
    return result.success ? { success: true, message: "客户已删除" } : { success: false, error: result.message };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "删除失败，请稍后重试" };
  }
}

export async function archiveCustomer(customerId: number) {
  const result = await executionKernel.execute({ intent: "ARCHIVE_CUSTOMER", parameters: { customerId } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: result.success, customer: result.data?.entity };
}

export async function restoreCustomer(customerId: number) {
  const result = await executionKernel.execute({ intent: "RESTORE_CUSTOMER", parameters: { customerId } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: result.success, customer: result.data?.entity };
}

export async function setPrimaryContact(contactId: number, customerId: number) {
  const result = await executionKernel.execute({ intent: "SET_PRIMARY_CONTACT", parameters: { customerFlowPlan: undefined, contactId, customerId } }, { sessionId: SESSION, actorId: "web-action" });
  return result.success ? { success: true } : { success: false, error: result.message };
}

export async function addContactSocialProfile(data: {
  contactId: number;
  platform: string;
  account: string;
  profileUrl?: string;
  isPrimary?: boolean;
}) {
  const result = await executionKernel.execute({
    intent: "CREATE_CONTACT_SOCIAL_PROFILE",
    parameters: { data: { contactId: data.contactId, platform: data.platform, account: data.account, profileUrl: data.profileUrl || null, isPrimary: data.isPrimary || false } },
  }, { sessionId: SESSION, actorId: "web-action" });
  return { success: result.success, profile: result.data?.entity };
}

export async function deleteContactSocialProfile(profileId: number) {
  await executionKernel.execute({ intent: "DELETE_CONTACT_SOCIAL_PROFILE", parameters: { contactSocialProfileId: profileId } }, { sessionId: SESSION, actorId: "web-action" });
  return { success: true };
}

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
  const result = await executionKernel.execute({
    intent: "CREATE_CUSTOM_FIELD_DEFINITION",
    parameters: { data: { entityType: data.entityType, key: data.key, label: data.label, fieldType: data.fieldType || "TEXT", description: data.description || null, isRequired: data.isRequired || false, options: data.options || null } },
  }, { sessionId: SESSION, actorId: "web-action" });
  return { success: result.success, definition: result.data?.entity };
}

export async function updateCustomFieldDefinition(id: number, data: any) {
  const result = await executionKernel.execute({ intent: "UPDATE_CUSTOM_FIELD_DEFINITION", parameters: { customFieldDefinitionId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  return { success: result.success, definition: result.data?.entity };
}

export async function deleteCustomFieldDefinition(id: number) {
  await executionKernel.execute({ intent: "DELETE_CUSTOM_FIELD_DEFINITION", parameters: { customFieldDefinitionId: id } }, { sessionId: SESSION, actorId: "web-action" });
  return { success: true };
}

export async function setCustomFieldValue(data: {
  fieldDefinitionId: number;
  entityType: string;
  entityId: number;
  value: string;
}) {
  const result = await executionKernel.execute({ intent: "SET_CUSTOM_FIELD_VALUE", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  return { success: result.success, fieldValue: result.data?.fieldValue };
}

export async function getCustomFieldValues(entityType: string, entityId: number) {
  return prisma.customFieldValue.findMany({
    where: { entityType, entityId },
    include: { fieldDefinition: true },
  });
}
