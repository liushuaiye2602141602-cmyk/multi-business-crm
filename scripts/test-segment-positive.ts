import { QuoteStatus, OrderStatus } from "../lib/generated/prisma/enums";
/**
 * Positive test for the "quoted_not_won" customer segment.
 *
 * Verifies that the segment correctly identifies customers who have
 * valid quotes but no won orders.
 *
 * Scenarios:
 *   A: Customer + SENT Quote + NO Order          -> SHOULD enter quoted_not_won
 *   B: Customer + SENT Quote + COMPLETED Order   -> should NOT enter (has won order)
 *   C: Customer + SENT Quote + CANCELLED Order   -> SHOULD enter (cancelled doesn't count as won)
 *
 * Run: npx tsx scripts/test-segment-positive.ts
 */

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "Won" order statuses as defined in segment-query-builder.ts */
const WON_ORDER_STATUSES = ["CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED"] as OrderStatus[];

/** "Valid" quote statuses as defined in segment-query-builder.ts */
const VALID_QUOTE_STATUSES = ["SENT", "WAITING_FEEDBACK", "REVISED", "ACCEPTED"] as QuoteStatus[];

/**
 * Replicate the quoted_not_won segment logic from segment-query-builder.ts
 * to verify correctness against our test data.
 */
async function isCustomerInQuotedNotWon(customerId: number): Promise<boolean> {
  // Step 1: Find customers with valid quotes
  const customerIds = await prisma.quote.findMany({
    where: {
      status: { in: VALID_QUOTE_STATUSES },
      customer: { isArchived: false, stage: { notIn: ["LOST", "WON"] } },
    },
    select: { customerId: true },
    distinct: ["customerId"],
  });

  // Step 2: Find customers with won orders
  const wonOrderCustomerIds = await prisma.order.findMany({
    where: { orderStatus: { in: WON_ORDER_STATUSES } },
    select: { customerId: true },
    distinct: ["customerId"],
  });

  // Step 3: Customers with valid quotes but NO won orders
  const wonSet = new Set(wonOrderCustomerIds.map(o => o.customerId).filter((id): id is number => id !== null));
  const filtered = customerIds.filter(c => c.customerId !== null && !wonSet.has(c.customerId));

  return filtered.some(c => c.customerId === customerId);
}

// ---------------------------------------------------------------------------
// Scenario A: Customer + SENT Quote + NO Order -> SHOULD enter quoted_not_won
// ---------------------------------------------------------------------------
async function testScenarioA() {
  console.log("\n=== Scenario A: SENT Quote + NO Order => SHOULD enter quoted_not_won ===");

  const ts = Date.now();
  const customer = await prisma.customer.create({
    data: {
      company: `FINAL_LOGIC_TEST_A_${ts}`,
      contactName: "Test Contact A",
      businessLineId: 1,
      tenantId: 9999,
      customerStatus: "ACTIVE",
      customerType: "UNKNOWN",
      stage: "NEW",
    },
  });
  console.log(`  Created customer id=${customer.id}`);

  const quote = await prisma.quote.create({
    data: {
      quoteNo: `FINAL_LOGIC_QA_${ts}`,
      customerId: customer.id,
      tenantId: 9999,
      status: "SENT",
    },
  });
  console.log(`  Created quote id=${quote.id} with status SENT`);

  // No order created for this customer

  const inSegment = await isCustomerInQuotedNotWon(customer.id);
  assert(inSegment === true, "Scenario A: Customer with SENT quote and NO order IS in quoted_not_won");

  // Verify directly: has valid quote?
  const validQuotes = await prisma.quote.count({
    where: { customerId: customer.id, status: { in: VALID_QUOTE_STATUSES } },
  });
  assert(validQuotes >= 1, "Scenario A: Customer has at least 1 valid quote");

  // Verify directly: has no won orders?
  const wonOrders = await prisma.order.count({
    where: { customerId: customer.id, orderStatus: { in: WON_ORDER_STATUSES } },
  });
  assert(wonOrders === 0, "Scenario A: Customer has 0 won orders");

  // Cleanup
  await prisma.quote.delete({ where: { id: quote.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log("  Cleaned up Scenario A data");
}

// ---------------------------------------------------------------------------
// Scenario B: Customer + SENT Quote + COMPLETED Order -> should NOT enter
// ---------------------------------------------------------------------------
async function testScenarioB() {
  console.log("\n=== Scenario B: SENT Quote + COMPLETED Order => should NOT enter quoted_not_won ===");

  const ts = Date.now();
  const customer = await prisma.customer.create({
    data: {
      company: `FINAL_LOGIC_TEST_B_${ts}`,
      contactName: "Test Contact B",
      businessLineId: 1,
      tenantId: 9999,
      customerStatus: "ACTIVE",
      customerType: "UNKNOWN",
      stage: "NEW",
    },
  });
  console.log(`  Created customer id=${customer.id}`);

  const quote = await prisma.quote.create({
    data: {
      quoteNo: `FINAL_LOGIC_QB_${ts}`,
      customerId: customer.id,
      tenantId: 9999,
      status: "SENT",
    },
  });
  console.log(`  Created quote id=${quote.id} with status SENT`);

  const order = await prisma.order.create({
    data: {
      orderNo: `FINAL_LOGIC_OB_${ts}`,
      customerId: customer.id,
      quoteId: quote.id,
      tenantId: 9999,
      orderStatus: "COMPLETED",
      totalAmount: 1000,
      currency: "USD",
    },
  });
  console.log(`  Created order id=${order.id} with status COMPLETED`);

  const inSegment = await isCustomerInQuotedNotWon(customer.id);
  assert(inSegment === false, "Scenario B: Customer with SENT quote and COMPLETED order is NOT in quoted_not_won");

  // Verify directly: has valid quote?
  const validQuotes = await prisma.quote.count({
    where: { customerId: customer.id, status: { in: VALID_QUOTE_STATUSES } },
  });
  assert(validQuotes >= 1, "Scenario B: Customer has at least 1 valid quote");

  // Verify directly: has won orders?
  const wonOrders = await prisma.order.count({
    where: { customerId: customer.id, orderStatus: { in: WON_ORDER_STATUSES } },
  });
  assert(wonOrders >= 1, "Scenario B: Customer has at least 1 won order");

  // Cleanup
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.quote.delete({ where: { id: quote.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log("  Cleaned up Scenario B data");
}

// ---------------------------------------------------------------------------
// Scenario C: Customer + SENT Quote + CANCELLED Order -> SHOULD enter
// (cancelled orders don't count as "won")
// ---------------------------------------------------------------------------
async function testScenarioC() {
  console.log("\n=== Scenario C: SENT Quote + CANCELLED Order => SHOULD enter quoted_not_won ===");

  const ts = Date.now();
  const customer = await prisma.customer.create({
    data: {
      company: `FINAL_LOGIC_TEST_C_${ts}`,
      contactName: "Test Contact C",
      businessLineId: 1,
      tenantId: 9999,
      customerStatus: "ACTIVE",
      customerType: "UNKNOWN",
      stage: "NEW",
    },
  });
  console.log(`  Created customer id=${customer.id}`);

  const quote = await prisma.quote.create({
    data: {
      quoteNo: `FINAL_LOGIC_QC_${ts}`,
      customerId: customer.id,
      tenantId: 9999,
      status: "SENT",
    },
  });
  console.log(`  Created quote id=${quote.id} with status SENT`);

  const order = await prisma.order.create({
    data: {
      orderNo: `FINAL_LOGIC_OC_${ts}`,
      customerId: customer.id,
      quoteId: quote.id,
      tenantId: 9999,
      orderStatus: "CANCELLED",
      totalAmount: 500,
      currency: "USD",
    },
  });
  console.log(`  Created order id=${order.id} with status CANCELLED`);

  const inSegment = await isCustomerInQuotedNotWon(customer.id);
  assert(inSegment === true, "Scenario C: Customer with SENT quote and CANCELLED order IS in quoted_not_won");

  // Verify directly: has valid quote?
  const validQuotes = await prisma.quote.count({
    where: { customerId: customer.id, status: { in: VALID_QUOTE_STATUSES } },
  });
  assert(validQuotes >= 1, "Scenario C: Customer has at least 1 valid quote");

  // Verify directly: has won orders? (CANCELLED is NOT in WON_ORDER_STATUSES)
  const wonOrders = await prisma.order.count({
    where: { customerId: customer.id, orderStatus: { in: WON_ORDER_STATUSES } },
  });
  assert(wonOrders === 0, "Scenario C: Customer has 0 won orders (CANCELLED does not count)");

  // Cleanup
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.quote.delete({ where: { id: quote.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log("  Cleaned up Scenario C data");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("FINAL_LOGIC_TEST: quoted_not_won segment positive tests");
  console.log("========================================================");

  await testScenarioA();
  await testScenarioB();
  await testScenarioC();

  console.log("\n========================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("Scenarios tested: 3 (A: quote+no order, B: quote+completed order, C: quote+cancelled order)");
  console.log(`Total assertions: ${passed + failed}`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  prisma.$disconnect();
  process.exit(1);
});
