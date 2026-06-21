import { dateToIso, decimalToString, enumToString } from "@/lib/serialization/prisma-serializers";

type DecimalLike = { toString(): string };

type RelationIdName = {
  id: number;
  name?: string | null;
  company?: string | null;
  quoteNo?: string | null;
};

type OrderListItemSource = {
  id: number;
  orderNo: string;
  orderTitle: string | null;
  customerId: number | null;
  projectId: number | null;
  quoteId: number | null;
  contactId: number | null;
  businessLineId: number | null;
  orderStatus: string | { toString(): string };
  currency: string | { toString(): string };
  totalAmount: DecimalLike | string | number | null;
  exchangeRate: DecimalLike | string | number | null;
  subtotal: DecimalLike | string | number | null;
  discountAmount: DecimalLike | string | number | null;
  taxAmount: DecimalLike | string | number | null;
  chargeAmount: DecimalLike | string | number | null;
  paidAmount: DecimalLike | string | number | null;
  outstandingAmount: DecimalLike | string | number | null;
  costAmount: DecimalLike | string | number | null;
  grossProfitAmount: DecimalLike | string | number | null;
  grossProfitRate: DecimalLike | string | number | null;
  paymentTerm: string | null;
  paymentMethod?: string | null;
  deliveryTerm: string | null;
  priceTerm?: string | null;
  shippingAddress?: string | null;
  expectedDeliveryDate: Date | string | null;
  actualDeliveryDate: Date | string | null;
  isArchived?: boolean;
  archivedAt?: Date | string | null;
  ownerName?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  customer?: RelationIdName | null;
  project?: RelationIdName | null;
  quote?: RelationIdName | null;
  contact?: RelationIdName | null;
  businessLine?: RelationIdName | null;
};

export type OrderListItemDto = {
  id: number;
  orderNo: string;
  orderTitle: string | null;
  customerId: number | null;
  projectId: number | null;
  quoteId: number | null;
  contactId: number | null;
  businessLineId: number | null;
  orderStatus: string;
  currency: string;
  totalAmount: string | null;
  exchangeRate: string | null;
  subtotal: string | null;
  discountAmount: string | null;
  taxAmount: string | null;
  chargeAmount: string | null;
  paidAmount: string | null;
  outstandingAmount: string | null;
  costAmount: string | null;
  grossProfitAmount: string | null;
  grossProfitRate: string | null;
  paymentTerm: string | null;
  paymentMethod: string | null;
  deliveryTerm: string | null;
  priceTerm: string | null;
  shippingAddress: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  ownerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: number; companyName: string } | null;
  project: { id: number; name: string } | null;
  quote: { id: number; quoteNo: string } | null;
  contact: { id: number; name: string } | null;
  businessLine: { id: number; name: string } | null;
};

export type QuoteSummaryDto = {
  id: number;
  quoteNo: string;
  status: string;
  currency: string;
  totalPrice: string | null;
  discountAmount: string | null;
  createdAt: string;
};

export type DashboardMoneyDto = {
  totalRevenue: string | null;
  openOrdersAmount: string | null;
};

export function toOrderListItemDto(order: OrderListItemSource): OrderListItemDto {
  return {
    id: order.id,
    orderNo: order.orderNo,
    orderTitle: order.orderTitle,
    customerId: order.customerId,
    projectId: order.projectId,
    quoteId: order.quoteId,
    contactId: order.contactId,
    businessLineId: order.businessLineId,
    orderStatus: enumToString(order.orderStatus),
    currency: enumToString(order.currency),
    totalAmount: decimalToString(order.totalAmount),
    exchangeRate: decimalToString(order.exchangeRate),
    subtotal: decimalToString(order.subtotal),
    discountAmount: decimalToString(order.discountAmount),
    taxAmount: decimalToString(order.taxAmount),
    chargeAmount: decimalToString(order.chargeAmount),
    paidAmount: decimalToString(order.paidAmount),
    outstandingAmount: decimalToString(order.outstandingAmount),
    costAmount: decimalToString(order.costAmount),
    grossProfitAmount: decimalToString(order.grossProfitAmount),
    grossProfitRate: decimalToString(order.grossProfitRate),
    paymentTerm: order.paymentTerm,
    paymentMethod: order.paymentMethod ?? null,
    deliveryTerm: order.deliveryTerm,
    priceTerm: order.priceTerm ?? null,
    shippingAddress: order.shippingAddress ?? null,
    expectedDeliveryDate: dateToIso(order.expectedDeliveryDate),
    actualDeliveryDate: dateToIso(order.actualDeliveryDate),
    isArchived: order.isArchived ?? false,
    archivedAt: dateToIso(order.archivedAt),
    ownerName: order.ownerName ?? null,
    notes: order.notes ?? null,
    createdAt: dateToIso(order.createdAt) || "",
    updatedAt: dateToIso(order.updatedAt) || "",
    customer: order.customer ? { id: order.customer.id, companyName: order.customer.company || order.customer.name || "" } : null,
    project: order.project ? { id: order.project.id, name: order.project.name || "" } : null,
    quote: order.quote ? { id: order.quote.id, quoteNo: order.quote.quoteNo || "" } : null,
    contact: order.contact ? { id: order.contact.id, name: order.contact.name || "" } : null,
    businessLine: order.businessLine ? { id: order.businessLine.id, name: order.businessLine.name || "" } : null,
  };
}

export function toQuoteSummaryDto(quote: {
  id: number;
  quoteNo: string;
  status: string | { toString(): string };
  currency?: string | { toString(): string };
  totalPrice: DecimalLike | string | number | null;
  discountAmount: DecimalLike | string | number | null;
  createdAt: Date | string;
}): QuoteSummaryDto {
  return {
    id: quote.id,
    quoteNo: quote.quoteNo,
    status: enumToString(quote.status),
    currency: enumToString(quote.currency || "USD"),
    totalPrice: decimalToString(quote.totalPrice),
    discountAmount: decimalToString(quote.discountAmount),
    createdAt: dateToIso(quote.createdAt) || "",
  };
}

export function toDashboardMoneyDto(input: {
  totalRevenue: DecimalLike | string | number | null;
  openOrdersAmount: DecimalLike | string | number | null;
}): DashboardMoneyDto {
  return {
    totalRevenue: decimalToString(input.totalRevenue),
    openOrdersAmount: decimalToString(input.openOrdersAmount),
  };
}
