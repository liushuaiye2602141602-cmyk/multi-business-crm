import prisma from "@/lib/prisma";
import { getLocalWorkspaceId } from "@/lib/local-context";
import type { ParsedIntent } from "./feishu-parser";

type EntityReference = NonNullable<ParsedIntent["parameters"]["entityQuery"]>["entityReference"];

type ResolveResult<T> =
  | { kind: "none" }
  | { kind: "one"; entity: T; matchLevel?: MatchLevel }
  | { kind: "many"; entities: T[]; matchLevel?: MatchLevel };

type MatchLevel = "exact" | "prefix" | "fuzzy";

const LEAD_STATUS_MAP: Record<string, string> = {
  NEW: "新线索",
  CONTACTED: "已联系",
  REQUIREMENT_CONFIRMING: "需求确认中",
  QUOTING: "报价中",
  NEGOTIATING: "谈判中",
  QUALIFIED: "已确认有效",
  CONVERTED: "已转客户",
  WON: "已成交",
  LOST: "已丢失",
  DORMANT: "休眠",
};

const TASK_STATUS_MAP: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

const TASK_PRIORITY_MAP: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
};

const QUOTE_STATUS_MAP: Record<string, string> = {
  DRAFT: "草稿",
  SENT: "已发送",
  WAITING_FEEDBACK: "等待反馈",
  REVISED: "已修订",
  ACCEPTED: "已接受",
  CONVERTED: "已转订单",
  REJECTED: "已拒绝",
  EXPIRED: "已过期",
};

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING_CONFIRMATION: "待确认",
  CONFIRMED: "已确认",
  IN_PRODUCTION: "生产中",
  READY_TO_SHIP: "待发货",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export async function executeEntityDetailQuery(parsed: ParsedIntent): Promise<string> {
  try {
    const entityQuery = parsed.parameters.entityQuery;
    if (!entityQuery) {
      return "我无法确定您要查询的对象或字段，请补充公司名称和需要查看的信息。";
    }

    const tenantId = getLocalWorkspaceId();
    switch (parsed.intent) {
      case "QUERY_LEAD_DETAIL":
        return await queryLeadDetail(tenantId, entityQuery.entityReference, entityQuery.requestedFields);
      case "QUERY_CUSTOMER_DETAIL":
        return await queryCustomerDetail(tenantId, entityQuery.entityReference, entityQuery.requestedFields);
      case "QUERY_CONTACT_DETAIL":
        return await queryContactDetail(tenantId, entityQuery.entityReference, entityQuery.requestedFields);
      case "QUERY_CUSTOMER_CONTACTS":
        return await queryCustomerContacts(tenantId, entityQuery.entityReference);
      case "QUERY_TASK_DETAIL":
        return await queryTaskDetail(tenantId, entityQuery.entityReference, entityQuery.requestedFields);
      case "QUERY_QUOTE_DETAIL":
        return await queryQuoteDetail(tenantId, entityQuery.entityReference, entityQuery.requestedFields, entityQuery.relation || null);
      case "QUERY_ORDER_DETAIL":
        return await queryOrderDetail(tenantId, entityQuery.entityReference, entityQuery.requestedFields, entityQuery.relation || null);
      default:
        return "暂不支持该查询类型。";
    }
  } catch (error) {
    console.error("Feishu entity detail query failed:", error instanceof Error ? error.message : "Unknown query error");
    return safeQueryError();
  }
}

async function queryLeadDetail(tenantId: number, ref: EntityReference, fields: string[]) {
  const resolved = await resolveLeadFromDatabase(tenantId, ref);
  if (resolved.kind === "none") return `未找到线索“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildLeadCandidates(resolved.entities, resolved.matchLevel);

  const lead = resolved.entity as any;
  const useFields = fields.length ? fields : ["companyName", "contactName", "status", "budget", "currency", "nextFollowUpAt"];
  const lines = [lead.company || "线索详情"];
  for (const field of useFields) {
    const line = formatLeadField(field, lead);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function queryCustomerDetail(tenantId: number, ref: EntityReference, fields: string[]) {
  const resolved = await resolveCustomerFromDatabase(tenantId, ref);
  if (resolved.kind === "none") return `未找到客户“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildCustomerCandidates(resolved.entities);

  const customer = resolved.entity as any;
  const useFields = fields.length ? fields : ["companyName", "primaryContact", "stage", "phone", "email"];
  const lines = [customer.company || "客户详情"];
  for (const field of useFields) {
    const line = formatCustomerField(field, customer);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function queryContactDetail(tenantId: number, ref: EntityReference, fields: string[]) {
  const resolved = await resolveContactFromDatabase(tenantId, ref);
  if (resolved.kind === "none") return `未找到联系人“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildContactCandidates(resolved.entities);

  const contact = resolved.entity as any;
  const useFields = fields.length ? fields : ["name", "customer", "position", "department", "phone", "email", "whatsapp", "isPrimary"];
  const lines = [contact.name || "联系人详情"];
  for (const field of useFields) {
    const line = formatContactField(field, contact);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function queryCustomerContacts(tenantId: number, ref: EntityReference) {
  const resolved = await resolveCustomerFromDatabase(tenantId, ref);
  if (resolved.kind === "none") return `未找到客户“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildCustomerCandidates(resolved.entities);
  const customer = resolved.entity as any;
  const contacts = customer.contacts || [];
  if (!contacts.length) return `${customer.company}\n联系人：暂未填写`;
  return [
    customer.company,
    `联系人数量：${contacts.length}`,
    ...contacts.map((contact: any) => [
      `${contact.isPrimary ? "主联系人" : "联系人"}：${contact.name}`,
      `职位：${formatValue("position", contact.position || contact.jobTitle)}`,
      `电话：${formatValue("phone", contact.phone)}`,
      `邮箱：${formatValue("email", contact.email)}`,
      `WhatsApp：${formatValue("whatsapp", contact.whatsapp)}`,
    ].join("\n")),
  ].join("\n\n");
}

async function queryTaskDetail(tenantId: number, ref: EntityReference, fields: string[]) {
  const resolved = await resolveTaskFromDatabase(tenantId, ref);
  if (resolved.kind === "none") return `未找到任务“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildTaskCandidates(resolved.entities);

  const task = resolved.entity as any;
  const useFields = fields.length ? fields : ["title", "status", "priority", "dueAt"];
  const lines = [task.title || "任务详情"];
  for (const field of useFields) {
    const line = formatTaskField(field, task);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function queryQuoteDetail(tenantId: number, ref: EntityReference, fields: string[], relation: string | null) {
  if (!hasQuoteReference(ref)) return "请提供报价ID。";
  const resolved = await resolveQuoteFromDatabase(tenantId, ref, relation);
  if (resolved.kind === "none") return `未找到报价“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildQuoteCandidates(resolved.entities);

  const quote = resolved.entity as any;
  const useFields = fields.length ? fields : ["quoteNumber", "customer", "status", "currency", "total"];
  const lines = [quote.quoteNo || "报价详情"];
  for (const field of useFields) {
    const line = formatQuoteField(field, quote);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function queryOrderDetail(tenantId: number, ref: EntityReference, fields: string[], relation: string | null) {
  const resolved = await resolveOrderFromDatabase(tenantId, ref, relation);
  if (resolved.kind === "none") return `未找到订单“${referenceLabel(ref)}”。`;
  if (resolved.kind === "many") return buildOrderCandidates(resolved.entities);

  const order = resolved.entity as any;
  const useFields = fields.length ? fields : ["orderNumber", "customer", "status", "currency", "total"];
  const lines = [order.orderNo || "订单详情"];
  for (const field of useFields) {
    const line = formatOrderField(field, order);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

async function resolveLeadFromDatabase(tenantId: number, ref: EntityReference): Promise<ResolveResult<unknown>> {
  const whereTenant = { tenantId } as any;
  if (ref.id) {
    const lead = await prisma.lead.findFirst({ where: { ...whereTenant, id: Number(ref.id) }, include: leadInclude() });
    return lead ? { kind: "one", entity: lead } : { kind: "none" };
  }
  if (ref.email) {
    const leads = await prisma.lead.findMany({ where: { ...whereTenant, email: { equals: ref.email, mode: "insensitive" } }, include: leadInclude(), take: 2 });
    return resultFromList(leads);
  }
  if (ref.phone) {
    const leads = await prisma.lead.findMany({ where: { ...whereTenant, OR: [{ phone: ref.phone }, { whatsapp: ref.phone }] }, include: leadInclude(), take: 10 });
    return resultFromList(leads);
  }
  if (ref.name) {
    const exact = await prisma.lead.findMany({ where: { ...whereTenant, company: { equals: ref.name, mode: "insensitive" } }, include: leadInclude(), take: 10 });
    if (exact.length) return resultFromList(exact, "exact");
    const prefix = await prisma.lead.findMany({ where: { ...whereTenant, company: { startsWith: ref.name, mode: "insensitive" } }, include: leadInclude(), take: 10 });
    if (prefix.length) return resultFromList(prefix, "prefix");
    const fuzzy = await prisma.lead.findMany({ where: { ...whereTenant, company: { contains: ref.name, mode: "insensitive" } }, include: leadInclude(), take: 10 });
    return resultFromList(fuzzy, "fuzzy");
  }
  return { kind: "none" };
}

async function resolveCustomerFromDatabase(tenantId: number, ref: EntityReference): Promise<ResolveResult<unknown>> {
  const whereTenant = { tenantId } as any;
  const include = { contacts: true, quotes: true, orders: true, projects: true, followUps: { orderBy: { followUpDate: "desc" as const }, take: 1 } };
  if (ref.id) {
    const customer = await prisma.customer.findFirst({ where: { ...whereTenant, id: Number(ref.id) }, include });
    return customer ? { kind: "one", entity: customer } : { kind: "none" };
  }
  if (ref.email) {
    const customers = await prisma.customer.findMany({ where: { ...whereTenant, email: { equals: ref.email, mode: "insensitive" } }, include, take: 10 });
    return resultFromList(customers);
  }
  if (ref.phone) {
    const customers = await prisma.customer.findMany({ where: { ...whereTenant, OR: [{ phone: ref.phone }, { whatsapp: ref.phone }] }, include, take: 10 });
    return resultFromList(customers);
  }
  if (ref.name) {
    const exact = await prisma.customer.findMany({ where: { ...whereTenant, company: { equals: ref.name, mode: "insensitive" } }, include, take: 10 });
    if (exact.length) return resultFromList(exact);
    const fuzzy = await prisma.customer.findMany({ where: { ...whereTenant, company: { contains: ref.name, mode: "insensitive" } }, include, take: 10 });
    return resultFromList(fuzzy);
  }
  return { kind: "none" };
}

async function resolveContactFromDatabase(tenantId: number, ref: EntityReference): Promise<ResolveResult<unknown>> {
  const include = { customer: true };
  if (ref.id) {
    const contact = await prisma.contact.findFirst({ where: { id: Number(ref.id), customer: { tenantId } }, include });
    return contact ? { kind: "one", entity: contact } : { kind: "none" };
  }
  if (ref.email) {
    const contacts = await prisma.contact.findMany({ where: { email: { equals: ref.email, mode: "insensitive" }, customer: { tenantId } }, include, take: 10 });
    return resultFromList(contacts);
  }
  if (ref.phone) {
    const contacts = await prisma.contact.findMany({ where: { OR: [{ phone: ref.phone }, { whatsapp: ref.phone }], customer: { tenantId } }, include, take: 10 });
    return resultFromList(contacts);
  }
  if (ref.name) {
    const exact = await prisma.contact.findMany({ where: { name: { equals: ref.name, mode: "insensitive" }, customer: { tenantId } }, include, take: 10 });
    if (exact.length) return resultFromList(exact);
    const fuzzy = await prisma.contact.findMany({ where: { name: { contains: ref.name, mode: "insensitive" }, customer: { tenantId } }, include, take: 10 });
    return resultFromList(fuzzy);
  }
  return { kind: "none" };
}

async function resolveTaskFromDatabase(tenantId: number, ref: EntityReference): Promise<ResolveResult<unknown>> {
  const include = { lead: true, customer: true, project: true, quote: true, order: true };
  if (ref.id) {
    const task = await prisma.task.findFirst({ where: { tenantId, id: Number(ref.id) }, include });
    return task ? { kind: "one", entity: task } : { kind: "none" };
  }
  if (ref.name) {
    const exact = await prisma.task.findMany({ where: { tenantId, title: { equals: ref.name, mode: "insensitive" } }, include, take: 10 });
    if (exact.length) return resultFromList(exact);
    const fuzzy = await prisma.task.findMany({ where: { tenantId, title: { contains: ref.name, mode: "insensitive" } }, include, take: 10 });
    return resultFromList(fuzzy);
  }
  const tasks = await prisma.task.findMany({ where: { tenantId, status: { in: ["PENDING", "IN_PROGRESS"] } }, include, orderBy: { dueDate: "asc" }, take: 10 });
  return resultFromList(tasks);
}

async function resolveQuoteFromDatabase(tenantId: number, ref: EntityReference, relation: string | null): Promise<ResolveResult<unknown>> {
  const include = { customer: true, lead: true, items: true };
  if (ref.number) {
    const quote = await prisma.quote.findFirst({ where: { tenantId, quoteNo: { equals: ref.number, mode: "insensitive" } }, include });
    return quote ? { kind: "one", entity: quote } : { kind: "none" };
  }
  if (ref.id) {
    const quote = await prisma.quote.findFirst({ where: { tenantId, id: Number(ref.id) }, include });
    return quote ? { kind: "one", entity: quote } : { kind: "none" };
  }
  const name = ref.name || (ref as any).customerName || (ref as any).companyName;
  if (name) {
    const quotes = await prisma.quote.findMany({
      where: {
        tenantId,
        OR: [
          { quoteTitle: { contains: name, mode: "insensitive" } },
          { customer: { company: { contains: name, mode: "insensitive" } } },
          { lead: { company: { contains: name, mode: "insensitive" } } },
        ],
      },
      include,
      orderBy: { createdAt: "desc" },
      take: relation === "latest" ? 1 : 10,
    });
    return resultFromList(quotes);
  }
  return { kind: "none" };
}

function hasQuoteReference(ref: EntityReference): boolean {
  return Boolean(ref.id || ref.number || ref.name || (ref as any).customerName || (ref as any).companyName);
}

async function resolveOrderFromDatabase(tenantId: number, ref: EntityReference, relation: string | null): Promise<ResolveResult<unknown>> {
  const include = { customer: true, items: true };
  if (ref.number) {
    const order = await prisma.order.findFirst({ where: { tenantId, orderNo: { equals: ref.number, mode: "insensitive" } }, include });
    return order ? { kind: "one", entity: order } : { kind: "none" };
  }
  if (ref.id) {
    const order = await prisma.order.findFirst({ where: { tenantId, id: Number(ref.id) }, include });
    return order ? { kind: "one", entity: order } : { kind: "none" };
  }
  const name = ref.name || (ref as any).customerName || (ref as any).companyName;
  if (name) {
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        OR: [
          { orderTitle: { contains: name, mode: "insensitive" } },
          { customer: { company: { contains: name, mode: "insensitive" } } },
        ],
      },
      include,
      orderBy: { createdAt: "desc" },
      take: relation === "latest" ? 1 : 10,
    });
    return resultFromList(orders);
  }
  return { kind: "none" };
}

function leadInclude() {
  return {
    businessLine: true,
    convertedCustomer: true,
    followUps: { orderBy: { followUpDate: "desc" as const }, take: 1 },
    tasks: true,
    quotes: true,
  };
}

function resultFromList<T>(items: T[], matchLevel?: MatchLevel): ResolveResult<T> {
  if (items.length === 0) return { kind: "none" };
  if (items.length === 1) return { kind: "one", entity: items[0], matchLevel };
  return { kind: "many", entities: items.slice(0, 10), matchLevel };
}

function formatLeadField(field: string, lead: any): string | null {
  const map: Record<string, string> = {
    companyName: `公司：${formatValue(field, lead.company)}`,
    contactName: `联系人：${formatValue(field, lead.contactName)}`,
    country: `国家/地区：${formatValue(field, lead.country)}`,
    phone: `电话：${formatValue(field, lead.phone)}`,
    email: `邮箱：${formatValue(field, lead.email)}`,
    whatsapp: `WhatsApp：${formatValue(field, lead.whatsapp)}`,
    source: `来源：${formatValue(field, lead.source)}`,
    status: `状态：${formatValue(field, lead.status)}`,
    grade: `等级：${formatValue(field, lead.grade)}`,
    temperature: `温度：${formatValue(field, lead.temperature)}`,
    requirement: `客户需求：${formatValue(field, lead.requirement)}`,
    productInterest: `意向产品：${formatValue(field, lead.interestProducts)}`,
    budget: `预算：${formatMoney(lead.budget, lead.currency)}`,
    currency: "",
    expectedCloseAt: `预计成交：${formatValue(field, lead.expectedClosing)}`,
    nextFollowUpAt: `下次跟进：${formatValue(field, lead.nextFollowUp)}`,
    createdAt: `创建时间：${formatValue(field, lead.createdAt)}`,
    notes: `备注：${formatValue(field, lead.remark)}`,
    businessLine: `业务线：${formatValue(field, lead.businessLine?.name)}`,
    latestFollowUp: `最近跟进：${formatValue(field, lead.followUps?.[0]?.content)}`,
    followUpCount: `跟进次数：${lead.followUps?.length ?? 0}`,
    taskCount: `任务数量：${lead.tasks?.length ?? 0}`,
    quoteCount: `报价数量：${lead.quotes?.length ?? 0}`,
    convertedCustomer: `已转客户：${formatValue(field, lead.convertedCustomer?.company)}`,
  };
  return map[field] ?? null;
}

function formatCustomerField(field: string, customer: any): string | null {
  const primary = customer.contacts?.find((contact: any) => contact.isPrimary) || customer.contacts?.[0];
  const map: Record<string, string> = {
    companyName: `公司：${formatValue(field, customer.company)}`,
    primaryContact: `主联系人：${formatValue(field, primary?.name || customer.contactName)}`,
    contactName: `主联系人：${formatValue(field, primary?.name || customer.contactName)}`,
    contacts: `联系人：${customer.contacts?.length ? customer.contacts.map((c: any) => c.name).join("、") : "暂未填写"}`,
    country: `国家/地区：${formatValue(field, customer.country)}`,
    phone: `电话：${formatValue(field, customer.phone)}`,
    email: `邮箱：${formatValue(field, customer.email)}`,
    stage: `阶段：${formatValue(field, customer.lifecycleStage || customer.stage)}`,
    grade: `等级：${formatValue(field, customer.leadGrade)}`,
    status: `状态：${formatValue(field, customer.customerStatus)}`,
    latestFollowUp: `最近跟进：${formatValue(field, customer.followUps?.[0]?.content)}`,
    nextFollowUpAt: `下次跟进：${formatValue(field, customer.nextFollowUpAt)}`,
    projectCount: `项目数量：${customer.projects?.length ?? 0}`,
    quoteCount: `报价数量：${customer.quotes?.length ?? 0}`,
    orderCount: `订单数量：${customer.orders?.length ?? 0}`,
    totalOrderAmount: `订单总额：${formatMoney(sum(customer.orders, "totalAmount"), customer.orders?.[0]?.currency)}`,
    outstandingAmount: `未付款金额：${formatMoney(sum(customer.orders, "outstandingAmount"), customer.orders?.[0]?.currency)}`,
  };
  return map[field] ?? null;
}

function formatContactField(field: string, contact: any): string | null {
  const map: Record<string, string> = {
    name: `联系人：${formatValue(field, contact.name)}`,
    customer: `客户：${formatValue(field, contact.customer?.company)}`,
    position: `职位：${formatValue(field, contact.position || contact.jobTitle)}`,
    department: `部门：${formatValue(field, contact.department)}`,
    phone: `电话：${formatValue(field, contact.phone)}`,
    email: `邮箱：${formatValue(field, contact.email)}`,
    whatsapp: `WhatsApp：${formatValue(field, contact.whatsapp)}`,
    notes: `备注：${formatValue(field, contact.notes)}`,
    isPrimary: `主联系人：${contact.isPrimary ? "是" : "否"}`,
  };
  return map[field] ?? null;
}

function formatTaskField(field: string, task: any): string | null {
  const related = task.lead?.company || task.customer?.company || task.project?.name || task.quote?.quoteNo || task.order?.orderNo;
  const map: Record<string, string> = {
    title: `任务：${formatValue(field, task.title)}`,
    status: `状态：${formatValue(field, task.status)}`,
    priority: `优先级：${formatValue(field, task.priority)}`,
    dueAt: `截止时间：${formatValue(field, task.dueDate)}`,
    completedAt: `完成时间：${formatValue(field, task.completedAt)}`,
    relatedEntity: `关联对象：${formatValue(field, related)}`,
    description: `描述：${formatValue(field, task.description)}`,
    createdAt: `创建时间：${formatValue(field, task.createdAt)}`,
  };
  return map[field] ?? null;
}

function formatQuoteField(field: string, quote: any): string | null {
  const map: Record<string, string> = {
    quoteNumber: `报价编号：${formatValue(field, quote.quoteNo)}`,
    customer: `客户：${formatValue(field, quote.customer?.company || quote.lead?.company)}`,
    status: `状态：${formatValue(field, quote.status)}`,
    currency: `币种：${formatValue(field, quote.currency)}`,
    subtotal: `小计：${formatMoney(quote.totalPrice, quote.currency)}`,
    discount: `折扣：${formatMoney(quote.discountAmount, quote.currency)}`,
    tax: `税费：暂未填写`,
    total: `总金额：${formatMoney(quote.totalPrice, quote.currency)}`,
    validUntil: `有效期至：${formatValue(field, quote.validUntil)}`,
    items: `产品明细：${quote.items?.length ? quote.items.map((i: any) => `${i.itemName} ${i.quantity || ""} ${i.unit || ""}`).join("；") : "暂未填写"}`,
    createdAt: `创建时间：${formatValue(field, quote.createdAt)}`,
  };
  return map[field] ?? null;
}

function formatOrderField(field: string, order: any): string | null {
  const map: Record<string, string> = {
    orderNumber: `订单编号：${formatValue(field, order.orderNo)}`,
    customer: `客户：${formatValue(field, order.customer?.company)}`,
    status: `状态：${formatValue(field, order.orderStatus)}`,
    currency: `币种：${formatValue(field, order.currency)}`,
    total: `总金额：${formatMoney(order.totalAmount, order.currency)}`,
    paidAmount: `已付款：${formatMoney(order.paidAmount, order.currency)}`,
    outstandingAmount: `未付款：${formatMoney(order.outstandingAmount, order.currency)}`,
    deliveryDate: `交货日期：${formatValue(field, order.expectedDeliveryDate)}`,
    items: `产品明细：${order.items?.length ? order.items.map((i: any) => `${i.itemName} ${i.quantity || ""} ${i.unit || ""}`).join("；") : "暂未填写"}`,
    createdAt: `创建时间：${formatValue(field, order.createdAt)}`,
  };
  return map[field] ?? null;
}

function buildLeadCandidates(leads: any[], matchLevel?: MatchLevel) {
  const header = matchLevel === "exact"
    ? `精确匹配到${leads.length}条线索，请进一步选择：`
    : matchLevelLabel(matchLevel || "fuzzy");
  return [header, ...leads.slice(0, 10).map((lead) => `线索ID ${lead.id}｜${lead.company}｜联系人：${lead.contactName || "暂未填写"}｜${lead.email || lead.phone || "暂未填写"}｜状态：${formatValue("status", lead.status)}`)].join("\n");
}

function buildCustomerCandidates(customers: any[]) {
  return ["找到多条匹配客户，请进一步选择：", ...customers.map((customer) => `客户ID ${customer.id}｜${customer.company}｜联系人：${customer.contactName || "暂未填写"}｜${customer.email || customer.phone || "暂未填写"}｜状态：${formatValue("status", customer.customerStatus)}`)].join("\n");
}

function buildContactCandidates(contacts: any[]) {
  return ["找到多条匹配联系人，请进一步选择：", ...contacts.map((contact) => `联系人ID ${contact.id}｜${contact.name}｜客户：${contact.customer?.company || "暂未填写"}｜${contact.email || contact.phone || "暂未填写"}`)].join("\n");
}

function buildTaskCandidates(tasks: any[]) {
  return ["找到多条匹配任务，请进一步选择：", ...tasks.map((task) => `任务ID ${task.id}｜${task.title}｜状态：${formatValue("status", task.status)}｜截止：${formatValue("dueAt", task.dueDate)}`)].join("\n");
}

function buildQuoteCandidates(quotes: any[]) {
  return ["找到多条匹配报价，请进一步选择：", ...quotes.map((quote) => `报价ID ${quote.id}｜${quote.quoteNo}｜客户：${quote.customer?.company || quote.lead?.company || "暂未填写"}｜状态：${formatValue("status", quote.status)}`)].join("\n");
}

function buildOrderCandidates(orders: any[]) {
  return ["找到多条匹配订单，请进一步选择：", ...orders.map((order) => `订单ID ${order.id}｜${order.orderNo}｜客户：${order.customer?.company || "暂未填写"}｜状态：${formatValue("status", order.orderStatus)}`)].join("\n");
}

export function formatValue(field: string, value: unknown): string {
  if (value == null || value === "") {
    return field === "nextFollowUpAt" || field === "dueAt" ? "暂未设置" : "暂未填写";
  }
  if (value instanceof Date) {
    return value.toLocaleString("zh-CN", { hour12: false });
  }
  const raw = String(value);
  return LEAD_STATUS_MAP[raw]
    || TASK_STATUS_MAP[raw]
    || TASK_PRIORITY_MAP[raw]
    || QUOTE_STATUS_MAP[raw]
    || ORDER_STATUS_MAP[raw]
    || raw;
}

function formatMoney(value: unknown, currency: unknown): string {
  if (value == null || value === "") return "暂未填写";
  const amount = Number(value);
  const formatted = Number.isFinite(amount) ? amount.toLocaleString("zh-CN") : String(value);
  return `${formatted}${currency || ""}`;
}

function sum(items: any[] | undefined, key: string): number | null {
  if (!items?.length) return null;
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function referenceLabel(ref: EntityReference): string {
  return ref.id || ref.email || ref.phone || ref.number || ref.name || (ref as any).customerName || (ref as any).companyName || "请提供对象ID";
}

function safeQueryError(): string {
  return "查询执行出错，请稍后重试。";
}

function resolveByName<T extends Record<string, unknown>>(items: T[], name: string, key: keyof T): ResolveResult<T> {
  const normalizedName = normalizeEntityName(name);
  const exact = items.filter((item) => normalizeEntityName(String(item[key] || "")) === normalizedName);
  if (exact.length) return resultFromList(exact, "exact");
  const prefix = items.filter((item) => normalizeEntityName(String(item[key] || "")).startsWith(normalizedName));
  if (prefix.length) return resultFromList(prefix, "prefix");
  const fuzzy = items.filter((item) => normalizeEntityName(String(item[key] || "")).includes(normalizedName));
  return resultFromList(fuzzy, "fuzzy");
}

function resolveLeadReference<T extends { id: number; company: string; email?: string | null; phone?: string | null; whatsapp?: string | null }>(
  leads: T[],
  ref: EntityReference,
): ResolveResult<T> {
  if (ref.id) return resultFromList(leads.filter((lead) => String(lead.id) === String(ref.id)));
  if (ref.email) return resultFromList(leads.filter((lead) => normalize(lead.email || "") === normalize(ref.email || "")));
  if (ref.phone) return resultFromList(leads.filter((lead) => lead.phone === ref.phone || lead.whatsapp === ref.phone));
  if (ref.name) return resolveByName(leads, ref.name, "company");
  return { kind: "none" };
}

function normalize(value: string): string {
  return normalizeEntityName(value);
}

function normalizeEntityName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[“”"「」『』]/g, "")
    .replace(/[，,。.!！?？:：;；]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchLevelLabel(level: MatchLevel): string {
  if (level === "exact") return "精确匹配到多条线索，请进一步选择：";
  if (level === "prefix") return "未找到精确匹配，以下是前缀相似线索：";
  return "未找到精确匹配，以下是相似线索：";
}

function chooseEntityTypeByFieldsAndMatches(fields: string[], leadExactCount: number, customerExactCount: number): "lead" | "customer" | "ambiguous" | "unknown" {
  const leadFields = new Set(["status", "temperature", "grade", "requirement", "productInterest", "budget", "currency", "expectedCloseAt", "nextFollowUpAt"]);
  const customerFields = new Set(["stage", "primaryContact", "contacts", "orderCount", "totalOrderAmount", "outstandingAmount"]);

  if (fields.some((field) => leadFields.has(field))) return "lead";
  if (fields.some((field) => customerFields.has(field))) return "customer";
  if (leadExactCount > 0 && customerExactCount === 0) return "lead";
  if (customerExactCount > 0 && leadExactCount === 0) return "customer";
  if (leadExactCount > 0 && customerExactCount > 0) return "ambiguous";
  return "unknown";
}

export const __entityQueryTestUtils = {
  resolveLeadReference,
  resolveByName,
  formatValue,
  safeQueryError,
  referenceLabel,
  matchLevelLabel,
  normalizeEntityName,
  chooseEntityTypeByFieldsAndMatches,
};
