import { z } from "zod";

const STAGE_VALUES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "PAUSED", "LOST"] as const;
const INTENT_VALUES = ["UNKNOWN", "LOW", "MEDIUM", "HIGH"] as const;
const SOURCE_VALUES = ["MANUAL", "WEBSITE", "EMAIL", "PHONE", "SOCIAL_MEDIA", "REFERRAL", "EVENT", "ADVERTISEMENT", "PARTNER", "IMPORT", "OTHER"] as const;

export const createCustomerSchema = z.object({
  company: z.string().min(1, "公司名称不能为空").max(200, "公司名称不能超过200字符"),
  contactName: z.string().min(1, "联系人姓名不能为空").max(100),
  country: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("邮箱格式不正确").max(200).optional().nullable().or(z.literal("")),
  whatsapp: z.string().max(30).optional().nullable(),
  website: z.string().url("网站URL格式不正确").max(500).optional().nullable().or(z.literal("")),
  industry: z.string().max(100).optional().nullable(),
  companySize: z.string().max(50).optional().nullable(),
  stage: z.enum(STAGE_VALUES).default("NEW"),
  purchaseIntent: z.enum(INTENT_VALUES).default("UNKNOWN"),
  source: z.enum(SOURCE_VALUES).optional().nullable(),
  rating: z.number().int().min(1, "评分最小为1").max(5, "评分最大为5").optional().nullable(),
  dealProbability: z.number().int().min(0).max(100).optional().nullable(),
  expectedDealValue: z.number().min(0, "成交金额不能为负数").optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  remark: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  businessLineId: z.number().int().positive("请选择业务线"),
  ownerId: z.number().int().optional().nullable(),
  ownerName: z.string().max(50).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  company: z.string().min(1).max(200).optional(),
});

export const createContactSchema = z.object({
  customerId: z.number().int().positive(),
  name: z.string().min(1, "联系人姓名不能为空").max(100),
  firstName: z.string().max(50).optional().nullable(),
  lastName: z.string().max(50).optional().nullable(),
  nickname: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  email: z.string().email("邮箱格式不正确").max(200).optional().nullable().or(z.literal("")),
  secondaryEmail: z.string().email("邮箱格式不正确").max(200).optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  mobile: z.string().max(30).optional().nullable(),
  phoneCountryCode: z.string().max(10).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  preferredContactMethod: z.string().max(30).optional().nullable(),
  preferredLanguage: z.string().max(10).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
}).refine(
  (data) => data.email || data.secondaryEmail || data.phone || data.mobile || data.whatsapp,
  { message: "邮箱、电话、手机或WhatsApp至少填写一项", path: ["email"] }
);

export const updateContactSchema = createContactSchema.partial();

export const socialProfileSchema = z.object({
  contactId: z.number().int().positive(),
  platform: z.string().min(1, "平台不能为空"),
  account: z.string().min(1, "账号不能为空").max(200),
  profileUrl: z.string().url("URL格式不正确").optional().nullable().or(z.literal("")),
  isPrimary: z.boolean().optional().default(false),
});

export const customFieldDefinitionSchema = z.object({
  entityType: z.enum(["CUSTOMER", "CONTACT"]),
  key: z.string().min(1, "字段key不能为空").max(50).regex(/^[a-z_]+$/, "key只能包含小写字母和下划线"),
  label: z.string().min(1, "字段名称不能为空").max(100),
  fieldType: z.enum(["TEXT", "TEXTAREA", "NUMBER", "CURRENCY", "DATE", "DATETIME", "SELECT", "MULTI_SELECT", "CHECKBOX", "URL", "EMAIL", "PHONE"]),
  description: z.string().max(500).optional().nullable(),
  isRequired: z.boolean().optional().default(false),
  options: z.any().optional().nullable(),
}).refine(
  (data) => {
    if ((data.fieldType === "SELECT" || data.fieldType === "MULTI_SELECT") && (!data.options || !Array.isArray(data.options) || data.options.length === 0)) {
      return false;
    }
    return true;
  },
  { message: "SELECT和MULTI_SELECT类型必须提供options数组", path: ["options"] }
);

export const customFieldValueSchema = z.object({
  fieldDefinitionId: z.number().int().positive(),
  entityType: z.string().min(1),
  entityId: z.number().int().positive(),
  value: z.string().max(5000),
});

export const customerListFilterSchema = z.object({
  search: z.string().max(200).optional().nullable(),
  stage: z.enum(STAGE_VALUES).optional().nullable(),
  source: z.enum(SOURCE_VALUES).optional().nullable(),
  purchaseIntent: z.enum(INTENT_VALUES).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  isArchived: z.string().optional().nullable(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
