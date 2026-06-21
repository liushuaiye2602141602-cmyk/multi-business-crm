import { Prisma } from "../lib/generated/prisma/client";
import {
  toOrderListItemDto,
  toQuoteSummaryDto,
  toDashboardMoneyDto,
} from "../lib/dto/order-dto";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertSerializableDto(value: unknown, path = "value") {
  if (value === null || value === undefined) return;
  if (typeof value === "bigint") throw new Error(`${path} is bigint`);
  if (value instanceof Date) throw new Error(`${path} is Date`);
  if (value instanceof Prisma.Decimal) throw new Error(`${path} is Prisma.Decimal`);
  if (value instanceof Map) throw new Error(`${path} is Map`);
  if (value instanceof Set) throw new Error(`${path} is Set`);
  if (value instanceof Uint8Array) throw new Error(`${path} is Uint8Array`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSerializableDto(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      assertSerializableDto(nested, `${path}.${key}`);
    }
  }
}

const order = {
  id: 1,
  orderNo: "O-20260621-0001",
  orderTitle: "Serialization Order",
  customerId: 10,
  projectId: 20,
  quoteId: 30,
  contactId: 40,
  businessLineId: 50,
  orderStatus: "CONFIRMED",
  currency: "USD",
  totalAmount: new Prisma.Decimal("12345678901234567890.12"),
  exchangeRate: new Prisma.Decimal("7.123456"),
  subtotal: new Prisma.Decimal("1000.10"),
  discountAmount: null,
  taxAmount: new Prisma.Decimal("0"),
  chargeAmount: new Prisma.Decimal("20.01"),
  paidAmount: new Prisma.Decimal("0"),
  outstandingAmount: new Prisma.Decimal("1020.11"),
  costAmount: new Prisma.Decimal("700.1234"),
  grossProfitAmount: new Prisma.Decimal("320.11"),
  grossProfitRate: new Prisma.Decimal("31.38"),
  paymentTerm: "TT",
  paymentMethod: "BANK",
  deliveryTerm: "FOB",
  priceTerm: "FOB",
  shippingAddress: "Shanghai",
  expectedDeliveryDate: new Date("2026-07-01T00:00:00.000Z"),
  actualDeliveryDate: null,
  isArchived: false,
  archivedAt: null,
  ownerName: "Alice",
  notes: "client safe",
  tenantId: 999,
  createdAt: new Date("2026-06-21T01:02:03.000Z"),
  updatedAt: new Date("2026-06-21T04:05:06.000Z"),
  customer: { id: 10, company: "ACME", tenantId: 999 },
  project: { id: 20, name: "Project A", amount: new Prisma.Decimal("1") },
  quote: { id: 30, quoteNo: "Q-1", totalPrice: new Prisma.Decimal("2") },
  contact: { id: 40, name: "Bob", email: "bob@example.com" },
  businessLine: { id: 50, name: "Packaging", createdAt: new Date() },
};

const dto = toOrderListItemDto(order);
assert(dto.totalAmount === "12345678901234567890.12", "large decimal precision lost");
assert(dto.discountAmount === null, "null decimal should stay null");
assert(dto.taxAmount === "0", "zero decimal should become string 0");
assert(dto.createdAt === "2026-06-21T01:02:03.000Z", "createdAt should be ISO");
assert(dto.expectedDeliveryDate === "2026-07-01T00:00:00.000Z", "expectedDeliveryDate should be ISO");
assert(!("tenantId" in dto), "order dto leaked tenantId");
assert(!("tenantId" in (dto.customer || {})), "customer relation leaked tenantId");
assert(!("amount" in (dto.project || {})), "project relation leaked decimal amount");
assertSerializableDto(dto, "orderDto");
JSON.stringify(dto);

const quoteDto = toQuoteSummaryDto({
  id: 30,
  quoteNo: "Q-1",
  status: "ACCEPTED",
  totalPrice: new Prisma.Decimal("88.88"),
  discountAmount: new Prisma.Decimal("0"),
  currency: "USD",
  createdAt: new Date("2026-06-21T00:00:00.000Z"),
});
assert(quoteDto.totalPrice === "88.88", "quote totalPrice should be string");
assertSerializableDto(quoteDto, "quoteDto");
JSON.stringify(quoteDto);

const dashboardDto = toDashboardMoneyDto({
  totalRevenue: new Prisma.Decimal("999999999999999999.99"),
  openOrdersAmount: null,
});
assert(dashboardDto.totalRevenue === "999999999999999999.99", "dashboard money precision lost");
assert(dashboardDto.openOrdersAmount === null, "dashboard null amount changed");
assertSerializableDto(dashboardDto, "dashboardDto");
JSON.stringify(dashboardDto);

console.log("Serialization DTO tests passed");
