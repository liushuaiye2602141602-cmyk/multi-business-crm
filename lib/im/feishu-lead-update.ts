import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import type { ParsedIntent } from "./feishu-parser";

type LeadRecord = {
  id: number;
  company: string;
  contactName: string;
  country: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  status: string;
  temperature: string;
  grade: string;
  requirement: string | null;
  interestProducts: string | null;
  budget: unknown;
  currency: string;
  expectedClosing: Date | null;
  nextFollowUp: Date | null;
  remark: string | null;
  convertedCustomerId: number | null;
};

type LeadUpdateChanges = NonNullable<ParsedIntent["parameters"]["updateLead"]>["changes"];

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_INPUTS: Record<string, string> = {
  新线索: "NEW",
  新建: "NEW",
  已联系: "CONTACTED",
  需求确认中: "REQUIREMENT_CONFIRMING",
  报价中: "QUOTING",
  谈判中: "NEGOTIATING",
  已确认有效: "QUALIFIED",
  已确认: "QUALIFIED",
  已转客户: "CONVERTED",
  已转换: "CONVERTED",
  已成交: "WON",
  已丢失: "LOST",
  已流失: "LOST",
  休眠: "DORMANT",
};

const TEMPERATURE_INPUTS: Record<string, string> = {
  热: "HOT",
  高意向: "HOT",
  HOT: "HOT",
  温: "WARM",
  中意向: "WARM",
  WARM: "WARM",
  冷: "COLD",
  低意向: "COLD",
  COLD: "COLD",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  HOT: "热",
  WARM: "温",
  COLD: "冷",
};

const CURRENCY_INPUTS: Record<string, string> = {
  USD: "USD",
  美元: "USD",
  美金: "USD",
  CNY: "CNY",
  人民币: "CNY",
  元: "CNY",
  EUR: "EUR",
  欧元: "EUR",
};

const FIELD_LABELS: Record<string, string> = {
  company: "公司名称",
  contactName: "联系人姓名",
  country: "国家或地区",
  phone: "电话",
  email: "邮箱",
  whatsapp: "WhatsApp",
  requirement: "客户需求",
  interestProducts: "意向产品",
  budget: "预算",
  currency: "币种",
  expectedClosing: "预计成交时间",
  nextFollowUp: "下次跟进时间",
  remark: "备注",
  status: "状态",
  grade: "等级",
  temperature: "温度",
};

export async function validateUpdateLeadBeforeConfirmation(parsed: ParsedIntent, originalMessageId?: string) {
  const prepared = await prepareUpdateLead(parsed);
  if (!prepared.success) return prepared;
  parsed.parameters.updateLeadPlan = {
    originalMessageId,
    leadId: prepared.lead.id,
    changes: prepared.data.updateData,
    beforeValues: prepared.data.beforeValues,
    changedFields: prepared.data.changedFields,
  };
  return {
    success: true as const,
    message: buildUpdateLeadSummary(prepared.lead, prepared.data),
    entityType: "Lead",
    entityId: prepared.lead.id,
  };
}

export async function executeUpdateLead(
  parsed: ParsedIntent,
  senderId: string,
  messageId?: string,
) {
  try {
    const plan = parsed.parameters.updateLeadPlan;
    const prepared = plan
      ? await prepareUpdateLeadPlan(plan)
      : await prepareUpdateLead(parsed);
    if (!prepared.success) return { success: false, message: prepared.message };

    const updated = await prisma.lead.update({
      where: { id: prepared.lead.id },
      data: prepared.data.updateData,
    });

    await createActivityLog({
      action: "更新线索",
      entityType: "线索",
      entityId: prepared.lead.id,
      entityName: updated.company,
      description: [
        "来源：飞书",
        `修改字段：${prepared.data.changedFields.map((field) => FIELD_LABELS[field] || field).join("、")}`,
        `修改前值：${prepared.data.beforeLines.join("；")}`,
        `修改后值：${prepared.data.afterLines.join("；")}`,
        messageId ? `messageId：${messageId}` : null,
        plan?.originalMessageId ? `originalMessageId：${plan.originalMessageId}` : null,
        `执行用户：${senderId}`,
        `执行时间：${new Date().toISOString()}`,
      ].filter(Boolean).join("\n"),
    });

    return {
      success: true,
      message: [
        "线索已更新",
        `线索：${updated.company}`,
        `修改字段：${prepared.data.changedFields.map((field) => FIELD_LABELS[field] || field).join("、")}`,
      ].join("\n"),
      entityType: "Lead",
      entityId: updated.id,
    };
  } catch (error) {
    console.error("UPDATE_LEAD failed:", error instanceof Error ? error.message : String(error));
    return { success: false, message: "更新线索失败，请稍后重试或联系管理员。" };
  }
}

async function prepareUpdateLead(parsed: ParsedIntent): Promise<
  | { success: true; lead: LeadRecord; data: ReturnType<typeof buildUpdateData> }
  | { success: false; message: string }
> {
  const input = parsed.parameters.updateLead;
  if (!input) return { success: false, message: "请说明要更新的线索和字段。" };

  const resolved = await resolveLead(input.leadReference);
  if (!resolved.success) return resolved;

  const normalized = normalizeChanges(input.changes, resolved.lead);
  if (!normalized.success) return normalized;
  if (Object.keys(normalized.changes).length === 0) {
    return { success: false, message: "请说明要修改的字段。" };
  }

  if (resolved.lead.status === "CONVERTED" || resolved.lead.convertedCustomerId) {
    if (normalized.changes.status && normalized.changes.status !== "CONVERTED") {
      return { success: false, message: "已转客户线索不允许改回普通活跃状态。" };
    }
  }
  if (isHighRiskStatusRollback(resolved.lead.status, normalized.changes.status)) {
    return { success: false, message: "当前业务规则未允许高风险状态回退，请在网页端人工处理。" };
  }

  const conflict = await findUniqueConflict(resolved.lead.id, normalized.changes);
  if (conflict) return { success: false, message: conflict };

  return { success: true, lead: resolved.lead, data: buildUpdateData(resolved.lead, normalized.changes) };
}

async function prepareUpdateLeadPlan(plan: NonNullable<ParsedIntent["parameters"]["updateLeadPlan"]>): Promise<
  | { success: true; lead: LeadRecord; data: ReturnType<typeof buildUpdateData> }
  | { success: false; message: string }
> {
  const lead = await prisma.lead.findUnique({ where: { id: plan.leadId } });
  if (!lead) return { success: false, message: `未找到线索ID ${plan.leadId}。` };
  const leadRecord = lead as LeadRecord;
  if (leadRecord.status === "CONVERTED" || leadRecord.convertedCustomerId) {
    if (plan.changes.status && plan.changes.status !== "CONVERTED") {
      return { success: false, message: "已转客户线索不允许改回普通活跃状态。" };
    }
  }
  if (isHighRiskStatusRollback(leadRecord.status, plan.changes.status)) {
    return { success: false, message: "当前业务规则未允许高风险状态回退，请在网页端人工处理。" };
  }
  const conflict = await findUniqueConflict(leadRecord.id, plan.changes);
  if (conflict) return { success: false, message: conflict };
  return { success: true, lead: leadRecord, data: buildUpdateData(leadRecord, plan.changes) };
}

async function resolveLead(reference: NonNullable<ParsedIntent["parameters"]["updateLead"]>["leadReference"]): Promise<
  | { success: true; lead: LeadRecord }
  | { success: false; message: string }
> {
  if (reference.id) {
    const lead = await prisma.lead.findUnique({ where: { id: Number(reference.id) } });
    if (!lead) return { success: false, message: `未找到线索ID ${reference.id}。` };
    return { success: true, lead: lead as LeadRecord };
  }

  const directFilters: Array<{ label: string; where: Record<string, unknown> }> = [];
  if (reference.email) directFilters.push({ label: `邮箱 ${reference.email}`, where: { email: reference.email } });
  if (reference.phone) {
    directFilters.push({ label: `电话 ${reference.phone}`, where: { phone: reference.phone } });
    directFilters.push({ label: `WhatsApp ${reference.phone}`, where: { whatsapp: reference.phone } });
  }

  for (const filter of directFilters) {
    const matches = await prisma.lead.findMany({ where: filter.where as any, take: 3 });
    if (matches.length === 1) return { success: true, lead: matches[0] as LeadRecord };
    if (matches.length > 1) return ambiguous(matches as LeadRecord[]);
  }

  if (reference.companyName) {
    const exact = await prisma.lead.findMany({ where: { company: { equals: reference.companyName, mode: "insensitive" } }, take: 3 });
    if (exact.length === 1) return { success: true, lead: exact[0] as LeadRecord };
    if (exact.length > 1) return ambiguous(exact as LeadRecord[]);

    const fuzzy = await prisma.lead.findMany({ where: { company: { contains: reference.companyName, mode: "insensitive" } }, take: 5 });
    if (fuzzy.length === 1) return { success: true, lead: fuzzy[0] as LeadRecord };
    if (fuzzy.length > 1) return ambiguous(fuzzy as LeadRecord[]);
  }

  return { success: false, message: "未找到匹配的线索。" };
}

function ambiguous(leads: LeadRecord[]) {
  return {
    success: false as const,
    message: [
      "找到多条匹配线索，请指定线索ID：",
      ...leads.map((lead) => `#${lead.id} ${lead.company} / ${lead.contactName} / ${lead.email || "无邮箱"}`),
    ].join("\n"),
  };
}

function normalizeChanges(changes: LeadUpdateChanges, lead: LeadRecord): { success: true; changes: Record<string, unknown> } | { success: false; message: string } {
  const output: Record<string, unknown> = {};

  const stringFields: Array<[keyof LeadUpdateChanges, string]> = [
    ["companyName", "company"],
    ["contactName", "contactName"],
    ["country", "country"],
    ["phone", "phone"],
    ["email", "email"],
    ["whatsapp", "whatsapp"],
    ["requirement", "requirement"],
    ["productInterest", "interestProducts"],
    ["notes", "remark"],
  ];
  for (const [from, to] of stringFields) {
    const value = changes[from];
    if (value == null) continue;
    const trimmed = String(value).trim();
    if ((to === "company" || to === "contactName") && !trimmed) return { success: false, message: `${FIELD_LABELS[to]}不能为空。` };
    if (["待补充", "未知", "N/A", "null"].includes(trimmed)) return { success: false, message: `${FIELD_LABELS[to]}不能使用占位值。` };
    output[to] = trimmed || null;
  }

  if (output.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(output.email))) return { success: false, message: `邮箱格式不正确："${output.email}"。` };
  }

  if (changes.budget != null) {
    if (!Number.isFinite(changes.budget) || changes.budget < 0) return { success: false, message: "预算必须是非负数。" };
    output.budget = changes.budget;
    output.currency = normalizeCurrency(changes.currency || lead.currency);
    if (!output.currency) return { success: false, message: "预算必须有合法币种。" };
  } else if (changes.currency != null) {
    const currency = normalizeCurrency(changes.currency);
    if (!currency) return { success: false, message: "币种不合法。" };
    output.currency = currency;
  }

  if (changes.status != null) {
    const status = normalizeStatus(changes.status);
    if (!status) return { success: false, message: `非法状态：${changes.status}` };
    output.status = status;
  }
  if (changes.grade != null) {
    const grade = normalizeGrade(changes.grade);
    if (!grade) return { success: false, message: `非法等级：${changes.grade}` };
    output.grade = grade;
  }
  if (changes.temperature != null) {
    const temperature = TEMPERATURE_INPUTS[String(changes.temperature).toUpperCase()] || TEMPERATURE_INPUTS[String(changes.temperature)];
    if (!temperature) return { success: false, message: `非法温度：${changes.temperature}` };
    output.temperature = temperature;
  }
  if (changes.expectedCloseAt != null) output.expectedClosing = parseDateValue(changes.expectedCloseAt);
  if (changes.nextFollowUpAt != null) output.nextFollowUp = parseDateValue(changes.nextFollowUpAt);

  return { success: true, changes: output };
}

async function findUniqueConflict(leadId: number, changes: Record<string, unknown>) {
  for (const field of ["company", "email", "phone", "whatsapp"]) {
    const value = changes[field];
    if (!value) continue;
    const conflict = await prisma.lead.findFirst({
      where: {
        id: { not: leadId },
        [field]: field === "company" ? { equals: value, mode: "insensitive" } : value,
      } as any,
    });
    if (conflict) return `${FIELD_LABELS[field]}与其他线索冲突：#${conflict.id} ${conflict.company}`;
  }
  return null;
}

function buildUpdateData(lead: LeadRecord, changes: Record<string, unknown>) {
  const beforeLines: string[] = [];
  const afterLines: string[] = [];
  const updateData: Record<string, unknown> = {};
  const beforeValues: Record<string, unknown> = {};
  const changedFields: string[] = [];
  for (const [field, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    changedFields.push(field);
    beforeValues[field] = (lead as any)[field];
    beforeLines.push(`${FIELD_LABELS[field] || field}：${formatLeadValue(field, beforeValues[field])}`);
    afterLines.push(`${FIELD_LABELS[field] || field}：${formatLeadValue(field, value)}`);
    updateData[field] = value;
  }
  return { updateData, beforeLines, afterLines, changedFields, beforeValues };
}

function buildUpdateLeadSummary(lead: LeadRecord, data: ReturnType<typeof buildUpdateData>) {
  return [
    "即将更新线索：",
    "",
    `线索：${lead.company}`,
    "",
    "变更前：",
    ...data.beforeLines,
    "",
    "变更后：",
    ...data.afterLines,
    "",
    "请确认执行。",
    "未确认前不会更新数据库。",
  ].join("\n");
}

function normalizeStatus(value: string) {
  const raw = String(value).trim().toUpperCase();
  return STATUS_INPUTS[String(value).trim()] || STATUS_INPUTS[raw] || (STATUS_LABELS[raw] ? raw : null);
}

function normalizeGrade(value: string) {
  const raw = String(value).trim().toUpperCase().replace("级", "");
  return ["A", "B", "C", "D"].includes(raw) ? raw : null;
}

function normalizeCurrency(value?: string | null) {
  if (!value) return null;
  const raw = String(value).trim().toUpperCase();
  return CURRENCY_INPUTS[raw] || CURRENCY_INPUTS[String(value).trim()] || null;
}

function parseDateValue(value: string) {
  const now = new Date();
  const text = String(value).trim();
  const date = new Date(now);
  date.setHours(9, 0, 0, 0);
  if (text === "今天") return date;
  if (text === "明天") {
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (text === "后天") {
    date.setDate(date.getDate() + 2);
    return date;
  }
  const weekMatch = text.match(/^下周([一二三四五六日天])$/);
  if (weekMatch) {
    const target = "一二三四五六日天".indexOf(weekMatch[1]);
    const targetDay = target >= 6 ? 0 : target + 1;
    const currentDay = date.getDay();
    const delta = ((targetDay - currentDay + 7) % 7) + 7;
    date.setDate(date.getDate() + delta);
    return date;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error(`无法解析日期：${value}`);
  return parsed;
}

function isHighRiskStatusRollback(currentStatus: string, nextStatus: unknown) {
  if (!nextStatus || typeof nextStatus !== "string") return false;
  const terminal = new Set(["WON", "LOST", "DORMANT"]);
  const active = new Set(["NEW", "CONTACTED", "REQUIREMENT_CONFIRMING", "QUOTING", "NEGOTIATING", "QUALIFIED"]);
  return terminal.has(currentStatus) && active.has(nextStatus);
}

export const __updateLeadTestUtils = {
  normalizeChanges,
  buildUpdateData,
  normalizeStatus,
  normalizeGrade,
  normalizeCurrency,
  parseDateValue,
  formatLeadValue,
  isHighRiskStatusRollback,
};

function formatLeadValue(field: string, value: unknown) {
  if (value == null || value === "") return "未填写";
  if (field === "status") return STATUS_LABELS[String(value)] || String(value);
  if (field === "temperature") return TEMPERATURE_LABELS[String(value)] || String(value);
  if (field === "grade") return `${value}级`;
  if (field === "budget") return Number(value).toLocaleString("zh-CN");
  if (value instanceof Date) return value.toLocaleDateString("zh-CN");
  return String(value);
}
