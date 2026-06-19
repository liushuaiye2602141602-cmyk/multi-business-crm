export type FieldCategory = "BASIC" | "CUSTOMER" | "FINANCIAL" | "PAYMENT" | "DELIVERY" | "DATE_TIME" | "SYSTEM" | "CUSTOM";

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

// Core order fields
export const ORDER_FIELDS: FieldDefinition[] = [
  // BASIC - basic order information
  { key: "orderNo", label: "订单号", category: "BASIC", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 160, minWidth: 120, maxWidth: 250, align: "left", frozenAllowed: true },
  { key: "orderTitle", label: "订单标题", category: "BASIC", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 200, minWidth: 120, maxWidth: 400, align: "left", frozenAllowed: false },
  { key: "orderStatus", label: "状态", category: "BASIC", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "center", frozenAllowed: false },
  { key: "notes", label: "备注", category: "BASIC", source: "DIRECT", dataType: "text", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 200, minWidth: 100, maxWidth: 400, align: "left", frozenAllowed: false, performanceHint: "长文本" },

  // CUSTOMER - related entities
  { key: "customerName", label: "客户", category: "CUSTOMER", source: "RELATION", dataType: "text", sortable: false, filterable: true, defaultVisible: true, defaultWidth: 160, minWidth: 100, maxWidth: 250, align: "left", frozenAllowed: false },
  { key: "businessLineName", label: "业务线", category: "CUSTOMER", source: "RELATION", dataType: "text", sortable: false, filterable: true, defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "projectName", label: "项目", category: "CUSTOMER", source: "RELATION", dataType: "text", sortable: false, filterable: false, defaultVisible: true, defaultWidth: 140, minWidth: 80, maxWidth: 250, align: "left", frozenAllowed: false },
  { key: "quoteNo", label: "关联报价", category: "CUSTOMER", source: "RELATION", dataType: "text", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 140, minWidth: 100, maxWidth: 200, align: "left", frozenAllowed: false },
  { key: "contactName", label: "联系人", category: "CUSTOMER", source: "RELATION", dataType: "text", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "left", frozenAllowed: false },
  { key: "ownerName", label: "负责人", category: "CUSTOMER", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 120, align: "left", frozenAllowed: false },

  // FINANCIAL - money fields
  { key: "totalAmount", label: "总金额", category: "FINANCIAL", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: true, defaultWidth: 120, minWidth: 80, maxWidth: 180, align: "right", frozenAllowed: false },
  { key: "subtotal", label: "小计", category: "FINANCIAL", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 110, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "discountAmount", label: "折扣金额", category: "FINANCIAL", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 110, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "taxAmount", label: "税额", category: "FINANCIAL", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "chargeAmount", label: "附加费用", category: "FINANCIAL", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 110, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "costAmount", label: "成本", category: "FINANCIAL", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "grossProfitAmount", label: "毛利润", category: "FINANCIAL", source: "COMPUTED", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "grossProfitRate", label: "毛利率", category: "FINANCIAL", source: "COMPUTED", dataType: "number", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 100, align: "center", frozenAllowed: false },
  { key: "currency", label: "币种", category: "FINANCIAL", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: true, defaultWidth: 70, minWidth: 60, maxWidth: 100, align: "center", frozenAllowed: false },
  { key: "exchangeRate", label: "汇率", category: "FINANCIAL", source: "DIRECT", dataType: "number", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 80, minWidth: 60, maxWidth: 100, align: "right", frozenAllowed: false },

  // PAYMENT
  { key: "paidAmount", label: "已付金额", category: "PAYMENT", source: "DIRECT", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 110, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "outstandingAmount", label: "未付金额", category: "PAYMENT", source: "COMPUTED", dataType: "currency", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 110, minWidth: 80, maxWidth: 150, align: "right", frozenAllowed: false },
  { key: "paymentTerm", label: "付款条件", category: "PAYMENT", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 120, minWidth: 80, maxWidth: 200, align: "left", frozenAllowed: false },
  { key: "paymentMethod", label: "付款方式", category: "PAYMENT", source: "DIRECT", dataType: "select", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 150, align: "center", frozenAllowed: false },

  // DELIVERY
  { key: "deliveryTerm", label: "交货条款", category: "DELIVERY", source: "DIRECT", dataType: "text", sortable: true, filterable: true, defaultVisible: false, defaultWidth: 120, minWidth: 80, maxWidth: 200, align: "left", frozenAllowed: false },
  { key: "priceTerm", label: "价格条款", category: "DELIVERY", source: "DIRECT", dataType: "text", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 200, align: "left", frozenAllowed: false },
  { key: "shippingAddress", label: "收货地址", category: "DELIVERY", source: "DIRECT", dataType: "text", sortable: false, filterable: false, defaultVisible: false, defaultWidth: 200, minWidth: 120, maxWidth: 400, align: "left", frozenAllowed: false, performanceHint: "长文本" },

  // DATE_TIME
  { key: "expectedDeliveryDate", label: "预计交期", category: "DATE_TIME", source: "DIRECT", dataType: "date", sortable: true, filterable: false, defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 130, align: "left", frozenAllowed: false },
  { key: "actualDeliveryDate", label: "实际交期", category: "DATE_TIME", source: "DIRECT", dataType: "date", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 100, minWidth: 80, maxWidth: 130, align: "left", frozenAllowed: false },
  { key: "updatedAt", label: "更新时间", category: "DATE_TIME", source: "DIRECT", dataType: "datetime", sortable: true, filterable: false, defaultVisible: true, defaultWidth: 120, minWidth: 100, maxWidth: 160, align: "left", frozenAllowed: false },
  { key: "createdAt", label: "创建时间", category: "DATE_TIME", source: "DIRECT", dataType: "datetime", sortable: true, filterable: false, defaultVisible: false, defaultWidth: 120, minWidth: 100, maxWidth: 160, align: "left", frozenAllowed: false },

  // SYSTEM
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
  return ORDER_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
}

export function getDefaultColumnConfig(): ColumnConfig[] {
  return ORDER_FIELDS.filter(f => f.defaultVisible).map((f, i) => ({
    key: f.key,
    visible: true,
    order: i,
    width: f.defaultWidth,
    frozen: f.key === "orderNo",
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
  BASIC: "基本信息",
  CUSTOMER: "客户关联",
  FINANCIAL: "财务",
  PAYMENT: "付款",
  DELIVERY: "交付",
  DATE_TIME: "日期时间",
  SYSTEM: "系统",
  CUSTOM: "自定义",
};
