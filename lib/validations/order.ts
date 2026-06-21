import { z } from "zod";

const ORDER_STATUS_VALUES = ["PENDING_CONFIRMATION", "CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED", "CANCELLED"] as const;
const CURRENCY_VALUES = ["USD", "EUR", "CNY"] as const;

export const orderItemSchema = z.object({
  id: z.number().int().optional(),
  productId: z.number().int().positive().optional().nullable(),
  itemName: z.string().min(1, "产品名称不能为空").max(200),
  specification: z.string().max(500).optional().nullable(),
  productCode: z.string().max(100).optional().nullable(),
  quantity: z.number().min(0, "数量不能为负数").optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  unitPrice: z.number().min(0, "单价不能为负数").optional().nullable(),
  totalPrice: z.number().optional().nullable(),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional().nullable(),
  discountValue: z.number().min(0).optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  taxAmount: z.number().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const orderChargeSchema = z.object({
  id: z.number().int().optional(),
  type: z.string().max(50).default("OTHER"),
  name: z.string().min(1, "费用名称不能为空").max(200),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().min(0, "费用金额不能为负数"),
  taxable: z.boolean().default(false),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  taxAmount: z.number().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const createOrderSchema = z.object({
  orderNo: z.string().max(50).optional(),
  orderTitle: z.string().max(200).optional().nullable(),
  customerId: z.number().int().positive("请选择客户"),
  projectId: z.number().int().positive().optional().nullable(),
  quoteId: z.number().int().positive().optional().nullable(),
  contactId: z.number().int().positive().optional().nullable(),
  businessLineId: z.number().int().positive().optional().nullable(),
  orderStatus: z.enum(ORDER_STATUS_VALUES).default("PENDING_CONFIRMATION"),
  totalAmount: z.number().optional().nullable(),
  exchangeRate: z.number().min(0).optional().nullable(),
  currency: z.enum(CURRENCY_VALUES).default("USD"),
  paymentTerm: z.string().max(200).optional().nullable(),
  deliveryTerm: z.string().max(200).optional().nullable(),
  expectedDeliveryDate: z.string().optional().nullable(),
  ownerId: z.number().int().optional().nullable(),
  ownerName: z.string().max(50).optional().nullable(),
  subtotal: z.number().optional().nullable(),
  discountAmount: z.number().optional().nullable(),
  taxAmount: z.number().optional().nullable(),
  chargeAmount: z.number().optional().nullable(),
  paidAmount: z.number().optional().nullable(),
  outstandingAmount: z.number().optional().nullable(),
  costAmount: z.number().optional().nullable(),
  grossProfitAmount: z.number().optional().nullable(),
  grossProfitRate: z.number().optional().nullable(),
  priceTerm: z.string().max(200).optional().nullable(),
  paymentMethod: z.string().max(100).optional().nullable(),
  shippingAddress: z.string().max(500).optional().nullable(),
  actualDeliveryDate: z.string().optional().nullable(),
  isArchived: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(orderItemSchema).optional().default([]),
  charges: z.array(orderChargeSchema).optional().default([]),
});

export const updateOrderSchema = createOrderSchema.partial().extend({
  customerId: z.number().int().positive("请选择客户").optional(),
});

export const orderListFilterSchema = z.object({
  search: z.string().max(200).optional().nullable(),
  orderStatus: z.enum(ORDER_STATUS_VALUES).optional().nullable(),
  customerId: z.string().optional().nullable(),
  businessLineId: z.string().optional().nullable(),
  currency: z.enum(CURRENCY_VALUES).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  isArchived: z.string().optional().nullable(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderChargeInput = z.infer<typeof orderChargeSchema>;
export type OrderListFilterInput = z.infer<typeof orderListFilterSchema>;
