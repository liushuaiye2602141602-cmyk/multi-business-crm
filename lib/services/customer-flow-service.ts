import prisma from "@/lib/prisma";
import { getLocalUserId, getLocalWorkspaceId } from "@/lib/local-context";

type Db = typeof prisma;

export type EntityRef = {
  id?: string | number | null;
  companyName?: string | null;
  customerName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  useLastLead?: boolean | null;
};

export type ResolveResult<T> =
  | { kind: "none"; message: string }
  | { kind: "one"; entity: T }
  | { kind: "many"; entities: T[]; message: string };

export type CustomerInput = {
  company?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  address?: string | null;
  requirement?: string | null;
  notes?: string | null;
  stage?: string | null;
  grade?: string | null;
  businessLineId?: number | null;
  businessLineName?: string | null;
  primaryContact?: ContactInput | null;
};

export type ContactInput = {
  name?: string | null;
  title?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  isPrimary?: boolean | null;
};

export type CustomerChanges = Partial<CustomerInput>;
export type ContactChanges = Partial<ContactInput>;

export type ValidatedPlan = {
  intent: string;
  entityType: "Lead" | "Customer" | "Contact";
  entityId?: number;
  validatedParameters: Record<string, unknown>;
  beforeValues: Record<string, unknown>;
  summary: string;
};

export type ServiceResult = {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
};

export type FeishuOperationContext = {
  senderId?: string;
  chatId?: string;
  messageId?: string;
  workspaceId?: number;
};

export type LeadConversationContext = {
  activeLeadId?: number;
  activeLeadCompany?: string;
  lastLeadId?: number;
  lastConvertedCustomerId?: number;
  updatedAt: number;
  expiresAt: number;
};

const LEAD_CONTEXT_TTL_MS = 30 * 60 * 1000;
const leadConversationContexts = new Map<string, LeadConversationContext>();

function getLeadContextKey(context?: FeishuOperationContext | null): string | null {
  if (!context?.senderId || !context.chatId) return null;
  return `${context.chatId}::${context.senderId}`;
}

function getLeadConversationContext(context?: FeishuOperationContext | null): LeadConversationContext | null {
  const key = getLeadContextKey(context);
  if (!key) return null;
  const current = leadConversationContexts.get(key);
  if (!current) return null;
  if (current.expiresAt < Date.now()) {
    leadConversationContexts.delete(key);
    return null;
  }
  return current;
}

function patchLeadConversationContext(
  context: FeishuOperationContext | undefined | null,
  patch: Partial<Omit<LeadConversationContext, "updatedAt" | "expiresAt">>,
): LeadConversationContext | null {
  const key = getLeadContextKey(context);
  if (!key) return null;
  const now = Date.now();
  const previous = getLeadConversationContext(context) || { updatedAt: now, expiresAt: now + LEAD_CONTEXT_TTL_MS };
  const next: LeadConversationContext = {
    ...previous,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== null && value !== undefined)),
    updatedAt: now,
    expiresAt: now + LEAD_CONTEXT_TTL_MS,
  };
  leadConversationContexts.set(key, next);
  return next;
}

export function rememberLeadContext(
  context: FeishuOperationContext | undefined | null,
  lead: { id: number; company?: string | null },
): LeadConversationContext | null {
  return patchLeadConversationContext(context, {
    lastLeadId: lead.id,
    activeLeadId: lead.id,
    activeLeadCompany: lead.company || undefined,
  });
}

export function rememberConvertedCustomerContext(
  context: FeishuOperationContext | undefined | null,
  customer: { id: number },
): LeadConversationContext | null {
  return patchLeadConversationContext(context, {
    lastConvertedCustomerId: customer.id,
  });
}

const CUSTOMER_STAGE_MAP: Record<string, string> = {
  "潜在客户": "POTENTIAL",
  "意向客户": "INTENT",
  "正式客户": "FIRST_DEAL",
  "初次成交": "FIRST_DEAL",
  "多次成交": "REPEAT_DEAL",
  VIP: "VIP",
  POTENTIAL: "POTENTIAL",
  INTENT: "INTENT",
  FIRST_DEAL: "FIRST_DEAL",
  REPEAT_DEAL: "REPEAT_DEAL",
};

const CUSTOMER_STATUS_MAP: Record<string, string> = {
  "潜在": "POTENTIAL",
  "活跃": "ACTIVE",
  "正式": "ACTIVE",
  "已成交": "WON",
  "流失": "LOST",
  "休眠": "INACTIVE",
  POTENTIAL: "POTENTIAL",
  ACTIVE: "ACTIVE",
  WON: "WON",
  LOST: "LOST",
  INACTIVE: "INACTIVE",
};

export function normalizeEntityName(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[“”"'《》「」]/g, "")
    .replace(/[，。！？；：,\s]+/g, " ")
    .trim()
    .toLowerCase();
}

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireNonBlank(value: string | null | undefined, label: string): string | null {
  if (!value || !value.trim() || ["未知", "待补充", "无", "null", "undefined"].includes(value.trim())) {
    return `请提供有效的${label}。`;
  }
  return null;
}

function safeError(error: unknown, fallback: string): ServiceResult {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/Prisma|DATABASE_URL|password|secret|api[_-]?key/i.test(raw)) {
    return { success: false, message: fallback };
  }
  return { success: false, message: raw || fallback };
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "暂未填写";
  if (value instanceof Date) return value.toLocaleString("zh-CN", { hour12: false });
  return String(value);
}

function buildCandidates<T extends { id: number; company?: string; name?: string; contactName?: string | null; email?: string | null; phone?: string | null }>(
  kind: "线索" | "客户" | "联系人",
  items: T[],
): string {
  return [
    `找到多条匹配${kind}，请进一步选择：`,
    ...items.map((item) => {
      const title = item.company || item.name || "";
      const contact = item.contactName ? `｜联系人：${item.contactName}` : "";
      const channel = item.email || item.phone || "暂未填写";
      return `${kind}ID ${item.id}｜${title}${contact}｜${channel}`;
    }),
  ].join("\n");
}

function listChanged(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return Object.keys(after).filter((key) => String(before[key] ?? "") !== String(after[key] ?? ""));
}

export async function resolveLeadReference(ref: EntityRef, db: Db = prisma): Promise<ResolveResult<any>> {
  if (!ref) return { kind: "none", message: "请提供线索ID、邮箱、电话或公司名称。" };
  const tenantId = getLocalWorkspaceId();
  if (ref.id) {
    const lead = await db.lead.findFirst({ where: { tenantId, id: Number(ref.id) }, include: { businessLine: true } });
    return lead ? { kind: "one", entity: lead } : { kind: "none", message: `未找到线索ID ${ref.id}。` };
  }
  if (ref.email) {
    const leads = await db.lead.findMany({ where: { tenantId, email: { equals: ref.email, mode: "insensitive" } }, include: { businessLine: true }, take: 10 });
    return resolveList("线索", leads);
  }
  const phone = ref.phone || ref.whatsapp;
  if (phone) {
    const leads = await db.lead.findMany({ where: { tenantId, OR: [{ phone }, { whatsapp: phone }] }, include: { businessLine: true }, take: 10 });
    return resolveList("线索", leads);
  }
  const name = ref.companyName || ref.customerName;
  if (name) {
    const exact = await db.lead.findMany({ where: { tenantId, company: { equals: name, mode: "insensitive" } }, include: { businessLine: true }, take: 10 });
    if (exact.length) return resolveList("线索", exact);
    const fuzzy = await db.lead.findMany({ where: { tenantId, company: { contains: name, mode: "insensitive" } }, include: { businessLine: true }, take: 10 });
    return resolveList("线索", fuzzy);
  }
  if (ref.contactName) {
    const leads = await db.lead.findMany({ where: { tenantId, contactName: { contains: ref.contactName, mode: "insensitive" } }, include: { businessLine: true }, take: 10 });
    return resolveList("线索", leads);
  }
  return { kind: "none", message: "请提供线索ID、邮箱、电话或公司名称。" };
}

async function resolveLeadForConversion(
  ref: EntityRef | undefined | null,
  context?: FeishuOperationContext | null,
  db: Db = prisma,
): Promise<ResolveResult<any>> {
  const recent = getLeadConversationContext(context);
  if (recent?.activeLeadId) {
    return resolveLeadReference({ id: recent.activeLeadId }, db);
  }
  if (recent?.lastLeadId) {
    return resolveLeadReference({ id: recent.lastLeadId }, db);
  }
  return resolveLeadReference(ref || {}, db);
}

export async function resolveCustomerReference(ref: EntityRef, db: Db = prisma): Promise<ResolveResult<any>> {
  if (!ref) return { kind: "none", message: "请提供客户ID、邮箱、电话或公司名称。" };
  const tenantId = getLocalWorkspaceId();
  const include = { contacts: true, businessLine: true };
  if (ref.id) {
    const customer = await db.customer.findFirst({ where: { tenantId, id: Number(ref.id) }, include });
    return customer ? { kind: "one", entity: customer } : { kind: "none", message: `未找到客户ID ${ref.id}。` };
  }
  if (ref.email) {
    const customers = await db.customer.findMany({ where: { tenantId, email: { equals: ref.email, mode: "insensitive" } }, include, take: 10 });
    return resolveList("客户", customers);
  }
  const phone = ref.phone || ref.whatsapp;
  if (phone) {
    const customers = await db.customer.findMany({ where: { tenantId, OR: [{ phone }, { whatsapp: phone }] }, include, take: 10 });
    return resolveList("客户", customers);
  }
  const name = ref.companyName || ref.customerName;
  if (name) {
    const exact = await db.customer.findMany({ where: { tenantId, company: { equals: name, mode: "insensitive" } }, include, take: 10 });
    if (exact.length) return resolveList("客户", exact);
    const fuzzy = await db.customer.findMany({ where: { tenantId, company: { contains: name, mode: "insensitive" } }, include, take: 10 });
    return resolveList("客户", fuzzy);
  }
  return { kind: "none", message: "请提供客户ID、邮箱、电话或公司名称。" };
}

export async function resolveContactReference(ref: EntityRef, customerId?: number, db: Db = prisma): Promise<ResolveResult<any>> {
  if (!ref) return { kind: "none", message: "请提供联系人ID、邮箱、电话或姓名。" };
  const whereBase = customerId ? { customerId } : {};
  const include = { customer: true };
  if (ref.id) {
    const contact = await db.contact.findFirst({ where: { ...whereBase, id: Number(ref.id) }, include });
    return contact ? { kind: "one", entity: contact } : { kind: "none", message: `未找到联系人ID ${ref.id}。` };
  }
  if (ref.email) {
    const contacts = await db.contact.findMany({ where: { ...whereBase, email: { equals: ref.email, mode: "insensitive" } }, include, take: 10 });
    return resolveList("联系人", contacts);
  }
  const phone = ref.phone || ref.whatsapp;
  if (phone) {
    const contacts = await db.contact.findMany({ where: { ...whereBase, OR: [{ phone }, { whatsapp: phone }] }, include, take: 10 });
    return resolveList("联系人", contacts);
  }
  if (ref.contactName) {
    const contacts = await db.contact.findMany({ where: { ...whereBase, name: { contains: ref.contactName, mode: "insensitive" } }, include, take: 10 });
    return resolveList("联系人", contacts);
  }
  return { kind: "none", message: "请提供联系人ID、邮箱、电话或姓名。" };
}

function resolveList<T extends { id: number; company?: string; name?: string }>(kind: "线索" | "客户" | "联系人", items: T[]): ResolveResult<T> {
  if (items.length === 0) return { kind: "none", message: `未找到匹配${kind}。` };
  if (items.length === 1) return { kind: "one", entity: items[0] };
  return { kind: "many", entities: items, message: buildCandidates(kind, items) };
}

async function resolveBusinessLine(input?: { businessLineId?: number | null; businessLineName?: string | null }, db: Db = prisma) {
  if (input?.businessLineId) {
    const line = await db.businessLine.findUnique({ where: { id: input.businessLineId } });
    return line ? { ok: true as const, id: line.id, name: line.name } : { ok: false as const, message: `未找到业务线ID ${input.businessLineId}。` };
  }
  if (input?.businessLineName) {
    const lines = await db.businessLine.findMany({ where: { name: { contains: input.businessLineName, mode: "insensitive" } }, take: 10 });
    if (lines.length === 1) return { ok: true as const, id: lines[0].id, name: lines[0].name };
    if (lines.length > 1) return { ok: false as const, message: `匹配到多个业务线：${lines.map((line) => `${line.id}.${line.name}`).join("；")}，请明确选择。` };
    return { ok: false as const, message: `未找到业务线“${input.businessLineName}”。` };
  }
  const lines = await db.businessLine.findMany({ orderBy: { id: "asc" }, take: 2 });
  if (lines.length === 1) return { ok: true as const, id: lines[0].id, name: lines[0].name };
  if (lines.length > 1) return { ok: false as const, message: `存在多个业务线，请先指定业务线：${lines.map((line) => `${line.id}.${line.name}`).join("；")}。` };
  return { ok: false as const, message: "系统中还没有业务线，请先在CRM网页中创建业务线。" };
}

async function findCustomerDuplicate(input: CustomerInput, excludeCustomerId?: number, db: Db = prisma): Promise<string | null> {
  const tenantId = getLocalWorkspaceId();
  const or: any[] = [];
  if (input.company) or.push({ company: { equals: input.company, mode: "insensitive" } });
  if (input.email || input.primaryContact?.email) or.push({ email: { equals: input.email || input.primaryContact?.email, mode: "insensitive" } });
  if (input.phone || input.primaryContact?.phone) or.push({ phone: input.phone || input.primaryContact?.phone });
  if (input.whatsapp || input.primaryContact?.whatsapp) or.push({ whatsapp: input.whatsapp || input.primaryContact?.whatsapp });
  if (or.length === 0) return null;
  const duplicate = await db.customer.findFirst({
    where: { tenantId, ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}), OR: or },
  });
  return duplicate ? `发现重复客户：客户ID ${duplicate.id}｜${duplicate.company}。请先确认目标或更换字段值。` : null;
}

async function findContactDuplicate(customerId: number, input: ContactInput, excludeContactId?: number, db: Db = prisma): Promise<string | null> {
  const or: any[] = [];
  if (input.email) or.push({ email: { equals: input.email, mode: "insensitive" } });
  if (input.phone) or.push({ phone: input.phone });
  if (input.whatsapp) or.push({ whatsapp: input.whatsapp });
  if (input.name) or.push({ name: { equals: input.name, mode: "insensitive" } });
  if (or.length === 0) return null;
  const duplicate = await db.contact.findFirst({
    where: { customerId, ...(excludeContactId ? { id: { not: excludeContactId } } : {}), OR: or },
  });
  return duplicate ? `发现重复联系人：联系人ID ${duplicate.id}｜${duplicate.name}。请先确认目标或更换字段值。` : null;
}

export async function validateConvertLeadToCustomerPlan(
  ref: EntityRef,
  contextInput?: string | FeishuOperationContext,
): Promise<{ success: boolean; message: string; plan?: ValidatedPlan; entityType?: string; entityId?: number }> {
  const context = typeof contextInput === "string" ? undefined : contextInput;
  const originalMessageId = typeof contextInput === "string" ? contextInput : contextInput?.messageId;
  const resolved = await resolveLeadForConversion(ref, context);
  if (resolved.kind === "none") return { success: false, message: resolved.message };
  if (resolved.kind === "many") return { success: false, message: resolved.message };
  const lead = resolved.entity;
  if (lead.convertedCustomerId || lead.status === "CONVERTED") return { success: false, message: "该线索已转客户，不能重复转换。" };
  const duplicate = await findCustomerDuplicate({ company: lead.company, email: lead.email, phone: lead.phone, whatsapp: lead.whatsapp });
  if (duplicate) return { success: false, message: duplicate };

  const warning = lead.status === "LOST" || lead.status === "DORMANT" ? `\n警告：当前线索状态为 ${lead.status}，请确认仍要转客户。` : "";
  const beforeValues = {
    leadId: lead.id,
    company: lead.company,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    businessLineId: lead.businessLineId,
    status: lead.status,
  };
  const summary = [
    "即将把线索转为客户：",
    `线索：${lead.company}`,
    `联系人：${formatValue(lead.contactName)}`,
    `邮箱：${formatValue(lead.email)}`,
    `电话：${formatValue(lead.phone)}`,
    `业务线：${formatValue(lead.businessLine?.name || lead.businessLineId)}`,
    `当前状态：${formatValue(lead.status)}`,
    warning,
    "执行后将：",
    "创建1个客户",
    "创建1个主联系人",
    "将线索状态改为已转客户",
    "未确认前不会写入数据库。",
  ].filter(Boolean).join("\n");
  const plan: ValidatedPlan = {
    intent: "CONVERT_LEAD_TO_CUSTOMER",
    entityType: "Lead",
    entityId: lead.id,
    beforeValues,
    validatedParameters: { leadId: lead.id, originalMessageId },
    summary,
  };
  return { success: true, message: summary, plan, entityType: "Lead", entityId: lead.id };
}

export async function convertLeadToCustomerService(plan: ValidatedPlan, actorId?: string, messageId?: string): Promise<ServiceResult> {
  try {
    const leadId = Number(plan.validatedParameters.leadId || plan.entityId);
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new Error("线索不存在。");
      if (lead.convertedCustomerId || lead.status === "CONVERTED") throw new Error("该线索已转客户，不能重复转换。");
      const duplicateOr: any[] = [
        { company: { equals: lead.company, mode: "insensitive" } },
        ...(lead.email ? [{ email: { equals: lead.email, mode: "insensitive" } }] : []),
        ...(lead.phone ? [{ phone: lead.phone }] : []),
        ...(lead.whatsapp ? [{ whatsapp: lead.whatsapp }] : []),
      ];
      const duplicate = await tx.customer.findFirst({
        where: {
          tenantId: lead.tenantId || getLocalWorkspaceId(),
          OR: duplicateOr,
        },
      });
      if (duplicate) throw new Error(`发现重复客户：客户ID ${duplicate.id}｜${duplicate.company}。`);
      const customer = await tx.customer.create({
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
          lifecycleStage: "POTENTIAL",
          customerType: "UNKNOWN",
          ownerId: getLocalUserId(),
          ownerName: actorId || "飞书",
          tenantId: lead.tenantId || getLocalWorkspaceId(),
        },
      });
      const contact = await tx.contact.create({
        data: {
          customerId: customer.id,
          name: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          isPrimary: true,
          notes: `由线索 ${lead.company} 转换`,
        },
      });
      await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED", convertedCustomerId: customer.id } });
      await tx.activityLog.create({
        data: {
          action: "飞书更新线索",
          entityType: "Lead",
          entityId: String(lead.id),
          entityName: lead.company,
          description: JSON.stringify({ source: "飞书", operation: "线索转客户", customerId: customer.id, contactId: contact.id, messageId, actorId }),
        },
      });
      return { customer, contact, lead };
    });
    return { success: true, message: `线索已转为客户\n客户：${result.customer.company}\n主联系人：${result.contact.name}`, entityType: "Customer", entityId: result.customer.id, entityName: result.customer.company };
  } catch (error) {
    return safeError(error, "线索转客户失败，请稍后重试或联系管理员。");
  }
}

export async function validateCreateCustomerPlan(input: CustomerInput, originalMessageId?: string) {
  const companyError = requireNonBlank(input.company, "客户公司名称");
  if (companyError) return { success: false, message: companyError };
  const contactError = requireNonBlank(input.primaryContact?.name, "主联系人姓名");
  if (contactError) return { success: false, message: contactError };
  if (!isValidEmail(input.email) || !isValidEmail(input.primaryContact?.email)) return { success: false, message: "邮箱格式不正确，请提供有效邮箱。" };
  const businessLine = await resolveBusinessLine(input);
  if (!businessLine.ok) return { success: false, message: businessLine.message };
  const duplicate = await findCustomerDuplicate(input);
  if (duplicate) return { success: false, message: duplicate };
  const primary = input.primaryContact!;
  const plan: ValidatedPlan = {
    intent: "CREATE_CUSTOMER",
    entityType: "Customer",
    beforeValues: {},
    validatedParameters: { ...input, businessLineId: businessLine.id, primaryContact: primary, originalMessageId },
    summary: [
      "理解摘要：创建客户",
      `客户：${input.company}`,
      `主联系人：${primary.name}`,
      `邮箱：${formatValue(input.email || primary.email)}`,
      `电话：${formatValue(input.phone || primary.phone)}`,
      `业务线：${businessLine.name}`,
      "执行后将创建1个客户和1个主联系人。",
      "未确认前不会写入数据库。",
    ].join("\n"),
  };
  return { success: true, message: plan.summary, plan, entityType: "Customer" };
}

export async function createCustomerService(plan: ValidatedPlan, actorId?: string, messageId?: string): Promise<ServiceResult> {
  try {
    const p = plan.validatedParameters as CustomerInput;
    const primary = p.primaryContact || {};
    const result = await prisma.$transaction(async (tx) => {
      const duplicateOr: any[] = [
        { company: { equals: p.company!, mode: "insensitive" } },
        ...(p.email || primary.email ? [{ email: { equals: p.email || primary.email!, mode: "insensitive" } }] : []),
        ...(p.phone || primary.phone ? [{ phone: p.phone || primary.phone! }] : []),
        ...(p.whatsapp || primary.whatsapp ? [{ whatsapp: p.whatsapp || primary.whatsapp! }] : []),
      ];
      const duplicate = await tx.customer.findFirst({
        where: {
          tenantId: getLocalWorkspaceId(),
          OR: duplicateOr,
        },
      });
      if (duplicate) throw new Error(`发现重复客户：客户ID ${duplicate.id}｜${duplicate.company}。`);
      const customer = await tx.customer.create({
        data: {
          company: p.company!,
          contactName: primary.name!,
          country: p.country || null,
          phone: p.phone || primary.phone || null,
          email: p.email || primary.email || null,
          whatsapp: p.whatsapp || primary.whatsapp || null,
          website: p.website || null,
          address: p.address || null,
          remark: p.notes || p.requirement || null,
          lifecycleStage: normalizeCustomerStage(p.stage),
          customerStatus: normalizeCustomerStatus(p.stage),
          leadGrade: normalizeGrade(p.grade),
          businessLineId: Number(p.businessLineId),
          tenantId: getLocalWorkspaceId(),
          ownerId: getLocalUserId(),
          ownerName: actorId || "飞书",
        },
      });
      const contact = await tx.contact.create({
        data: {
          customerId: customer.id,
          name: primary.name!,
          position: primary.title || null,
          department: primary.department || null,
          email: primary.email || p.email || null,
          phone: primary.phone || p.phone || null,
          whatsapp: primary.whatsapp || p.whatsapp || null,
          notes: primary.notes || null,
          isPrimary: true,
        },
      });
      await tx.activityLog.create({
        data: { action: "飞书创建客户", entityType: "Customer", entityId: String(customer.id), entityName: customer.company, description: JSON.stringify({ source: "飞书", operation: "创建客户", contactId: contact.id, messageId, actorId }) },
      });
      return { customer, contact };
    });
    return { success: true, message: `客户已创建\n客户：${result.customer.company}\n主联系人：${result.contact.name}`, entityType: "Customer", entityId: result.customer.id };
  } catch (error) {
    return safeError(error, "创建客户失败，请稍后重试或联系管理员。");
  }
}

export async function validateUpdateCustomerPlan(ref: EntityRef, changes: CustomerChanges, originalMessageId?: string) {
  const resolved = await resolveCustomerReference(ref);
  if (resolved.kind === "none") return { success: false, message: resolved.message };
  if (resolved.kind === "many") return { success: false, message: resolved.message };
  const customer = resolved.entity;
  const normalized = normalizeCustomerChanges(changes);
  if (Object.keys(normalized).length === 0) return { success: false, message: "请明确要更新的客户字段。" };
  if (!isValidEmail(normalized.email as string | null | undefined)) return { success: false, message: "邮箱格式不正确，请提供有效邮箱。" };
  const duplicate = await findCustomerDuplicate({ ...normalized, primaryContact: null }, customer.id);
  if (duplicate) return { success: false, message: duplicate };
  const beforeValues = pickCustomerValues(customer, Object.keys(normalized));
  const changedFields = listChanged(beforeValues, normalized);
  const plan: ValidatedPlan = {
    intent: "UPDATE_CUSTOMER",
    entityType: "Customer",
    entityId: customer.id,
    beforeValues,
    validatedParameters: { customerId: customer.id, changes: normalized, changedFields, originalMessageId },
    summary: buildChangeSummary("即将更新客户", customer.company, beforeValues, normalized),
  };
  return { success: true, message: plan.summary, plan, entityType: "Customer", entityId: customer.id };
}

export async function updateCustomerService(plan: ValidatedPlan, actorId?: string, messageId?: string): Promise<ServiceResult> {
  try {
    const customerId = Number(plan.validatedParameters.customerId || plan.entityId);
    const changes = plan.validatedParameters.changes as Record<string, unknown>;
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.customer.findUnique({ where: { id: customerId } });
      if (!before) throw new Error("客户不存在。");
      const customer = await tx.customer.update({ where: { id: customerId }, data: changes as any });
      await tx.activityLog.create({
        data: { action: "飞书更新客户", entityType: "Customer", entityId: String(customer.id), entityName: customer.company, description: JSON.stringify({ source: "飞书", operation: "更新客户", changedFields: Object.keys(changes), beforeValues: plan.beforeValues, afterValues: changes, messageId, actorId }) },
      });
      return customer;
    });
    return { success: true, message: `客户已更新\n客户：${result.company}`, entityType: "Customer", entityId: result.id };
  } catch (error) {
    return safeError(error, "更新客户失败，请稍后重试或联系管理员。");
  }
}

export async function validateCreateContactPlan(customerRef: EntityRef, contact: ContactInput, originalMessageId?: string) {
  const customerResolved = await resolveCustomerReference(customerRef);
  if (customerResolved.kind === "none") return { success: false, message: customerResolved.message };
  if (customerResolved.kind === "many") return { success: false, message: customerResolved.message };
  const customer = customerResolved.entity;
  const nameError = requireNonBlank(contact.name, "联系人姓名");
  if (nameError) return { success: false, message: nameError };
  if (!isValidEmail(contact.email)) return { success: false, message: "邮箱格式不正确，请提供有效邮箱。" };
  const duplicate = await findContactDuplicate(customer.id, contact);
  if (duplicate) return { success: false, message: duplicate };
  const plan: ValidatedPlan = {
    intent: "CREATE_CONTACT",
    entityType: "Customer",
    entityId: customer.id,
    beforeValues: { currentPrimary: customer.contacts?.find((item: any) => item.isPrimary)?.name || customer.contactName },
    validatedParameters: { customerId: customer.id, contact: { ...contact, isPrimary: !!contact.isPrimary }, originalMessageId },
    summary: [
      "理解摘要：新增联系人",
      `客户：${customer.company}`,
      `联系人：${contact.name}`,
      `邮箱：${formatValue(contact.email)}`,
      `电话：${formatValue(contact.phone)}`,
      `是否主联系人：${contact.isPrimary ? "是" : "否"}`,
      "未确认前不会写入数据库。",
    ].join("\n"),
  };
  return { success: true, message: plan.summary, plan, entityType: "Customer", entityId: customer.id };
}

export async function createContactService(plan: ValidatedPlan, actorId?: string, messageId?: string): Promise<ServiceResult> {
  try {
    const customerId = Number(plan.validatedParameters.customerId || plan.entityId);
    const contact = plan.validatedParameters.contact as ContactInput;
    const created = await prisma.$transaction(async (tx) => {
      const duplicateOr: any[] = [
        { name: { equals: contact.name!, mode: "insensitive" } },
        ...(contact.email ? [{ email: { equals: contact.email, mode: "insensitive" } }] : []),
        ...(contact.phone ? [{ phone: contact.phone }] : []),
        ...(contact.whatsapp ? [{ whatsapp: contact.whatsapp }] : []),
      ];
      const duplicate = await tx.contact.findFirst({
        where: {
          customerId,
          OR: duplicateOr,
        },
      });
      if (duplicate) throw new Error(`发现重复联系人：联系人ID ${duplicate.id}｜${duplicate.name}。`);
      if (contact.isPrimary) await tx.contact.updateMany({ where: { customerId }, data: { isPrimary: false } });
      const newContact = await tx.contact.create({
        data: {
          customerId,
          name: contact.name!,
          position: contact.title || null,
          department: contact.department || null,
          email: contact.email || null,
          phone: contact.phone || null,
          whatsapp: contact.whatsapp || null,
          notes: contact.notes || null,
          isPrimary: !!contact.isPrimary,
        },
      });
      if (contact.isPrimary) {
        await tx.customer.update({ where: { id: customerId }, data: { contactName: newContact.name, email: newContact.email, phone: newContact.phone, whatsapp: newContact.whatsapp } });
      }
      await tx.activityLog.create({
        data: { action: "飞书创建联系人", entityType: "Contact", entityId: String(newContact.id), entityName: newContact.name, description: JSON.stringify({ source: "飞书", operation: "创建联系人", customerId, isPrimary: !!contact.isPrimary, messageId, actorId }) },
      });
      return newContact;
    });
    return { success: true, message: `联系人已创建\n联系人：${created.name}`, entityType: "Contact", entityId: created.id };
  } catch (error) {
    return safeError(error, "创建联系人失败，请稍后重试或联系管理员。");
  }
}

export async function validateUpdateContactPlan(contactRef: EntityRef, customerRef: EntityRef | undefined, changes: ContactChanges, originalMessageId?: string) {
  let customerId: number | undefined;
  if (customerRef && Object.values(customerRef).some(Boolean)) {
    const customerResolved = await resolveCustomerReference(customerRef);
    if (customerResolved.kind === "none") return { success: false, message: customerResolved.message };
    if (customerResolved.kind === "many") return { success: false, message: customerResolved.message };
    customerId = customerResolved.entity.id;
  }
  const resolved = await resolveContactReference(contactRef, customerId);
  if (resolved.kind === "none") return { success: false, message: resolved.message };
  if (resolved.kind === "many") return { success: false, message: resolved.message };
  const contact = resolved.entity;
  const normalized = normalizeContactChanges(changes);
  if (Object.keys(normalized).length === 0) return { success: false, message: "请明确要更新的联系人字段。" };
  if (!isValidEmail(normalized.email as string | null | undefined)) return { success: false, message: "邮箱格式不正确，请提供有效邮箱。" };
  const duplicate = await findContactDuplicate(contact.customerId, normalized, contact.id);
  if (duplicate) return { success: false, message: duplicate };
  const beforeValues = pickContactValues(contact, Object.keys(normalized));
  const plan: ValidatedPlan = {
    intent: "UPDATE_CONTACT",
    entityType: "Contact",
    entityId: contact.id,
    beforeValues,
    validatedParameters: { contactId: contact.id, changes: normalized, originalMessageId },
    summary: buildChangeSummary("即将更新联系人", `${contact.customer?.company || ""}｜${contact.name}`, beforeValues, normalized),
  };
  return { success: true, message: plan.summary, plan, entityType: "Contact", entityId: contact.id };
}

export async function updateContactService(plan: ValidatedPlan, actorId?: string, messageId?: string): Promise<ServiceResult> {
  try {
    const contactId = Number(plan.validatedParameters.contactId || plan.entityId);
    const changes = plan.validatedParameters.changes as Record<string, unknown>;
    const contact = await prisma.$transaction(async (tx) => {
      const updated = await tx.contact.update({ where: { id: contactId }, data: changes as any });
      await tx.activityLog.create({
        data: { action: "飞书更新联系人", entityType: "Contact", entityId: String(updated.id), entityName: updated.name, description: JSON.stringify({ source: "飞书", operation: "更新联系人", changedFields: Object.keys(changes), beforeValues: plan.beforeValues, afterValues: changes, messageId, actorId }) },
      });
      return updated;
    });
    return { success: true, message: `联系人已更新\n联系人：${contact.name}`, entityType: "Contact", entityId: contact.id };
  } catch (error) {
    return safeError(error, "更新联系人失败，请稍后重试或联系管理员。");
  }
}

export async function validateSetPrimaryContactPlan(customerRef: EntityRef, contactRef: EntityRef, originalMessageId?: string) {
  const customerResolved = await resolveCustomerReference(customerRef);
  if (customerResolved.kind === "none") return { success: false, message: customerResolved.message };
  if (customerResolved.kind === "many") return { success: false, message: customerResolved.message };
  const customer = customerResolved.entity;
  const contactResolved = await resolveContactReference(contactRef, customer.id);
  if (contactResolved.kind === "none") return { success: false, message: contactResolved.message };
  if (contactResolved.kind === "many") return { success: false, message: contactResolved.message };
  const contact = contactResolved.entity;
  if (contact.customerId !== customer.id) return { success: false, message: "该联系人不属于目标客户，不能设为主联系人。" };
  const currentPrimary = customer.contacts?.find((item: any) => item.isPrimary);
  const plan: ValidatedPlan = {
    intent: "SET_PRIMARY_CONTACT",
    entityType: "Contact",
    entityId: contact.id,
    beforeValues: { currentPrimaryContactId: currentPrimary?.id || null, currentPrimaryContactName: currentPrimary?.name || customer.contactName || null },
    validatedParameters: { customerId: customer.id, contactId: contact.id, originalMessageId },
    summary: [
      "即将设置主联系人：",
      `客户：${customer.company}`,
      `当前主联系人：${formatValue(currentPrimary?.name || customer.contactName)}`,
      `新主联系人：${contact.name}`,
      "未确认前不会写入数据库。",
    ].join("\n"),
  };
  return { success: true, message: plan.summary, plan, entityType: "Contact", entityId: contact.id };
}

export async function setPrimaryContactService(plan: ValidatedPlan, actorId?: string, messageId?: string): Promise<ServiceResult> {
  try {
    const customerId = Number(plan.validatedParameters.customerId);
    const contactId = Number(plan.validatedParameters.contactId || plan.entityId);
    const contact = await prisma.$transaction(async (tx) => {
      const target = await tx.contact.findUnique({ where: { id: contactId } });
      if (!target || target.customerId !== customerId) throw new Error("该联系人不属于目标客户，不能设为主联系人。");
      await tx.contact.updateMany({ where: { customerId }, data: { isPrimary: false } });
      const updated = await tx.contact.update({ where: { id: contactId }, data: { isPrimary: true } });
      await tx.customer.update({ where: { id: customerId }, data: { contactName: updated.name, email: updated.email, phone: updated.phone, whatsapp: updated.whatsapp } });
      const primaryCount = await tx.contact.count({ where: { customerId, isPrimary: true } });
      if (primaryCount !== 1) throw new Error("主联系人唯一性校验失败，已回滚。");
      await tx.activityLog.create({
        data: { action: "飞书设置主联系人", entityType: "Contact", entityId: String(updated.id), entityName: updated.name, description: JSON.stringify({ source: "飞书", operation: "设置主联系人", customerId, beforeValues: plan.beforeValues, messageId, actorId }) },
      });
      return updated;
    });
    return { success: true, message: `主联系人已更新\n新主联系人：${contact.name}`, entityType: "Contact", entityId: contact.id };
  } catch (error) {
    return safeError(error, "设置主联系人失败，请稍后重试或联系管理员。");
  }
}

function normalizeCustomerStage(value?: string | null): any {
  if (!value) return "POTENTIAL";
  return CUSTOMER_STAGE_MAP[value] || "POTENTIAL";
}

function normalizeCustomerStatus(value?: string | null): any {
  if (!value) return "POTENTIAL";
  return CUSTOMER_STATUS_MAP[value] || "POTENTIAL";
}

function normalizeGrade(value?: string | null): any {
  const grade = String(value || "C").toUpperCase().replace("级", "");
  return ["A", "B", "C", "D"].includes(grade) ? grade : "C";
}

function normalizeCustomerChanges(changes: CustomerChanges): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (changes.company && changes.company.trim()) data.company = changes.company.trim();
  if (changes.country != null) data.country = changes.country;
  if (changes.phone != null) data.phone = changes.phone;
  if (changes.email != null) data.email = changes.email;
  if (changes.whatsapp != null) data.whatsapp = changes.whatsapp;
  if (changes.website != null) data.website = changes.website;
  if (changes.address != null) data.address = changes.address;
  if (changes.notes != null) data.remark = changes.notes;
  if (changes.requirement != null) data.remark = changes.requirement;
  if (changes.stage != null) {
    data.lifecycleStage = normalizeCustomerStage(changes.stage);
    data.customerStatus = normalizeCustomerStatus(changes.stage);
  }
  if (changes.grade != null) data.leadGrade = normalizeGrade(changes.grade);
  if (changes.businessLineId != null) data.businessLineId = Number(changes.businessLineId);
  return data;
}

function normalizeContactChanges(changes: ContactChanges): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (changes.name && changes.name.trim()) data.name = changes.name.trim();
  if (changes.title != null) data.position = changes.title;
  if (changes.department != null) data.department = changes.department;
  if (changes.phone != null) data.phone = changes.phone;
  if (changes.email != null) data.email = changes.email;
  if (changes.whatsapp != null) data.whatsapp = changes.whatsapp;
  if (changes.notes != null) data.notes = changes.notes;
  return data;
}

function pickCustomerValues(customer: any, keys: string[]) {
  const values: Record<string, unknown> = {};
  for (const key of keys) values[key] = customer[key];
  return values;
}

function pickContactValues(contact: any, keys: string[]) {
  const values: Record<string, unknown> = {};
  for (const key of keys) values[key] = contact[key];
  return values;
}

function buildChangeSummary(title: string, name: string, beforeValues: Record<string, unknown>, afterValues: Record<string, unknown>) {
  return [
    `${title}：`,
    `对象：${name}`,
    "",
    "变更前：",
    ...Object.entries(beforeValues).map(([key, value]) => `${key}：${formatValue(value)}`),
    "",
    "变更后：",
    ...Object.entries(afterValues).map(([key, value]) => `${key}：${formatValue(value)}`),
    "",
    "未确认前不会写入数据库。",
  ].join("\n");
}

export const __customerFlowTestUtils = {
  normalizeEntityName,
  isValidEmail,
  normalizeCustomerChanges,
  normalizeContactChanges,
  resolveList,
  listChanged,
  buildChangeSummary,
  getLeadConversationContext,
  rememberLeadContext,
  rememberConvertedCustomerContext,
  resolveLeadForConversion,
};
