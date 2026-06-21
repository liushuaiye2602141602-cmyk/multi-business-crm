import prisma from "@/lib/prisma";
import { getLocalWorkspaceId } from "@/lib/local-context";
import { resolveContactReference, resolveCustomerReference } from "@/lib/services/customer-flow-service";
import { Prisma } from "@/lib/generated/prisma/client";
import { recordIntent } from "@/lib/memory/intentStore";
import { resolveEntity } from "@/lib/resolver/EntityResolver";

type Db = typeof prisma;
type Decimal = Prisma.Decimal;

export type FeishuOperationContext = {
  senderId?: string;
  chatId?: string;
  messageId?: string;
  workspaceId?: number;
};

export type EntityReference = {
  id?: string | number | null;
  number?: string | null;
  name?: string | null;
  companyName?: string | null;
  customerName?: string | null;
  contactName?: string | null;
  useLastQuote?: boolean | null;
  useLastAcceptedQuote?: boolean | null;
  useLastSentQuote?: boolean | null;
  useLastOrder?: boolean | null;
  useLastProject?: boolean | null;
};

export type QuoteOrderItemInput = {
  productId?: number | null;
  productName?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unitPrice?: number | string | null;
  currency?: string | null;
};

export type QuoteOrderPlan = {
  intent: string;
  entityType: "Quote" | "Order";
  entityId?: number;
  validatedParameters: Record<string, any>;
  beforeValues: Record<string, any>;
  calculatedTotals: Record<string, any>;
  summary: string;
};

export type PlanResult = {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
  plan?: QuoteOrderPlan;
};

export type ServiceResult = {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
};

type ConversationContext = {
  activeCustomerId?: number;
  activeCustomerName?: string;
  lastConvertedCustomerId?: number;
  lastQuoteId?: number;
  lastQuoteNumber?: string;
  lastAcceptedQuoteId?: number;
  lastAcceptedQuoteNumber?: string;
  lastSentQuoteId?: number;
  lastSentQuoteNumber?: string;
  lastOrderId?: number;
  lastOrderNumber?: string;
  workspaceId?: number;
  updatedAt: number;
  expiresAt: number;
};

const RECENT_CONTEXT_TTL_MS = 30 * 60 * 1000;
const contexts = new Map<string, ConversationContext>();
const CURRENCIES = new Set(["USD", "EUR", "CNY"]);
const ORDER_STATUS_SEQUENCE = ["PENDING_CONFIRMATION", "CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED"] as const;
const ORDER_STATUSES = new Set([...ORDER_STATUS_SEQUENCE, "CANCELLED"]);

function tenantId() {
  return getLocalWorkspaceId();
}

function dec(value: unknown): Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0);
  return new Prisma.Decimal(String(value));
}

function money(value: Decimal | number | string | null | undefined): string {
  return dec(value).toFixed(2);
}

function contextKey(context?: FeishuOperationContext): string | null {
  if (!context?.senderId || !context.chatId) return null;
  return `${context.chatId}::${context.senderId}`;
}

function setContext(context: FeishuOperationContext | undefined, patch: Partial<ConversationContext>) {
  const key = contextKey(context);
  if (!key) return;
  const now = Date.now();
  const safePatch = { ...patch };
  if (safePatch.activeCustomerId === null || safePatch.activeCustomerId === undefined) delete safePatch.activeCustomerId;
  if (safePatch.activeCustomerName === null || safePatch.activeCustomerName === undefined) delete safePatch.activeCustomerName;
  if (safePatch.lastConvertedCustomerId === null || safePatch.lastConvertedCustomerId === undefined) delete safePatch.lastConvertedCustomerId;
  if (safePatch.lastQuoteId === null || safePatch.lastQuoteId === undefined) delete safePatch.lastQuoteId;
  if (safePatch.lastQuoteNumber === null || safePatch.lastQuoteNumber === undefined) delete safePatch.lastQuoteNumber;
  if (safePatch.lastAcceptedQuoteId === null || safePatch.lastAcceptedQuoteId === undefined) delete safePatch.lastAcceptedQuoteId;
  if (safePatch.lastAcceptedQuoteNumber === null || safePatch.lastAcceptedQuoteNumber === undefined) delete safePatch.lastAcceptedQuoteNumber;
  if (safePatch.lastSentQuoteId === null || safePatch.lastSentQuoteId === undefined) delete safePatch.lastSentQuoteId;
  if (safePatch.lastSentQuoteNumber === null || safePatch.lastSentQuoteNumber === undefined) delete safePatch.lastSentQuoteNumber;
  contexts.set(key, {
    ...(contexts.get(key) || { updatedAt: now, expiresAt: 0 }),
    ...safePatch,
    workspaceId: context?.workspaceId ?? tenantId(),
    updatedAt: now,
    expiresAt: now + RECENT_CONTEXT_TTL_MS,
  });
}

function getContext(context?: FeishuOperationContext): ConversationContext | null {
  const key = contextKey(context);
  if (!key) return null;
  const item = contexts.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    contexts.delete(key);
    return null;
  }
  return item;
}

function rememberQuote(context: FeishuOperationContext | undefined, quote: { id: number; quoteNo: string }) {
  setContext(context, { lastQuoteId: quote.id, lastQuoteNumber: quote.quoteNo });
}

function recordQuoteOrderIntent(
  context: FeishuOperationContext | undefined,
  input: { type: "QUOTE" | "ORDER" | "CUSTOMER"; stage: string; entityId: number | string; entityType: string; action: string; flowKey?: string },
) {
  recordIntent({
    context,
    type: input.type,
    stage: input.stage,
    activeEntityId: input.entityId,
    activeEntityType: input.entityType,
    action: input.action,
    flowKey: input.flowKey || `${input.entityType}:${input.entityId}`,
  });
}

export function rememberCustomerContext(
  context: FeishuOperationContext | undefined,
  customer: { id: number; company?: string | null },
  options?: { converted?: boolean },
) {
  setContext(context, {
    activeCustomerId: customer.id,
    activeCustomerName: customer.company || undefined,
    lastConvertedCustomerId: options?.converted ? customer.id : undefined,
  });
  return getContext(context);
}

function rememberAcceptedQuote(context: FeishuOperationContext | undefined, quote: { id: number; quoteNo: string }) {
  setContext(context, {
    lastQuoteId: quote.id,
    lastQuoteNumber: quote.quoteNo,
    lastAcceptedQuoteId: quote.id,
    lastAcceptedQuoteNumber: quote.quoteNo,
  });
}

function rememberSentQuote(context: FeishuOperationContext | undefined, quote: { id: number; quoteNo: string }) {
  setContext(context, {
    lastQuoteId: quote.id,
    lastQuoteNumber: quote.quoteNo,
    lastSentQuoteId: quote.id,
    lastSentQuoteNumber: quote.quoteNo,
  });
}

export function resolveQuoteReferenceForQuery(ref?: EntityReference, context?: FeishuOperationContext): { ref?: EntityReference; message?: string } {
  if (ref?.id) return { ref: { ...ref, id: ref.id } };
  if (ref?.number) return { ref: { ...ref, number: ref.number } };
  if (!ref?.useLastQuote && (ref?.name || ref?.companyName || ref?.customerName)) return { ref };
  const recent = getContext(context);
  const intentResolved = resolveEntity({
    context,
    entityType: "Quote",
    hint: ref?.useLastQuote ? "刚才报价" : (ref?.name || ref?.companyName || ref?.customerName),
    memoryLastId: recent?.lastQuoteId,
  });
  if (intentResolved.entityId) return { ref: { id: Number(intentResolved.entityId) || intentResolved.entityId } };
  if (ref?.useLastQuote) {
    if (recent?.lastQuoteId) return { ref: { id: recent.lastQuoteId } };
    return { message: "当前会话无最近报价，请提供报价ID。" };
  }
  if (ref?.name || ref?.companyName || ref?.customerName) return { ref };
  return { message: "请提供报价ID。" };
}

export function resolveQuoteToOrderReferenceForQuery(ref?: EntityReference, context?: FeishuOperationContext): { ref?: EntityReference; message?: string } {
  if (ref?.id) return { ref: { ...ref, id: ref.id } };
  if (ref?.number) return { ref: { ...ref, number: ref.number } };
  if (!ref?.useLastQuote && !(ref as any)?.useLastAcceptedQuote && (ref?.name || ref?.companyName || ref?.customerName)) return { ref };
  const recent = getContext(context);
  const intentResolved = resolveEntity({
    context,
    entityType: "Quote",
    hint: (ref as any)?.useLastAcceptedQuote || ref?.useLastQuote ? "刚才报价" : (ref?.name || ref?.companyName || ref?.customerName),
    memoryLastId: recent?.lastAcceptedQuoteId || recent?.lastQuoteId || recent?.lastSentQuoteId,
  });
  if (intentResolved.entityId) return { ref: { id: Number(intentResolved.entityId) || intentResolved.entityId } };
  if (recent?.lastAcceptedQuoteId) return { ref: { id: recent.lastAcceptedQuoteId } };
  if (recent?.lastQuoteId) return { ref: { id: recent.lastQuoteId } };
  if (recent?.lastSentQuoteId) return { ref: { id: recent.lastSentQuoteId } };
  if (ref?.name || ref?.companyName || ref?.customerName) return { ref };
  if ((ref as any)?.useLastAcceptedQuote) return { message: "当前会话无最近已接受报价，请提供报价ID。" };
  if (ref?.useLastQuote) return { message: "当前会话无最近报价，请提供报价ID。" };
  return { message: "请提供报价ID。" };
}

function rememberOrder(context: FeishuOperationContext | undefined, order: { id: number; orderNo: string }) {
  setContext(context, { lastOrderId: order.id, lastOrderNumber: order.orderNo });
}

export function resolveOrderReferenceForQuery(ref?: EntityReference, context?: FeishuOperationContext): { ref?: EntityReference; message?: string } {
  if (ref?.id) return { ref: { ...ref, id: ref.id } };
  if (ref?.number) return { ref: { ...ref, number: ref.number } };
  if (!ref?.useLastOrder && (ref?.name || ref?.companyName || ref?.customerName)) return { ref };
  const recent = getContext(context);
  const intentResolved = resolveEntity({
    context,
    entityType: "Order",
    hint: ref?.useLastOrder ? "刚才订单" : (ref?.name || ref?.companyName || ref?.customerName),
    memoryLastId: recent?.lastOrderId,
  });
  if (intentResolved.entityId) return { ref: { id: Number(intentResolved.entityId) || intentResolved.entityId } };
  if (ref?.useLastOrder) {
    if (recent?.lastOrderId) return { ref: { id: recent.lastOrderId } };
    return { message: "当前会话无最近订单，请提供订单ID。" };
  }
  if (ref?.name || ref?.companyName || ref?.customerName) return { ref };
  return { message: "请提供订单ID。" };
}

function normalizeOrderStatusCode(value?: string | null): string | null {
  if (!value) return null;
  const map: Record<string, string> = {
    DRAFT: "PENDING_CONFIRMATION",
    PRODUCTION: "IN_PRODUCTION",
  };
  return map[value] || value;
}

function validateOrderTransition(currentRaw: string, nextRaw: string) {
  const current = normalizeOrderStatusCode(currentRaw)!;
  const next = normalizeOrderStatusCode(nextRaw)!;
  if (current === next) return { ok: true, idempotent: true, status: current };
  if (!ORDER_STATUSES.has(next)) return { ok: false, message: "订单状态不合法。" };
  if (current === "COMPLETED") return { ok: false, message: "已完成订单不能回退状态。" };
  if (current === "CANCELLED" && next !== "CANCELLED") return { ok: false, message: "已取消订单不能无警告恢复状态。" };
  if (next === "CANCELLED") return { ok: true, idempotent: false, status: next };
  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(current as any);
  const nextIndex = ORDER_STATUS_SEQUENCE.indexOf(next as any);
  if (currentIndex < 0 || nextIndex < 0) return { ok: false, message: "订单状态不合法。" };
  if (nextIndex < currentIndex) return { ok: false, message: "订单状态不能回退。" };
  if (nextIndex > currentIndex + 1) return { ok: false, message: `订单状态不能跳跃流转，当前状态：${current}。` };
  return { ok: true, idempotent: false, status: next };
}

function safeError(error: unknown, fallback: string): ServiceResult {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/Prisma|DATABASE_URL|password|secret|api[_-]?key/i.test(raw)) return { success: false, message: fallback };
  return { success: false, message: raw || fallback };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function formatDate(value: unknown): string {
  const date = value instanceof Date ? value : toDate(value);
  return date ? date.toLocaleDateString("zh-CN") : "未填写";
}

function normalizeCurrency(value?: string | null): string | null {
  const text = String(value || "").toUpperCase();
  if (text === "美元" || text === "USD") return "USD";
  if (text === "欧元" || text === "EUR") return "EUR";
  if (text === "人民币" || text === "RMB" || text === "CNY") return "CNY";
  if (!text) return null;
  return CURRENCIES.has(text) ? text : null;
}

function normalizeItems(items: QuoteOrderItemInput[], defaultCurrency?: string | null) {
  return (items || []).map((item, index) => {
    const quantity = item.quantity === undefined || item.quantity === null || item.quantity === "" ? null : dec(item.quantity);
    const unitPrice = item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === "" ? null : dec(item.unitPrice);
    const currency = normalizeCurrency(item.currency || defaultCurrency || null);
    const lineTotal = quantity && unitPrice ? quantity.mul(unitPrice) : null;
    return {
      productId: item.productId || null,
      itemName: String(item.productName || item.description || `报价项目${index + 1}`).trim(),
      specification: item.description || null,
      quantity,
      unit: item.unit || "pcs",
      unitPrice,
      totalPrice: lineTotal,
      notes: null,
      sortOrder: index,
      currency,
    };
  });
}

function calculateTotals(items: ReturnType<typeof normalizeItems>, quote: any) {
  const subtotal = items.reduce((sum, item) => sum.plus(item.totalPrice || 0), dec(0));
  const discountValue = dec(quote?.discountValue || 0);
  const discount = quote?.discountType === "PERCENTAGE" ? subtotal.mul(discountValue).div(100) : discountValue;
  const taxable = subtotal.minus(discount);
  const tax = quote?.taxRate === null || quote?.taxRate === undefined ? dec(0) : taxable.mul(dec(quote.taxRate)).div(100);
  const shippingFee = dec(quote?.shippingFee || 0);
  const total = taxable.plus(tax).plus(shippingFee);
  return { subtotal, discount, tax, shippingFee, total };
}

function validateItems(items: ReturnType<typeof normalizeItems>) {
  if (items.length === 0) return "请至少提供一个报价或订单项目。";
  const missing: string[] = [];
  for (const item of items) {
    if (!item.itemName) missing.push("产品名称");
    if (!item.quantity || item.quantity.lte(0)) missing.push("数量");
    if (!item.unitPrice || item.unitPrice.lte(0)) missing.push("单价");
    if (!item.currency) missing.push("币种");
  }
  return missing.length ? `缺少以下信息：${Array.from(new Set(missing)).join("、")}。请补充后继续。` : null;
}

function ensureSingleCurrency(items: ReturnType<typeof normalizeItems>, headerCurrency?: string | null) {
  const currencies = Array.from(new Set(items.map((item) => item.currency).filter(Boolean)));
  if (headerCurrency) currencies.push(headerCurrency);
  const unique = Array.from(new Set(currencies));
  return unique.length > 1 ? null : unique[0] || headerCurrency || null;
}

async function generateSequentialNumber(prefix: "Q" | "O", db: Db = prisma) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const model = prefix === "Q" ? db.quote : db.order;
  const field = prefix === "Q" ? "quoteNo" : "orderNo";
  const count = await (model as any).count({ where: { [field]: { startsWith: `${prefix}-${date}-` } } });
  return `${prefix}-${date}-${String(count + 1).padStart(4, "0")}`;
}

async function resolveCustomer(ref?: EntityReference, context?: FeishuOperationContext, db: Db = prisma) {
  const recent = getContext(context);
  const resolved = resolveEntity({
    context,
    entityType: "Customer",
    hint: ref?.name || ref?.companyName || ref?.customerName,
    explicitId: ref?.id,
    memoryActiveId: recent?.activeCustomerId,
    memoryLastId: recent?.lastConvertedCustomerId,
  });
  if (resolved.entityId) {
    return resolveCustomerReference({ id: resolved.entityId }, db);
  }
  return resolveCustomerReference({
    id: ref?.id,
    companyName: ref?.companyName || ref?.customerName || ref?.name,
  }, db);
}

async function resolveProject(ref?: EntityReference, customerId?: number, context?: FeishuOperationContext, db: Db = prisma) {
  const recentProjectId = ref?.useLastProject ? (getContext(context) as any)?.lastProjectId : null;
  if (!recentProjectId && !ref?.id && !ref?.name) return { kind: "none" as const, message: "未关联项目。" };
  const where = recentProjectId || ref?.id
    ? { id: Number(recentProjectId || ref?.id) }
    : { name: { contains: String(ref?.name), mode: "insensitive" as const }, ...(customerId ? { customerId } : {}) };
  const projects = await db.project.findMany({ where, take: 10, include: { customer: true } });
  if (projects.length === 0) return { kind: "none" as const, message: `未找到项目${ref?.id || ref?.name || ""}。` };
  if (projects.length > 1) return { kind: "many" as const, message: `找到多个项目，请指定项目ID：${projects.map((p) => `${p.id}.${p.name}`).join("；")}` };
  return { kind: "one" as const, entity: projects[0] };
}

async function resolveQuote(ref?: EntityReference, context?: FeishuOperationContext, db: Db = prisma) {
  const resolvedRef = resolveQuoteReferenceForQuery(ref, context);
  if (!resolvedRef.ref) return { kind: "none" as const, message: resolvedRef.message || "请提供报价ID。" };
  ref = resolvedRef.ref;
  if (ref?.id) {
    const quote = await db.quote.findFirst({ where: { id: Number(ref.id), tenantId: tenantId() }, include: { items: true, customer: true, project: true, orders: true } });
    if (!quote) return { kind: "none" as const, message: `未找到报价ID ${ref.id}。` };
    rememberQuote(context, quote);
    return { kind: "one" as const, entity: quote };
  }
  if (ref?.number) {
    const quote = await db.quote.findFirst({ where: { quoteNo: { equals: ref.number, mode: "insensitive" }, tenantId: tenantId() }, include: { items: true, customer: true, project: true, orders: true } });
    if (!quote) return { kind: "none" as const, message: `未找到报价编号 ${ref.number}。` };
    rememberQuote(context, quote);
    return { kind: "one" as const, entity: quote };
  }
  const name = ref?.name || ref?.companyName || ref?.customerName;
  if (!name) return { kind: "none" as const, message: "请提供报价ID。" };
  const quotes = await db.quote.findMany({
    where: {
      tenantId: tenantId(),
      OR: [
        { quoteTitle: { contains: name, mode: "insensitive" } },
        { customer: { company: { contains: name, mode: "insensitive" } } },
      ],
    },
    include: { items: true, customer: true, project: true, orders: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  if (quotes.length === 0) return { kind: "none" as const, message: `未找到匹配报价“${name}”。` };
  if (quotes.length > 1 && ref?.name !== "latest") return { kind: "many" as const, message: `找到多条报价，请指定编号：${quotes.map((q) => q.quoteNo).join("；")}` };
  rememberQuote(context, quotes[0]);
  return { kind: "one" as const, entity: quotes[0] };
}

async function resolveOrder(ref?: EntityReference, context?: FeishuOperationContext, db: Db = prisma) {
  const resolvedRef = resolveOrderReferenceForQuery(ref, context);
  if (!resolvedRef.ref) return { kind: "none" as const, message: resolvedRef.message || "请提供订单ID。" };
  ref = resolvedRef.ref;
  if (ref?.id) {
    const order = await db.order.findFirst({ where: { id: Number(ref.id), tenantId: tenantId() }, include: { items: true, customer: true, quote: true, project: true } });
    if (!order) return { kind: "none" as const, message: `未找到订单ID ${ref.id}。` };
    rememberOrder(context, order);
    return { kind: "one" as const, entity: order };
  }
  if (ref?.number) {
    const order = await db.order.findFirst({ where: { orderNo: { equals: ref.number, mode: "insensitive" }, tenantId: tenantId() }, include: { items: true, customer: true, quote: true, project: true } });
    if (!order) return { kind: "none" as const, message: `未找到订单编号 ${ref.number}。` };
    rememberOrder(context, order);
    return { kind: "one" as const, entity: order };
  }
  const name = ref?.name || ref?.companyName || ref?.customerName;
  if (name) {
    const orders = await db.order.findMany({
      where: {
        tenantId: tenantId(),
        customer: { company: { contains: name, mode: "insensitive" } },
      },
      include: { items: true, customer: true, quote: true, project: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    if (orders.length === 0) return { kind: "none" as const, message: `未找到匹配订单“${name}”。` };
    if (orders.length > 1) return { kind: "many" as const, message: `找到多条订单，请指定编号：${orders.map((order) => order.orderNo).join("；")}` };
    rememberOrder(context, orders[0]);
    return { kind: "one" as const, entity: orders[0] };
  }
  return { kind: "none" as const, message: "请提供订单ID。" };
}

async function duplicateQuote(customerId: number, items: ReturnType<typeof normalizeItems>, currency: string, db: Db = prisma, quoteNo?: string | null) {
  if (quoteNo) {
    const quote = await db.quote.findFirst({ where: { tenantId: tenantId(), quoteNo: { equals: quoteNo, mode: "insensitive" } }, include: { items: true } });
    if (quote) return quote;
  }
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const quotes = await db.quote.findMany({ where: { tenantId: tenantId(), customerId, currency: currency as any, createdAt: { gte: since } }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 20 });
  const key = items.map((item) => `${item.itemName}|${item.quantity?.toString()}|${item.unitPrice?.toString()}|${item.currency}`).join(";");
  return quotes.find((quote) => quote.items.map((item) => `${item.itemName}|${item.quantity?.toString()}|${item.unitPrice?.toString()}|${currency}`).join(";") === key) || null;
}

export async function validateCreateQuotePlan(quoteInput: any, itemInput: QuoteOrderItemInput[], customerRef?: EntityReference, projectRef?: EntityReference, contactRef?: EntityReference, context?: FeishuOperationContext): Promise<PlanResult> {
  const customerResult = await resolveCustomer(customerRef, context);
  if (customerResult.kind !== "one") return { success: false, message: customerResult.message };
  const customer = customerResult.entity as any;
  const headerCurrency = normalizeCurrency(quoteInput?.currency || null);
  const items = normalizeItems(itemInput || [], headerCurrency);
  const itemError = validateItems(items);
  if (itemError) return { success: false, message: itemError };
  const currency = ensureSingleCurrency(items, headerCurrency);
  if (!currency) return { success: false, message: "同一份报价只能使用一种币种，请统一币种后继续。" };
  if (!CURRENCIES.has(currency)) return { success: false, message: "币种不合法。" };
  const duplicate = await duplicateQuote(customer.id, items, currency, prisma, quoteInput?.quoteNo || quoteInput?.quoteNumber);
  if (duplicate) {
    rememberQuote(context, duplicate);
    return { success: false, message: `检测到疑似重复报价，未创建新报价。\nQuote ID：${duplicate.id}\n报价编号：${duplicate.quoteNo}`, entityType: "Quote", entityId: duplicate.id };
  }
  let projectId: number | null = null;
  if (projectRef && (projectRef.id || projectRef.name || projectRef.useLastProject)) {
    const project = await resolveProject(projectRef, customer.id, context);
    if (project.kind !== "one") return { success: false, message: project.message };
    projectId = project.entity.id;
  }
  let contactId: number | null = null;
  if (contactRef && (contactRef.id || contactRef.contactName || contactRef.name)) {
    const contact = await resolveContactReference({ id: contactRef.id, contactName: contactRef.contactName || contactRef.name }, customer.id);
    if (contact.kind !== "one") return { success: false, message: contact.message };
    contactId = contact.entity.id;
  }
  const totals = calculateTotals(items, quoteInput);
  const validUntil = quoteInput?.validUntil ? toDate(quoteInput.validUntil) : addDays(Number(quoteInput?.validDays || 30));
  const data = {
    quoteTitle: quoteInput?.title || `报价 - ${customer.company}`,
    productName: items[0].itemName,
    specs: items[0].specification,
    quantity: items[0].quantity?.toString() || null,
    unitPrice: items[0].unitPrice,
    totalPrice: totals.total,
    discountAmount: totals.discount,
    currency,
    paymentTerms: quoteInput?.paymentTerms || null,
    deliveryTime: quoteInput?.deliveryTerms || null,
    validDays: quoteInput?.validDays || 30,
    validUntil,
    remarks: quoteInput?.notes || null,
    status: "DRAFT",
    customerId: customer.id,
    customerContactId: contactId,
    projectId,
    tenantId: tenantId(),
  };
  const summary = [
    "即将创建报价：",
    `客户：${customer.company}`,
    `联系人：${contactId || "未指定"}`,
    `关联项目：${projectId || "未关联"}`,
    `币种：${currency}`,
    "",
    "报价明细：",
    ...items.map((item, index) => `${index + 1}. ${item.itemName}\n   数量：${item.quantity?.toString()} ${item.unit}\n   单价：${money(item.unitPrice)} ${currency}\n   小计：${money(item.totalPrice)} ${currency}`),
    "",
    `商品小计：${money(totals.subtotal)} ${currency}`,
    `运费：${money(totals.shippingFee)} ${currency}`,
    `折扣：${money(totals.discount)} ${currency}`,
    `税费：${money(totals.tax)} ${currency}`,
    `总金额：${money(totals.total)} ${currency}`,
    `有效期：${formatDate(validUntil)}`,
    "未确认前不会写入数据库。",
  ].join("\n");
  return { success: true, message: summary, entityType: "Quote", plan: { intent: "CREATE_QUOTE", entityType: "Quote", validatedParameters: { data, items, originalMessageId: context?.messageId, context }, beforeValues: {}, calculatedTotals: totals, summary } };
}

export async function createQuoteService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const data = { ...plan.validatedParameters.data };
      const dup = await duplicateQuote(data.customerId, plan.validatedParameters.items, data.currency, tx as any, data.quoteNo);
      if (dup) return { duplicate: dup };
      data.quoteNo = await generateSequentialNumber("Q", tx as any);
      const quote = await tx.quote.create({ data });
      await tx.quoteItem.createMany({ data: plan.validatedParameters.items.map((item: any) => ({ quoteId: quote.id, productId: item.productId, itemName: item.itemName, specification: item.specification, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, totalPrice: item.totalPrice, notes: item.notes, sortOrder: item.sortOrder })) });
      await tx.activityLog.create({ data: { action: "飞书创建报价", entityType: "Quote", entityId: String(quote.id), entityName: quote.quoteNo, description: JSON.stringify({ senderId, messageId }) } });
      return { quote };
    });
    if ("duplicate" in result && result.duplicate) {
      rememberQuote({ senderId, chatId, messageId }, result.duplicate);
      return { success: false, message: `检测到疑似重复报价，未创建新报价。\n报价编号：${result.duplicate.quoteNo}`, entityType: "Quote", entityId: result.duplicate.id };
    }
    rememberQuote({ senderId, chatId, messageId }, result.quote);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "QUOTE", stage: "CREATED", entityId: result.quote.id, entityType: "Quote", action: "createQuote" });
    return { success: true, message: `报价已创建\n报价编号：${result.quote.quoteNo}\nID：${result.quote.id}`, entityType: "Quote", entityId: result.quote.id };
  } catch (error) {
    return safeError(error, "创建报价失败，请稍后重试。");
  }
}

export async function validateUpdateQuotePlan(ref: EntityReference, changesInput: any, context?: FeishuOperationContext): Promise<PlanResult> {
  const resolved = await resolveQuote(ref, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const quote = resolved.entity;
  if (quote.status === "ACCEPTED" && (changesInput?.unitPrice || changesInput?.quantity || changesInput?.items)) return { success: false, message: "已接受报价不能直接修改核心商业条款，请创建新版本。" };
  if (quote.orders?.length) return { success: false, message: "该报价已生成订单，不能直接修改金额或明细。" };
  const data: Record<string, any> = {};
  if (changesInput?.validUntil) data.validUntil = toDate(changesInput.validUntil);
  if (changesInput?.unitPrice !== undefined) data.unitPrice = dec(changesInput.unitPrice);
  if (changesInput?.discountValue !== undefined) data.discountAmount = dec(changesInput.discountValue);
  if (changesInput?.shippingFee !== undefined) data.shippingTerm = `运费：${money(changesInput.shippingFee)} ${quote.currency}`;
  if (changesInput?.paymentTerms) data.paymentTerms = changesInput.paymentTerms;
  if (changesInput?.deliveryTerms) data.deliveryTime = changesInput.deliveryTerms;
  if (changesInput?.notes) data.remarks = changesInput.notes;
  if (Object.keys(data).length === 0) return { success: false, message: "请提供要修改的报价字段。" };
  const summary = [`即将更新报价：`, `报价：${quote.quoteNo}`, `客户：${quote.customer?.company || "未关联"}`, `变更字段：${Object.keys(data).join("、")}`, "未确认前不会写入数据库。"].join("\n");
  return { success: true, message: summary, entityType: "Quote", entityId: quote.id, plan: { intent: "UPDATE_QUOTE", entityType: "Quote", entityId: quote.id, validatedParameters: { data, originalMessageId: context?.messageId, context }, beforeValues: { status: quote.status, totalPrice: quote.totalPrice, validUntil: quote.validUntil }, calculatedTotals: {}, summary } };
}

export async function updateQuoteService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const quote = await prisma.quote.update({ where: { id: plan.entityId! }, data: plan.validatedParameters.data });
    await prisma.activityLog.create({ data: { action: "飞书更新报价", entityType: "Quote", entityId: String(quote.id), entityName: quote.quoteNo, description: JSON.stringify({ fields: Object.keys(plan.validatedParameters.data), senderId, messageId }) } });
    rememberQuote({ senderId, chatId, messageId }, quote);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "QUOTE", stage: "UPDATED", entityId: quote.id, entityType: "Quote", action: "updateQuote" });
    return { success: true, message: `报价已更新\n报价编号：${quote.quoteNo}`, entityType: "Quote", entityId: quote.id };
  } catch (error) {
    return safeError(error, "更新报价失败，请稍后重试。");
  }
}

export async function validateSendQuotePlan(ref: EntityReference, context?: FeishuOperationContext): Promise<PlanResult> {
  const resolved = await resolveQuote(ref, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const quote = resolved.entity;
  if (quote.status === "SENT") return { success: false, message: "该报价已发送，不能重复发送。" };
  if (quote.status === "ACCEPTED") return { success: false, message: "该报价已接受，无需再标记发送。" };
  const summary = [`即将标记报价为已发送：`, `报价编号：${quote.quoteNo}`, `客户：${quote.customer?.company || "未关联"}`, `金额：${money(quote.totalPrice)} ${quote.currency}`, `当前状态：${quote.status}`, `发送后状态：SENT`, "系统仅更新为已发送状态，未实际发送外部邮件。", "未确认前不会写入数据库。"].join("\n");
  return { success: true, message: summary, entityType: "Quote", entityId: quote.id, plan: { intent: "SEND_QUOTE", entityType: "Quote", entityId: quote.id, validatedParameters: { data: { status: "SENT" }, originalMessageId: context?.messageId, context }, beforeValues: { status: quote.status }, calculatedTotals: {}, summary } };
}

export async function sendQuoteService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const current = await prisma.quote.findUnique({ where: { id: plan.entityId! } });
    if (!current) return { success: false, message: "报价不存在。" };
    if (current.status === "SENT") {
      rememberSentQuote({ senderId, chatId, messageId }, current);
      return { success: false, message: "该报价已发送，不能重复发送。" };
    }
    const quote = await prisma.quote.update({ where: { id: current.id }, data: { status: "SENT" } });
    await prisma.activityLog.create({ data: { action: "飞书发送报价", entityType: "Quote", entityId: String(quote.id), entityName: quote.quoteNo, description: JSON.stringify({ externalSend: false, senderId, messageId }) } });
    rememberSentQuote({ senderId, chatId, messageId }, quote);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "QUOTE", stage: "SENT", entityId: quote.id, entityType: "Quote", action: "sendQuote" });
    return { success: true, message: `报价已标记为已发送\n报价编号：${quote.quoteNo}\n系统仅更新状态，未实际发送外部邮件。`, entityType: "Quote", entityId: quote.id };
  } catch (error) {
    return safeError(error, "发送报价失败，请稍后重试。");
  }
}

export async function validateAcceptQuotePlan(ref: EntityReference, context?: FeishuOperationContext): Promise<PlanResult> {
  const resolved = await resolveQuote(ref, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const quote = resolved.entity;
  if (quote.status === "ACCEPTED") return { success: false, message: "该报价已接受，不能重复接受。" };
  const summary = [`即将标记报价为已接受：`, `报价编号：${quote.quoteNo}`, `客户：${quote.customer?.company || "未关联"}`, `金额：${money(quote.totalPrice)} ${quote.currency}`, `当前状态：${quote.status}`, `接受后状态：ACCEPTED`, "不会自动转订单，除非用户明确要求。", "未确认前不会写入数据库。"].join("\n");
  return { success: true, message: summary, entityType: "Quote", entityId: quote.id, plan: { intent: "ACCEPT_QUOTE", entityType: "Quote", entityId: quote.id, validatedParameters: { data: { status: "ACCEPTED" }, originalMessageId: context?.messageId, context }, beforeValues: { status: quote.status }, calculatedTotals: {}, summary } };
}

export async function acceptQuoteService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const current = await prisma.quote.findUnique({ where: { id: plan.entityId! } });
    if (!current) return { success: false, message: "报价不存在。" };
    if (current.status === "ACCEPTED") {
      rememberAcceptedQuote({ senderId, chatId, messageId }, current);
      return { success: false, message: "该报价已接受，不能重复接受。" };
    }
    const quote = await prisma.quote.update({ where: { id: current.id }, data: { status: "ACCEPTED" } });
    await prisma.activityLog.create({ data: { action: "飞书接受报价", entityType: "Quote", entityId: String(quote.id), entityName: quote.quoteNo, description: JSON.stringify({ senderId, messageId }) } });
    rememberAcceptedQuote({ senderId, chatId, messageId }, quote);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "QUOTE", stage: "ACCEPTED", entityId: quote.id, entityType: "Quote", action: "acceptQuote" });
    return { success: true, message: `报价已标记为已接受\n报价编号：${quote.quoteNo}`, entityType: "Quote", entityId: quote.id };
  } catch (error) {
    return safeError(error, "接受报价失败，请稍后重试。");
  }
}

export async function validateQuoteToOrderPlan(ref: EntityReference, context?: FeishuOperationContext): Promise<PlanResult> {
  const quoteRef = resolveQuoteToOrderReferenceForQuery(ref, context);
  if (!quoteRef.ref) return { success: false, message: quoteRef.message || "请提供报价ID。" };
  const resolved = await resolveQuote(quoteRef.ref, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const quote = resolved.entity;
  if (quote.orders?.length || (quote as any).convertedOrderId) {
    const existingOrder = quote.orders?.[0];
    return { success: false, message: `该报价已生成订单：${existingOrder?.orderNo || (quote as any).convertedOrderId}` };
  }
  if (quote.status !== "ACCEPTED") return { success: false, message: "报价尚未接受，请先接受报价后再转订单。" };
  if (!quote.customerId) return { success: false, message: "报价缺少客户，不能转订单。" };
  const summary = [`即将把报价转为订单：`, `报价：${quote.quoteNo}`, `客户：${quote.customer?.company || "未关联"}`, `报价状态：${quote.status}`, `总金额：${money(quote.totalPrice)} ${quote.currency}`, `项目明细：${quote.items.length} 项`, "", "执行后：", "创建1个订单", "复制报价全部明细", "订单关联原报价", "未确认前不会创建Order。"].join("\n");
  return { success: true, message: summary, entityType: "Quote", entityId: quote.id, plan: { intent: "CONVERT_QUOTE_TO_ORDER", entityType: "Order", entityId: quote.id, validatedParameters: { quoteId: quote.id, originalMessageId: context?.messageId, context }, beforeValues: { quoteStatus: quote.status, orderCount: quote.orders.length }, calculatedTotals: { total: quote.totalPrice }, summary } };
}

export async function quoteToOrderService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id: Number(plan.validatedParameters.quoteId || plan.entityId) }, include: { items: true, project: true, orders: true } });
      if (!quote) throw new Error("报价不存在。");
      const existing = await tx.order.findFirst({ where: { quoteId: quote.id } });
      if (existing || (quote as any).convertedOrderId) return { quote, order: existing, duplicate: true };
      if (quote.status !== "ACCEPTED") throw new Error("报价尚未接受，请先接受报价后再转订单。");
      if (!quote.customerId) throw new Error("报价缺少客户，不能转订单。");
      const orderNo = await generateSequentialNumber("O", tx as any);
      const order = await tx.order.create({
        data: {
          orderNo,
          orderTitle: quote.quoteTitle || `订单 - ${quote.quoteNo}`,
          customerId: quote.customerId,
          projectId: quote.projectId,
          quoteId: quote.id,
          contactId: quote.customerContactId,
          businessLineId: quote.project?.businessLineId ?? null,
          orderStatus: "CONFIRMED",
          totalAmount: quote.totalPrice,
          subtotal: quote.totalPrice ? dec(quote.totalPrice).plus(quote.discountAmount || 0) : quote.totalPrice,
          discountAmount: quote.discountAmount,
          taxAmount: dec(0),
          chargeAmount: dec(0),
          currency: quote.currency,
          paymentTerm: quote.paymentTerms,
          deliveryTerm: quote.deliveryTime,
          notes: quote.remarks,
          tenantId: quote.tenantId,
        },
      });
      if (quote.items.length) {
        await tx.orderItem.createMany({ data: quote.items.map((item) => ({ orderId: order.id, tenantId: quote.tenantId, productId: item.productId, itemName: item.itemName, specification: item.specification, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, totalPrice: item.totalPrice, notes: item.notes, sortOrder: item.sortOrder })) });
      }
      await tx.activityLog.create({ data: { action: "飞书报价转订单", entityType: "Order", entityId: String(order.id), entityName: order.orderNo, description: JSON.stringify({ quoteId: quote.id, quoteNo: quote.quoteNo, senderId, messageId }) } });
      const convertedQuote = await tx.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED", convertedOrderId: order.id } });
      await tx.activityLog.create({ data: { action: "飞书更新报价转订单状态", entityType: "Quote", entityId: String(quote.id), entityName: quote.quoteNo, description: JSON.stringify({ status: "CONVERTED", convertedOrderId: order.id, senderId, messageId }) } });
      return { quote: convertedQuote, order, duplicate: false };
    });
    if (!result.order) return { success: false, message: "该报价已生成订单，但订单记录未找到，请检查数据一致性。", entityType: "Order" };
    rememberQuote({ senderId, chatId, messageId }, result.quote);
    rememberOrder({ senderId, chatId, messageId }, result.order);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "QUOTE", stage: "CONVERTED", entityId: result.quote.id, entityType: "Quote", action: "convertQuoteToOrder", flowKey: `Quote:${result.quote.id}` });
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "ORDER", stage: "CREATED", entityId: result.order.id, entityType: "Order", action: "convertQuoteToOrder", flowKey: `Order:${result.order.id}` });
    if (result.duplicate) {
      return { success: false, message: `该报价已生成订单\n订单编号：${result.order.orderNo}\n订单ID：${result.order.id}`, entityType: "Order", entityId: result.order.id };
    }
    return { success: true, message: `报价已转为订单\n报价：${result.quote.quoteNo}\n订单：${result.order.orderNo}`, entityType: "Order", entityId: result.order.id };
  } catch (error) {
    return safeError(error, "报价转订单失败，请稍后重试。");
  }
}

export async function validateCreateOrderPlan(orderInput: any, itemInput: QuoteOrderItemInput[], customerRef?: EntityReference, projectRef?: EntityReference, contactRef?: EntityReference, context?: FeishuOperationContext): Promise<PlanResult> {
  const customerResult = await resolveCustomer(customerRef, context);
  if (customerResult.kind !== "one") return { success: false, message: customerResult.message };
  const customer = customerResult.entity as any;
  const headerCurrency = normalizeCurrency(orderInput?.currency || null);
  const items = normalizeItems(itemInput || [], headerCurrency);
  const itemError = validateItems(items);
  if (itemError) return { success: false, message: itemError };
  const currency = ensureSingleCurrency(items, headerCurrency);
  if (!currency) return { success: false, message: "同一份订单只能使用一种币种，请统一币种后继续。" };
  const totals = calculateTotals(items, orderInput);
  let projectId: number | null = null;
  let businessLineId = customer.businessLineId || null;
  if (projectRef && (projectRef.id || projectRef.name || projectRef.useLastProject)) {
    const project = await resolveProject(projectRef, customer.id, context);
    if (project.kind !== "one") return { success: false, message: project.message };
    projectId = project.entity.id;
    businessLineId = project.entity.businessLineId;
  }
  let contactId: number | null = null;
  if (contactRef && (contactRef.id || contactRef.contactName || contactRef.name)) {
    const contact = await resolveContactReference({ id: contactRef.id, contactName: contactRef.contactName || contactRef.name }, customer.id);
    if (contact.kind !== "one") return { success: false, message: contact.message };
    contactId = contact.entity.id;
  }
  const data = {
    orderTitle: orderInput?.title || `订单 - ${customer.company}`,
    customerId: customer.id,
    projectId,
    contactId,
    businessLineId,
    orderStatus: normalizeOrderStatusCode(orderInput?.status) || "PENDING_CONFIRMATION",
    subtotal: totals.subtotal,
    discountAmount: totals.discount,
    taxAmount: totals.tax,
    chargeAmount: totals.shippingFee,
    totalAmount: totals.total,
    currency,
    paymentTerm: orderInput?.paymentTerms || null,
    deliveryTerm: orderInput?.deliveryTerms || null,
    expectedDeliveryDate: toDate(orderInput?.deliveryDate),
    notes: orderInput?.notes || null,
    tenantId: tenantId(),
  };
  const summary = [`即将创建订单：`, `客户：${customer.company}`, `币种：${currency}`, `明细数量：${items.length}`, `总金额：${money(totals.total)} ${currency}`, `交货日期：${formatDate(data.expectedDeliveryDate)}`, "未确认前不会写入数据库。"].join("\n");
  return { success: true, message: summary, entityType: "Order", plan: { intent: "CREATE_ORDER", entityType: "Order", validatedParameters: { data, items, originalMessageId: context?.messageId, context }, beforeValues: {}, calculatedTotals: totals, summary } };
}

export async function createOrderService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const data = { ...plan.validatedParameters.data, orderNo: await generateSequentialNumber("O", tx as any) };
      const order = await tx.order.create({ data });
      await tx.orderItem.createMany({ data: plan.validatedParameters.items.map((item: any) => ({ orderId: order.id, tenantId: data.tenantId, productId: item.productId, itemName: item.itemName, specification: item.specification, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, totalPrice: item.totalPrice, notes: item.notes, sortOrder: item.sortOrder })) });
      await tx.activityLog.create({ data: { action: "飞书创建订单", entityType: "Order", entityId: String(order.id), entityName: order.orderNo, description: JSON.stringify({ senderId, messageId }) } });
      return order;
    });
    rememberOrder({ senderId, chatId, messageId }, result);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "ORDER", stage: "CREATED", entityId: result.id, entityType: "Order", action: "createOrder" });
    return { success: true, message: `订单已创建\n订单编号：${result.orderNo}\nID：${result.id}`, entityType: "Order", entityId: result.id };
  } catch (error) {
    return safeError(error, "创建订单失败，请稍后重试。");
  }
}

export async function validateUpdateOrderPlan(ref: EntityReference, changesInput: any, context?: FeishuOperationContext): Promise<PlanResult> {
  const resolved = await resolveOrder(ref, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const order = resolved.entity;
  const data: Record<string, any> = {};
  if (changesInput?.status) {
    const transition = validateOrderTransition(order.orderStatus, changesInput.status);
    if (!transition.ok) return { success: false, message: transition.message || "订单状态不合法。" };
    data.orderStatus = transition.status;
  }
  if (changesInput?.deliveryDate) data.expectedDeliveryDate = toDate(changesInput.deliveryDate);
  if (changesInput?.paymentTerms) data.paymentTerm = changesInput.paymentTerms;
  if (changesInput?.deliveryTerms) data.deliveryTerm = changesInput.deliveryTerms;
  if (changesInput?.productionNotes || changesInput?.notes) data.notes = changesInput.productionNotes || changesInput.notes;
  if (Object.keys(data).length === 0) return { success: false, message: "请提供要修改的订单字段。" };
  const summary = [`即将更新订单：`, `订单：${order.orderNo}`, `客户：${order.customer?.company || "未关联"}`, `变更字段：${Object.keys(data).join("、")}`, "未确认前不会写入数据库。"].join("\n");
  return { success: true, message: summary, entityType: "Order", entityId: order.id, plan: { intent: "UPDATE_ORDER", entityType: "Order", entityId: order.id, validatedParameters: { data, originalMessageId: context?.messageId, context }, beforeValues: { orderStatus: order.orderStatus, totalAmount: order.totalAmount }, calculatedTotals: {}, summary } };
}

export async function updateOrderService(plan: QuoteOrderPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const order = await prisma.order.update({ where: { id: plan.entityId! }, data: plan.validatedParameters.data });
    await prisma.activityLog.create({ data: { action: "飞书更新订单", entityType: "Order", entityId: String(order.id), entityName: order.orderNo, description: JSON.stringify({ fields: Object.keys(plan.validatedParameters.data), senderId, messageId }) } });
    rememberOrder({ senderId, chatId, messageId }, order);
    recordQuoteOrderIntent({ senderId, chatId, messageId }, { type: "ORDER", stage: "UPDATED", entityId: order.id, entityType: "Order", action: "updateOrder" });
    return { success: true, message: `订单已更新\n订单编号：${order.orderNo}`, entityType: "Order", entityId: order.id };
  } catch (error) {
    return safeError(error, "更新订单失败，请稍后重试。");
  }
}

export async function rememberQuoteContextById(id: string | number, context?: FeishuOperationContext) {
  const resolved = await resolveQuote({ id }, context);
  return resolved.kind === "one";
}

export async function rememberOrderContextById(id: string | number, context?: FeishuOperationContext) {
  const resolved = await resolveOrder({ id }, context);
  return resolved.kind === "one";
}

export const __quoteOrderFlowTestUtils = {
  dec,
  normalizeItems,
  calculateTotals,
  normalizeCurrency,
  resolveQuoteReferenceForTest: resolveQuoteReferenceForQuery,
  resolveQuoteToOrderReferenceForTest: resolveQuoteToOrderReferenceForQuery,
  resolveOrderReferenceForTest: resolveOrderReferenceForQuery,
  rememberQuoteForTest(context: FeishuOperationContext, quote: { id: number; quoteNo: string }) {
    rememberQuote(context, quote);
    return getContext(context);
  },
  rememberCustomerForTest(context: FeishuOperationContext, customer: { id: number; company?: string | null; converted?: boolean }) {
    return rememberCustomerContext(context, customer, { converted: !!customer.converted });
  },
  rememberAcceptedQuoteForTest(context: FeishuOperationContext, quote: { id: number; quoteNo: string }) {
    rememberAcceptedQuote(context, quote);
    return getContext(context);
  },
  rememberSentQuoteForTest(context: FeishuOperationContext, quote: { id: number; quoteNo: string }) {
    rememberSentQuote(context, quote);
    return getContext(context);
  },
};
