import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { getLocalUserId, getLocalWorkspaceId } from "@/lib/local-context";
import { generateQuoteNo } from "@/lib/format";
import {
  acceptQuoteService,
  createOrderService,
  createQuoteService,
  quoteToOrderService,
  sendQuoteService,
  updateOrderService,
  updateQuoteService,
  type QuoteOrderPlan,
} from "@/lib/services/quote-order-flow-service";
import {
  createContactService,
  createCustomerService,
  convertLeadToCustomerService,
  setPrimaryContactService,
  updateContactService,
  updateCustomerService,
  validateConvertLeadToCustomerPlan,
  validateSetPrimaryContactPlan,
} from "@/lib/services/customer-flow-service";

function generateOrderNo(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `O-${dateStr}-${random}`;
}

export type KernelServiceResult = {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  stateBefore?: string | null;
  stateAfter?: string | null;
  data?: Record<string, any>;
};

export async function executeDashboardCrmWrite(action: {
  actionType: string;
  entityId?: number;
  payload: Record<string, any>;
}, context?: { actorId?: string; messageId?: string; chatId?: string }): Promise<KernelServiceResult> {
  const planned = await executeValidatedPlanIfPresent(action, context);
  if (planned) return planned;

  switch (action.actionType) {
    case "CREATE_ORDER":
      return createOrder(action.payload.data || action.payload);
    case "UPDATE_ORDER":
      return updateOrder(action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "DELETE_ORDER":
      return deleteOrder(action.entityId);
    case "UPDATE_ORDER_STATUS":
      return updateOrderStatus(action.entityId, action.payload.status || action.payload.orderStatus);
    case "RECALCULATE_ORDER_TOTALS":
      return recalculateOrderTotals(action.entityId);
    case "CONVERT_QUOTE_TO_ORDER":
      return convertQuoteToOrder(action.entityId || Number(action.payload.quoteId), context);
    case "CREATE_QUOTE":
      return createQuote(action.payload.data || action.payload);
    case "UPDATE_QUOTE":
      return updateQuote(action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "DELETE_QUOTE":
      return deleteQuote(action.entityId);
    case "UPDATE_QUOTE_STATUS":
      return updateQuoteStatus(action.entityId, action.payload.status);
    case "RECALCULATE_QUOTE_TOTALS":
      return recalculateQuoteTotals(action.entityId);
    case "CREATE_LEAD":
      return createLead(action.payload.data || action.payload);
    case "UPDATE_LEAD":
      return updateLead(action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "CONVERT_LEAD_TO_CUSTOMER":
      return convertLeadToCustomer(action.entityId || Number(action.payload.leadId), context);
    case "DELETE_LEAD":
      return deleteLead(action.entityId);
    case "UPDATE_LEAD_STATUS":
      return updateLeadStatus(action.entityId, action.payload.status);
    case "UPDATE_LEAD_OWNER":
      return updateLeadOwner(action.entityId, action.payload.ownerName);
    case "ADD_LEAD_ACTIVITY":
      return addLeadActivity(action.entityId, action.payload.type, action.payload.content);
    case "CREATE_TASK":
      return createModel("task", "Task", action.payload.data || action.payload);
    case "UPDATE_TASK":
      return updateModel("task", "Task", action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "DELETE_TASK":
      return deleteModel("task", "Task", action.entityId);
    case "COMPLETE_TASK":
      return updateModel("task", "Task", action.entityId, { status: "COMPLETED", completedAt: new Date() });
    case "CREATE_CONTACT":
      return createModel("contact", "Contact", action.payload.data || action.payload);
    case "UPDATE_CONTACT":
      return updateModel("contact", "Contact", action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "DELETE_CONTACT":
      return deleteModel("contact", "Contact", action.entityId);
    case "SET_PRIMARY_CONTACT":
      return setPrimaryContact(action.payload.customerId, action.payload.contactId, context);
    case "CREATE_CUSTOMER":
      return createModel("customer", "Customer", { ...(action.payload.data || action.payload), tenantId: (action.payload.data || action.payload).tenantId ?? getLocalWorkspaceId() });
    case "UPDATE_CUSTOMER":
      return updateModel("customer", "Customer", action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "DELETE_CUSTOMER":
      return deleteModel("customer", "Customer", action.entityId);
    case "CLAIM_CUSTOMER":
      return claimCustomer(action.entityId, action.payload.ownerName);
    case "RELEASE_CUSTOMER":
      return releaseCustomer(action.entityId, action.payload.reason);
    case "ARCHIVE_CUSTOMER":
      return updateModel("customer", "Customer", action.entityId, { isArchived: true, archivedAt: new Date() });
    case "RESTORE_CUSTOMER":
      return updateModel("customer", "Customer", action.entityId, { isArchived: false, archivedAt: null });
    case "ADD_CUSTOMER_ACTIVITY":
      return createModel("customerActivity", "CustomerActivity", action.payload.data || action.payload);
    case "CREATE_CONTACT_SOCIAL_PROFILE":
      return createModel("contactSocialProfile", "ContactSocialProfile", action.payload.data || action.payload);
    case "DELETE_CONTACT_SOCIAL_PROFILE":
      return deleteModel("contactSocialProfile", "ContactSocialProfile", action.entityId);
    case "CREATE_CUSTOM_FIELD_DEFINITION":
      return createModel("customFieldDefinition", "CustomFieldDefinition", action.payload.data || action.payload);
    case "UPDATE_CUSTOM_FIELD_DEFINITION":
      return updateModel("customFieldDefinition", "CustomFieldDefinition", action.entityId, action.payload.data || action.payload);
    case "DELETE_CUSTOM_FIELD_DEFINITION":
      return updateModel("customFieldDefinition", "CustomFieldDefinition", action.entityId, { isActive: false });
    case "SET_CUSTOM_FIELD_VALUE":
      return setCustomFieldValue(action.payload.data || action.payload);
    case "CREATE_PROJECT":
      return createModel("project", "Project", action.payload.data || action.payload);
    case "UPDATE_PROJECT":
      return updateModel("project", "Project", action.entityId, action.payload.data || action.payload.changes || action.payload);
    case "DELETE_PROJECT":
      return deleteModel("project", "Project", action.entityId);
    case "UPDATE_PROJECT_STATUS":
      return updateModel("project", "Project", action.entityId, { status: action.payload.status });
    case "CREATE_PRODUCT":
      return createModel("product", "Product", action.payload.data || action.payload);
    case "UPDATE_PRODUCT":
      return updateModel("product", "Product", action.entityId, action.payload.data || action.payload);
    case "DELETE_PRODUCT":
      return deleteModel("product", "Product", action.entityId);
    case "CREATE_FOLLOW_UP":
      return createFollowUp(action.payload.data || action.payload);
    case "UPDATE_FOLLOW_UP":
      return updateModel("followUp", "FollowUp", action.entityId, action.payload.data || action.payload);
    case "DELETE_FOLLOW_UP":
      return deleteModel("followUp", "FollowUp", action.entityId);
    case "CREATE_TEMPLATE":
      return createModel("followUpTemplate", "FollowUpTemplate", action.payload.data || action.payload);
    case "UPDATE_TEMPLATE":
      return updateModel("followUpTemplate", "FollowUpTemplate", action.entityId, action.payload.data || action.payload);
    case "DELETE_TEMPLATE":
      return deleteModel("followUpTemplate", "FollowUpTemplate", action.entityId);
    case "CREATE_CALENDAR_EVENT":
      return createModel("calendarEvent", "CalendarEvent", action.payload.data || action.payload);
    case "UPDATE_CALENDAR_EVENT":
      return updateModel("calendarEvent", "CalendarEvent", action.entityId, action.payload.data || action.payload);
    case "DELETE_CALENDAR_EVENT":
      return deleteModel("calendarEvent", "CalendarEvent", action.entityId);
    case "COMPLETE_CALENDAR_EVENT":
      return updateModel("calendarEvent", "CalendarEvent", action.entityId, { isCompleted: true });
    case "CREATE_DOCUMENT":
      return createModel("document", "Document", action.payload.data || action.payload);
    case "UPDATE_DOCUMENT":
      return updateModel("document", "Document", action.entityId, action.payload.data || action.payload);
    case "DELETE_DOCUMENT":
      return deleteModel("document", "Document", action.entityId);
    case "CREATE_BUSINESS_LINE":
      return createModel("businessLine", "BusinessLine", action.payload.data || action.payload);
    case "UPDATE_BUSINESS_LINE":
      return updateModel("businessLine", "BusinessLine", action.entityId, action.payload.data || action.payload);
    case "DELETE_BUSINESS_LINE":
      return deleteModel("businessLine", "BusinessLine", action.entityId);
    case "UPSERT_SALES_GOAL":
      return upsertSalesGoal(action.payload.data || action.payload);
    case "UPDATE_SALES_GOAL":
      return updateModel("salesGoal", "SalesGoal", action.entityId, action.payload.data || action.payload);
    case "CREATE_QUOTE_ITEM":
      return createModel("quoteItem", "QuoteItem", action.payload.data || action.payload);
    case "UPDATE_QUOTE_ITEM":
      return updateModel("quoteItem", "QuoteItem", action.entityId, action.payload.data || action.payload);
    case "DELETE_QUOTE_ITEM":
      return deleteModel("quoteItem", "QuoteItem", action.entityId);
    case "CREATE_ORDER_ITEM":
      return createModel("orderItem", "OrderItem", action.payload.data || action.payload);
    case "UPDATE_ORDER_ITEM":
      return updateModel("orderItem", "OrderItem", action.entityId, action.payload.data || action.payload);
    case "DELETE_ORDER_ITEM":
      return deleteModel("orderItem", "OrderItem", action.entityId);
    case "CREATE_CUSTOMER_LIST_VIEW":
      return createModel("customerListView", "CustomerListView", action.payload.data || action.payload);
    case "UPDATE_CUSTOMER_LIST_VIEW":
      return updateModel("customerListView", "CustomerListView", action.entityId, action.payload.data || action.payload);
    case "DELETE_CUSTOMER_LIST_VIEW":
      return deleteModel("customerListView", "CustomerListView", action.entityId);
    case "DUPLICATE_CUSTOMER_LIST_VIEW":
      return duplicateListView("customerListView", "CustomerListView", action.entityId, action.payload.name);
    case "SET_DEFAULT_CUSTOMER_LIST_VIEW":
      return setDefaultListView("customerListView", "CustomerListView", action.entityId);
    case "CREATE_ORDER_LIST_VIEW":
      return createModel("orderListView", "OrderListView", action.payload.data || action.payload);
    case "UPDATE_ORDER_LIST_VIEW":
      return updateModel("orderListView", "OrderListView", action.entityId, action.payload.data || action.payload);
    case "DELETE_ORDER_LIST_VIEW":
      return deleteModel("orderListView", "OrderListView", action.entityId);
    case "SET_DEFAULT_ORDER_LIST_VIEW":
      return setDefaultListView("orderListView", "OrderListView", action.entityId);
    case "CREATE_EXTERNAL_SOURCE":
      return createModel("externalSource", "ExternalSource", action.payload.data || action.payload);
    case "UPDATE_EXTERNAL_SOURCE":
      return updateModel("externalSource", "ExternalSource", action.entityId, action.payload.data || action.payload);
    case "DELETE_EXTERNAL_SOURCE":
      return deleteModel("externalSource", "ExternalSource", action.entityId);
    case "TOGGLE_EXTERNAL_SOURCE_ACTIVE":
      return updateModel("externalSource", "ExternalSource", action.entityId, { isActive: !!action.payload.isActive });
    case "REGENERATE_EXTERNAL_SOURCE_API_KEY":
      return updateModel("externalSource", "ExternalSource", action.entityId, { apiKeyHash: action.payload.apiKeyHash });
    case "CREATE_INVOICE":
      return createModel("invoice", "Invoice", action.payload.data || action.payload);
    case "UPDATE_INVOICE":
      return updateModel("invoice", "Invoice", action.entityId, action.payload.data || action.payload);
    case "DELETE_INVOICE":
      return deleteInvoice(action.entityId);
    case "RECORD_PAYMENT":
      return recordPayment(action.payload.data || action.payload);
    case "DELETE_AI_ANALYSIS":
      return deleteModel("aIAnalysis", "AIAnalysis", action.entityId);
    default:
      return { success: false, message: `UNSUPPORTED_KERNEL_ACTION:${action.actionType}` };
  }
}

async function executeValidatedPlanIfPresent(
  action: { actionType: string; entityId?: number; payload: Record<string, any> },
  context?: { actorId?: string; messageId?: string; chatId?: string },
): Promise<KernelServiceResult | null> {
  const actorId = context?.actorId || "kernel";
  const messageId = context?.messageId;
  const chatId = context?.chatId;
  const quotePlan = action.payload.quoteOrderPlan as QuoteOrderPlan | undefined;
  if (quotePlan) {
    if (action.actionType === "CREATE_QUOTE") return createQuoteService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "UPDATE_QUOTE") return updateQuoteService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "SEND_QUOTE") return sendQuoteService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "ACCEPT_QUOTE") return acceptQuoteService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "CONVERT_QUOTE_TO_ORDER") return quoteToOrderService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "QUOTE_TO_ORDER") return quoteToOrderService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "CREATE_ORDER") return createOrderService(quotePlan, actorId, messageId, chatId);
    if (action.actionType === "UPDATE_ORDER") return updateOrderService(quotePlan, actorId, messageId, chatId);
  }

  const customerPlan = action.payload.customerFlowPlan;
  if (customerPlan) {
    if (action.actionType === "CONVERT_LEAD_TO_CUSTOMER") return convertLeadToCustomerService(customerPlan, actorId, messageId);
    if (action.actionType === "CREATE_CUSTOMER") return createCustomerService(customerPlan, actorId, messageId);
    if (action.actionType === "UPDATE_CUSTOMER") return updateCustomerService(customerPlan, actorId, messageId);
    if (action.actionType === "CREATE_CONTACT") return createContactService(customerPlan, actorId, messageId);
    if (action.actionType === "UPDATE_CONTACT") return updateContactService(customerPlan, actorId, messageId);
    if (action.actionType === "SET_PRIMARY_CONTACT") return setPrimaryContactService(customerPlan, actorId, messageId);
  }

  return null;
}

function requireId(id?: number): number {
  if (!id) throw new Error("KERNEL_ENTITY_ID_REQUIRED");
  return id;
}

async function createOrder(data: Record<string, any>): Promise<KernelServiceResult> {
  if (!data.customerId) throw new Error("CUSTOMER_REQUIRED");
  const order = await prisma.order.create({
    data: {
      ...data,
      orderNo: data.orderNo || generateOrderNo(),
      tenantId: data.tenantId ?? getLocalWorkspaceId(),
    } as any,
  });
  await createActivityLog({
    action: "创建",
    entityType: "订单",
    entityId: order.id,
    entityName: order.orderNo,
    description: `创建订单: ${order.orderNo}`,
  });
  return { success: true, message: "ORDER_CREATED", entityType: "Order", entityId: order.id, entityName: order.orderNo, stateAfter: order.orderStatus };
}

async function updateOrder(id: number | undefined, data: Record<string, any>): Promise<KernelServiceResult> {
  const orderId = requireId(id);
  const before = await prisma.order.findUnique({ where: { id: orderId } });
  if (!before) return { success: false, message: "ORDER_NOT_FOUND", entityType: "Order", entityId: orderId };
  const order = await prisma.order.update({ where: { id: orderId }, data });
  await createActivityLog({
    action: "更新",
    entityType: "订单",
    entityId: orderId,
    entityName: order.orderNo,
    description: "更新订单",
  });
  return { success: true, message: "ORDER_UPDATED", entityType: "Order", entityId: order.id, entityName: order.orderNo, stateBefore: before.orderStatus, stateAfter: order.orderStatus };
}

async function deleteOrder(id: number | undefined): Promise<KernelServiceResult> {
  const orderId = requireId(id);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, message: "ORDER_NOT_FOUND", entityType: "Order", entityId: orderId };
  await prisma.order.delete({ where: { id: orderId } });
  await createActivityLog({
    action: "删除",
    entityType: "订单",
    entityId: orderId,
    entityName: order.orderNo,
    description: `删除订单: ${order.orderNo}`,
  });
  return { success: true, message: "ORDER_DELETED", entityType: "Order", entityId: orderId, entityName: order.orderNo, stateBefore: order.orderStatus };
}

async function updateOrderStatus(id: number | undefined, status: string): Promise<KernelServiceResult> {
  const orderId = requireId(id);
  const before = await prisma.order.findUnique({ where: { id: orderId } });
  if (!before) return { success: false, message: "ORDER_NOT_FOUND", entityType: "Order", entityId: orderId };
  const order = await prisma.order.update({ where: { id: orderId }, data: { orderStatus: status as any } });
  if (status === "CONFIRMED") {
    try {
      const { emit } = await import("@/lib/events/bus");
      await emit({ type: "order.confirmed", entityId: orderId, entityType: "Order" });
    } catch (error) {
      console.error("order.confirmed event emit failed:", error);
    }
  }
  return { success: true, message: "ORDER_STATUS_UPDATED", entityType: "Order", entityId: order.id, entityName: order.orderNo, stateBefore: before.orderStatus, stateAfter: order.orderStatus };
}

async function recalculateOrderTotals(id: number | undefined): Promise<KernelServiceResult> {
  const orderId = requireId(id);
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const totalAmount = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const order = await prisma.order.update({ where: { id: orderId }, data: { totalAmount } });
  return { success: true, message: "ORDER_TOTALS_RECALCULATED", entityType: "Order", entityId: orderId, entityName: order.orderNo, data: { totalAmount } };
}

async function convertQuoteToOrder(quoteId: number | undefined, context?: { actorId?: string; messageId?: string; chatId?: string }): Promise<KernelServiceResult> {
  const id = requireId(quoteId);
  const plan: QuoteOrderPlan = {
    intent: "CONVERT_QUOTE_TO_ORDER",
    entityType: "Order",
    entityId: id,
    validatedParameters: { quoteId: id, originalMessageId: context?.messageId },
    beforeValues: {},
    calculatedTotals: {},
    summary: "Convert quote to order",
  };
  const result = await quoteToOrderService(plan, context?.actorId || "web-action", context?.messageId, context?.chatId);
  return { ...result, stateAfter: result.success ? "CREATED" : null };
}

async function createQuote(data: Record<string, any>): Promise<KernelServiceResult> {
  const quote = await prisma.quote.create({
    data: {
      ...data,
      quoteNo: data.quoteNo || generateQuoteNo(),
      tenantId: data.tenantId ?? getLocalWorkspaceId(),
    },
  });
  return { success: true, message: "QUOTE_CREATED", entityType: "Quote", entityId: quote.id, entityName: quote.quoteNo, stateAfter: quote.status };
}

async function updateQuote(id: number | undefined, data: Record<string, any>): Promise<KernelServiceResult> {
  const quoteId = requireId(id);
  const before = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!before) return { success: false, message: "QUOTE_NOT_FOUND", entityType: "Quote", entityId: quoteId };
  const quote = await prisma.quote.update({ where: { id: quoteId }, data });
  return { success: true, message: "QUOTE_UPDATED", entityType: "Quote", entityId: quote.id, entityName: quote.quoteNo, stateBefore: before.status, stateAfter: quote.status };
}

async function deleteQuote(id: number | undefined): Promise<KernelServiceResult> {
  const quoteId = requireId(id);
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { success: false, message: "QUOTE_NOT_FOUND", entityType: "Quote", entityId: quoteId };
  await prisma.quote.delete({ where: { id: quoteId } });
  return { success: true, message: "QUOTE_DELETED", entityType: "Quote", entityId: quoteId, entityName: quote.quoteNo, stateBefore: quote.status };
}

async function updateQuoteStatus(id: number | undefined, status: string): Promise<KernelServiceResult> {
  const quoteId = requireId(id);
  const before = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!before) return { success: false, message: "QUOTE_NOT_FOUND", entityType: "Quote", entityId: quoteId };
  const quote = await prisma.quote.update({ where: { id: quoteId }, data: { status: status as any } });
  if (status === "SENT") {
    try {
      const { emit } = await import("@/lib/events/bus");
      await emit({ type: "quote.sent", entityId: quoteId, entityType: "Quote" });
    } catch {}
  }
  return { success: true, message: "QUOTE_STATUS_UPDATED", entityType: "Quote", entityId: quote.id, entityName: quote.quoteNo, stateBefore: before.status, stateAfter: quote.status };
}

async function recalculateQuoteTotals(id: number | undefined): Promise<KernelServiceResult> {
  const quoteId = requireId(id);
  const items = await prisma.quoteItem.findMany({ where: { quoteId } });
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  const discount = quote ? Number(quote.discountAmount) : 0;
  const totalAmount = subtotal - discount;
  const updated = await prisma.quote.update({ where: { id: quoteId }, data: { totalPrice: totalAmount } });
  return { success: true, message: "QUOTE_TOTALS_RECALCULATED", entityType: "Quote", entityId: quoteId, entityName: updated.quoteNo, data: { totalAmount } };
}

async function createLead(data: Record<string, any>): Promise<KernelServiceResult> {
  const businessLineId = data.businessLineId || (await prisma.businessLine.findFirst({ orderBy: { id: "asc" } }))?.id;
  const normalized = {
    ...data,
    company: data.company || data.exactName || data.keyword,
    contactName: data.contactName,
    requirement: data.requirement || data.followUpContent || null,
    status: data.status || "NEW",
    source: data.source || "MANUAL_OUTREACH",
    temperature: data.temperature || "WARM",
    grade: data.grade || "C",
    currency: data.currency || "USD",
    businessLineId,
    tenantId: data.tenantId ?? getLocalWorkspaceId(),
  };
  if (!normalized.company || !normalized.contactName || !normalized.businessLineId) throw new Error("LEAD_REQUIRED_FIELDS_MISSING");
  const lead = await prisma.lead.create({ data: normalized as any });
  await createActivityLog({
    action: "创建",
    entityType: "线索",
    entityId: lead.id,
    entityName: lead.company,
    description: `创建线索: ${lead.company} - ${lead.contactName}`,
  });
  try {
    const { emit } = await import("@/lib/events/bus");
    await emit({ type: "lead.created", entityId: lead.id, entityType: "Lead" });
  } catch {}
  return { success: true, message: "LEAD_CREATED", entityType: "Lead", entityId: lead.id, entityName: lead.company, stateAfter: lead.status };
}

async function updateLead(id: number | undefined, data: Record<string, any>): Promise<KernelServiceResult> {
  const leadId = requireId(id);
  const before = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!before) return { success: false, message: "LEAD_NOT_FOUND", entityType: "Lead", entityId: leadId };
  const lead = await prisma.lead.update({ where: { id: leadId }, data });
  await createActivityLog({
    action: "更新",
    entityType: "线索",
    entityId: leadId,
    entityName: lead.company,
    description: `更新线索: ${lead.company}`,
  });
  return { success: true, message: "LEAD_UPDATED", entityType: "Lead", entityId: lead.id, entityName: lead.company, stateBefore: before.status, stateAfter: lead.status };
}

async function convertLeadToCustomer(id: number | undefined, context?: { actorId?: string; messageId?: string }): Promise<KernelServiceResult> {
  const leadId = requireId(id);
  const validation = await validateConvertLeadToCustomerPlan({ id: leadId }, context?.messageId || "kernel-web-action");
  if (!validation.success || !validation.plan) return { success: false, message: validation.message, entityType: "Lead", entityId: leadId };
  return convertLeadToCustomerService(validation.plan, context?.actorId || "web-action", context?.messageId);
}

async function deleteLead(id: number | undefined): Promise<KernelServiceResult> {
  const leadId = requireId(id);
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { followUps: true, quotes: true, tasks: true, projects: true } });
  if (!lead) return { success: false, message: "LEAD_NOT_FOUND", entityType: "Lead", entityId: leadId };
  const autoTasks = lead.tasks.filter((task) => task.type === "FOLLOW_UP" && task.title.startsWith("跟进新线索"));
  const manualTasks = lead.tasks.filter((task) => !autoTasks.some((autoTask) => autoTask.id === task.id));
  if (lead.followUps.length > 0 || lead.quotes.length > 0 || manualTasks.length > 0 || lead.projects.length > 0) {
    return { success: false, message: "LEAD_HAS_RELATED_DATA", entityType: "Lead", entityId: leadId };
  }
  if (autoTasks.length > 0) {
    await prisma.task.deleteMany({ where: { id: { in: autoTasks.map((task) => task.id) } } });
  }
  await prisma.lead.delete({ where: { id: leadId } });
  await createActivityLog({
    action: "删除",
    entityType: "线索",
    entityId: leadId,
    entityName: lead.company,
    description: `删除线索: ${lead.company}`,
  });
  return { success: true, message: "LEAD_DELETED", entityType: "Lead", entityId: leadId, entityName: lead.company, stateBefore: lead.status };
}

async function updateLeadStatus(id: number | undefined, status: string): Promise<KernelServiceResult> {
  const leadId = requireId(id);
  const before = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!before) return { success: false, message: "LEAD_NOT_FOUND", entityType: "Lead", entityId: leadId };
  const lead = await prisma.lead.update({ where: { id: leadId }, data: { status: status as any } });
  return { success: true, message: "LEAD_STATUS_UPDATED", entityType: "Lead", entityId: lead.id, entityName: lead.company, stateBefore: before.status, stateAfter: lead.status };
}

async function updateLeadOwner(id: number | undefined, ownerName: string): Promise<KernelServiceResult> {
  const leadId = requireId(id);
  const lead = await prisma.lead.update({ where: { id: leadId }, data: { ownerName: ownerName || null } });
  return { success: true, message: "LEAD_OWNER_UPDATED", entityType: "Lead", entityId: lead.id, entityName: lead.company, stateAfter: lead.status };
}

async function addLeadActivity(id: number | undefined, type: string, content: string): Promise<KernelServiceResult> {
  const leadId = requireId(id);
  if (!content) return { success: false, message: "LEAD_ACTIVITY_CONTENT_REQUIRED", entityType: "Lead", entityId: leadId };
  const activity = await prisma.leadActivity.create({ data: { leadId, type: type || "note", content } });
  return { success: true, message: "LEAD_ACTIVITY_CREATED", entityType: "Lead", entityId: leadId, data: { activity } };
}

async function createModel(model: string, entityType: string, data: Record<string, any>): Promise<KernelServiceResult> {
  const entity = await (prisma as any)[model].create({ data });
  return { success: true, message: `${entityType.toUpperCase()}_CREATED`, entityType, entityId: entity.id, entityName: entity.name || entity.company || entity.title || entity.orderNo || entity.quoteNo || entity.invoiceNo, data: { entity } };
}

async function updateModel(model: string, entityType: string, id: number | undefined, data: Record<string, any>): Promise<KernelServiceResult> {
  const entityId = requireId(id);
  const entity = await (prisma as any)[model].update({ where: { id: entityId }, data });
  return { success: true, message: `${entityType.toUpperCase()}_UPDATED`, entityType, entityId, entityName: entity.name || entity.company || entity.title || entity.orderNo || entity.quoteNo || entity.invoiceNo, data: { entity } };
}

async function deleteModel(model: string, entityType: string, id: number | undefined): Promise<KernelServiceResult> {
  const entityId = requireId(id);
  const entity = await (prisma as any)[model].delete({ where: { id: entityId } });
  return { success: true, message: `${entityType.toUpperCase()}_DELETED`, entityType, entityId, data: { entity } };
}

async function claimCustomer(id: number | undefined, ownerName: string): Promise<KernelServiceResult> {
  const customerId = requireId(id);
  if (!ownerName) return { success: false, message: "OWNER_REQUIRED", entityType: "Customer", entityId: customerId };
  const ownerId = getLocalUserId();
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { ownerId, ownerName, poolEnteredAt: null, poolReason: null },
  });
  return { success: true, message: "CUSTOMER_CLAIMED", entityType: "Customer", entityId: customer.id, entityName: customer.company };
}

async function setPrimaryContact(
  customerId: number | undefined,
  contactId: number | undefined,
  context?: { actorId?: string; messageId?: string },
): Promise<KernelServiceResult> {
  const targetCustomerId = requireId(customerId);
  const targetContactId = requireId(contactId);
  const validation = await validateSetPrimaryContactPlan(
    { id: targetCustomerId },
    { id: targetContactId },
    context?.messageId || "kernel-web-action",
  );
  if (!validation.success || !validation.plan) {
    return { success: false, message: validation.message, entityType: "Contact", entityId: targetContactId };
  }
  const result = await setPrimaryContactService(validation.plan, context?.actorId || "web-action", context?.messageId);
  return {
    success: result.success,
    message: result.message,
    entityType: result.entityType,
    entityId: result.entityId,
    entityName: result.entityName,
  };
}

async function releaseCustomer(id: number | undefined, reason = "manual"): Promise<KernelServiceResult> {
  const customerId = requireId(id);
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { ownerId: null, ownerName: null, poolEnteredAt: new Date(), poolReason: reason },
  });
  return { success: true, message: "CUSTOMER_RELEASED", entityType: "Customer", entityId: customer.id, entityName: customer.company };
}

async function setCustomFieldValue(data: Record<string, any>): Promise<KernelServiceResult> {
  const fieldValue = await prisma.customFieldValue.upsert({
    where: {
      fieldDefinitionId_entityType_entityId: {
        fieldDefinitionId: data.fieldDefinitionId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    update: { value: data.value },
    create: data as any,
  });
  return { success: true, message: "CUSTOM_FIELD_VALUE_SET", entityType: "CustomFieldValue", entityId: fieldValue.id, data: { fieldValue } };
}

async function createFollowUp(data: Record<string, any>): Promise<KernelServiceResult> {
  const followUp = await prisma.followUp.create({ data: data as any });
  if (data.nextFollowUpDate) {
    await prisma.task.create({
      data: {
        title: "跟进任务",
        type: "FOLLOW_UP",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: data.nextFollowUpDate,
        leadId: data.leadId,
        customerId: data.customerId,
        projectId: data.projectId,
        tenantId: getLocalWorkspaceId(),
      },
    });
  }
  return { success: true, message: "FOLLOW_UP_CREATED", entityType: "FollowUp", entityId: followUp.id, data: { followUp } };
}

async function upsertSalesGoal(data: Record<string, any>): Promise<KernelServiceResult> {
  const goal = await prisma.salesGoal.upsert({
    where: { year_month_metricType: { year: data.year, month: data.month, metricType: data.metricType } },
    update: data,
    create: data as any,
  });
  return { success: true, message: "SALES_GOAL_UPSERTED", entityType: "SalesGoal", entityId: goal.id, data: { goal } };
}

async function duplicateListView(model: string, entityType: string, id: number | undefined, name?: string): Promise<KernelServiceResult> {
  const entityId = requireId(id);
  const source = await (prisma as any)[model].findUnique({ where: { id: entityId } });
  if (!source) return { success: false, message: `${entityType.toUpperCase()}_NOT_FOUND`, entityType, entityId };
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = source;
  const entity = await (prisma as any)[model].create({ data: { ...copy, name: name || `${source.name} Copy`, isDefault: false } });
  return { success: true, message: `${entityType.toUpperCase()}_DUPLICATED`, entityType, entityId: entity.id, data: { entity } };
}

async function setDefaultListView(model: string, entityType: string, id: number | undefined): Promise<KernelServiceResult> {
  const entityId = requireId(id);
  await (prisma as any)[model].updateMany({ data: { isDefault: false } });
  const entity = await (prisma as any)[model].update({ where: { id: entityId }, data: { isDefault: true } });
  return { success: true, message: `${entityType.toUpperCase()}_DEFAULT_SET`, entityType, entityId, data: { entity } };
}

async function deleteInvoice(id: number | undefined): Promise<KernelServiceResult> {
  const invoiceId = requireId(id);
  await prisma.payment.deleteMany({ where: { invoiceId } });
  const invoice = await prisma.invoice.delete({ where: { id: invoiceId } });
  return { success: true, message: "INVOICE_DELETED", entityType: "Invoice", entityId: invoiceId, entityName: invoice.invoiceNo };
}

async function recordPayment(data: Record<string, any>): Promise<KernelServiceResult> {
  const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId }, include: { payments: true } });
  if (!invoice) return { success: false, message: "INVOICE_NOT_FOUND", entityType: "Invoice", entityId: data.invoiceId };
  const payment = await prisma.payment.create({ data: data as any });
  const totalPaid = Number(invoice.payments.reduce((sum, item) => sum + Number(item.amount), 0)) + Number(data.amount);
  if (totalPaid >= Number(invoice.amount)) {
    await prisma.invoice.update({ where: { id: data.invoiceId }, data: { status: "PAID", paidAt: new Date() } });
  }
  return { success: true, message: "PAYMENT_RECORDED", entityType: "Payment", entityId: payment.id, data: { payment } };
}
