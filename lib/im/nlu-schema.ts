import { z } from "zod";

// ── Write intent parameter schemas ────────────────────────────────────

export const CREATE_LEAD_SCHEMA = z.object({
  companyName: z.string().min(1, "公司名称不能为空"),
  contactName: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  email: z.string().email("邮箱格式不正确").nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  requirement: z.string().nullable().optional(),
  businessLineName: z.string().nullable().optional(),
  source: z.literal("FEISHU").default("FEISHU"),
});

export const ADD_LEAD_FOLLOWUP_SCHEMA = z.object({
  leadReference: z.object({
    id: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    contactName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  followUpType: z
    .enum(["PHONE", "EMAIL", "WHATSAPP", "MEETING", "NOTE", "OTHER"])
    .default("OTHER"),
  content: z.string().min(1, "跟进内容不能为空"),
  occurredAt: z.string().nullable().optional(),
  nextFollowUpAt: z.string().nullable().optional(),
});

export const UPDATE_LEAD_SCHEMA = z.object({
  leadReference: z.object({
    id: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    contactName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  changes: z.object({
    companyName: z.string().nullable().optional(),
    contactName: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email("邮箱格式不正确").nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    requirement: z.string().nullable().optional(),
    productInterest: z.string().nullable().optional(),
    budget: z.number().nonnegative("预算必须为非负数").nullable().optional(),
    currency: z.string().nullable().optional(),
    expectedCloseAt: z.string().nullable().optional(),
    nextFollowUpAt: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    grade: z.string().nullable().optional(),
    temperature: z.string().nullable().optional(),
  }),
});

// ── LLM structured output schema ──────────────────────────────────────

export const NLU_OUTPUT_SCHEMA = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  language: z.string().default("zh-CN"),
  parameters: z.record(z.string(), z.any()),
  missingFields: z.array(z.string()).default([]),
  ambiguities: z.array(z.string()).default([]),
  reasoningSummary: z.string().default(""),
});

export type NLUOutput = z.infer<typeof NLU_OUTPUT_SCHEMA>;
export type CreateLeadParams = z.infer<typeof CREATE_LEAD_SCHEMA>;
export type AddLeadFollowupParams = z.infer<typeof ADD_LEAD_FOLLOWUP_SCHEMA>;
export type UpdateLeadParams = z.infer<typeof UPDATE_LEAD_SCHEMA>;
