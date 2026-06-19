export type FieldCategory = "COMPANY" | "SALES" | "CONTACT" | "ACTIVITY" | "DATE_TIME" | "STATISTICS" | "SYSTEM" | "CUSTOM";

export type FieldType = "text" | "number" | "currency" | "date" | "datetime" | "select" | "multiselect" | "checkbox" | "url" | "email" | "phone" | "rating" | "tags";

export interface FieldDefinition {
  key: string;
  label: string;
  category: FieldCategory;
  source: "DIRECT" | "RELATION" | "AGGREGATE" | "COMPUTED" | "CUSTOM_FIELD";
  dataType: FieldType;
  sortable: boolean;
  filterable: boolean;
  defaultVisible: boolean;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  align: "left" | "center" | "right";
  frozenAllowed: boolean;
  format?: string;
  description?: string;
  performanceHint?: string;
}

export interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
  width: number;
  frozen: boolean;
}

// Core system fields
export const CUSTOMER_FIELDS: FieldDefinition[] = [
  // COMPANY
  { key: "name", label: "公司名称", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 200, minWidth: 120, maxWidth: 400, align: "left", frozenAllowed: true },
  { key: "shortName", label: "简称", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 200, align: "left", frozenAllowed: false },
  { key: "customCode", label: "自定义编号", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "website", label: "网站", category: "COMPANY", source: "DIRECT", dataType: "url", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 180, minWidth: 120, maxWidth: 300, align: "left", frozenAllowed: false },
  { key: "country", label: "国家/地区", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "region", label: "地区", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "city", label: "城市", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "left", frozenAllowed: false },
  { key: "industry", label: "行业", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "companySize", label: "公司规模", category: "COMPANY", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "center", frozenAllowed: false },
  { key: "customerType", label: "客户类型", category: "COMPANY", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "center", frozenAllowed: false },
  { key: "rating", label: "星级", category: "COMPANY", source: "DIRECT", dataType: "rating", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 100, align: "center", frozenAllowed: false },
  { key: "tags", label: "标签", category: "COMPANY", source: "DIRECT", dataType: "tags", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 150, minWidth: 100, maxWidth: 300, align: "left", frozenAllowed: false },
  { key: "notes", label: "备注", category: "COMPANY", source: "DIRECT", dataType: "text", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 200, minWidth: 100, maxWidth: 400, align: "left", frozenAllowed: false, performanceHint: "长文本" },

  // SALES
  { key: "stage", label: "销售阶段", category: "SALES", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "center", frozenAllowed: false },
  { key: "purchaseIntent", label: "采购意向", category: "SALES", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "center", frozenAllowed: false },
  { key: "dealProbability", label: "成交概率", category: "SALES", source: "DIRECT", dataType: "number", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 100, align: "center", frozenAllowed: false },
  { key: "expectedDealValue", label: "预计金额", category: "SALES", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "ownerName", label: "负责人", category: "SALES", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "left", frozenAllowed: false },

  // CONTACT
  { key: "primaryContactName", label: "主联系人", category: "CONTACT", source: "RELATION", dataType: "text", sortable: false, filterable: false, defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "primaryContactEmail", label: "联系人邮箱", category: "CONTACT", source: "RELATION", dataType: "email", sortable: false, filterable: false, defaultVisible: true, defaultWidth: 160, minWidth: 120, maxWidth: 250, align: "left", frozenAllowed: false },
  { key: "primaryContactPhone", label: "联系人电话", category: "CONTACT", source: "RELATION", dataType: "phone", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 120, minWidth: 100, maxWidth: 180, align: "left", frozenAllowed: false },
  { key: "primaryContactJobTitle", label: "联系人职位", category: "CONTACT", source: "RELATION", dataType: "text", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "contactCount", label: "联系人数", category: "CONTACT", source: "AGGREGATE", dataType: "number", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 70, minWidth: 50, maxWidth: 80, align: "center", frozenAllowed: false },

  // DATE_TIME
  { key: "lastContactAt", label: "最近联系", category: "DATE_TIME", source: "DIRECT", dataType: "datetime", sortable: true, filterable: false, defaultVisible: true, defaultWidth: 120, minWidth: 100, maxWidth: 160, align: "left", frozenAllowed: false },
  { key: "nextFollowUpAt", label: "下次跟进", category: "DATE_TIME", source: "DIRECT", dataType: "datetime", sortable: true, filterable: false, defaultVisible: true, defaultWidth: 120, minWidth: 100, maxWidth: 160, align: "left", frozenAllowed: false },
  { key: "updatedAt", label: "更新时间", category: "DATE_TIME", source: "DIRECT", dataType: "datetime", sortable: true, filterable: false, defaultVisible: true, defaultWidth: 120, minWidth: 100, maxWidth: 160, align: "left", frozenAllowed: false },
  { key: "createdAt", label: "创建时间", category: "DATE_TIME", source: "DIRECT", dataType: "datetime", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 120, minWidth: 100, maxWidth: 160, align: "left", frozenAllowed: false },
  { key: "expectedCloseDate", label: "预计成交", category: "DATE_TIME", source: "DIRECT", dataType: "date", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 130, align: "left", frozenAllowed: false },

  // SYSTEM
  { key: "source", label: "来源", category: "SYSTEM", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "center", frozenAllowed: false },
  { key: "isArchived", label: "归档", category: "SYSTEM", source: "DIRECT", dataType: "checkbox", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 60, minWidth: 50, maxWidth: 80, align: "center", frozenAllowed: false },
];

// Get field definitions for custom fields from database
export function getCustomFieldColumns(definitions: Array<{ id: number; key: string; label: string; fieldType: string }>): FieldDefinition[] {
  return definitions.map(def => ({
    key: `custom:${def.id}`,
    label: def.label,
    category: "CUSTOM" as FieldCategory,
    source: "CUSTOM_FIELD" as const,
    dataType: mapFieldType(def.fieldType),
    sortable: false,
    filterable: def.fieldType === "SELECT" || def.fieldType === "MULTI_SELECT",
    defaultVisible: false,
    defaultWidth: 120,
    minWidth: 80,
    maxWidth: 250,
    align: "left",
    frozenAllowed: false,
    performanceHint: def.fieldType === "TEXTAREA" ? "长文本" : undefined,
  }));
}

function mapFieldType(fieldType: string): FieldType {
  const map: Record<string, FieldType> = {
    TEXT: "text", TEXTAREA: "text", NUMBER: "number", CURRENCY: "currency",
    DATE: "date", DATETIME: "datetime", SELECT: "select", MULTI_SELECT: "multiselect",
    CHECKBOX: "checkbox", URL: "url", EMAIL: "email", PHONE: "phone",
  };
  return map[fieldType] || "text";
}

export function getDefaultVisibleColumns(): string[] {
  return CUSTOMER_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
}

export function getDefaultColumnConfig(): ColumnConfig[] {
  return CUSTOMER_FIELDS.filter(f => f.defaultVisible).map((f, i) => ({
    key: f.key,
    visible: true,
    order: i,
    width: f.defaultWidth,
    frozen: f.key === "name",
  }));
}

export function validateColumnKeys(keys: string[], allFields: FieldDefinition[]): string[] {
  const validKeys = new Set(allFields.map(f => f.key));
  return keys.filter(k => validKeys.has(k) || k.startsWith("custom:"));
}

export function getFieldByKey(key: string, allFields: FieldDefinition[]): FieldDefinition | undefined {
  return allFields.find(f => f.key === key);
}

export function getFieldsByCategory(category: FieldCategory, allFields: FieldDefinition[]): FieldDefinition[] {
  return allFields.filter(f => f.category === category);
}

export const FIELD_CATEGORY_LABELS: Record<FieldCategory, string> = {
  COMPANY: "公司信息",
  SALES: "销售",
  CONTACT: "联系人",
  ACTIVITY: "活动",
  DATE_TIME: "日期时间",
  STATISTICS: "统计",
  SYSTEM: "系统",
  CUSTOM: "自定义",
};
