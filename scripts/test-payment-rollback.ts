/**
 * Payment transaction rollback verification test.
 *
 * Verifies that when a transaction creates a Payment and updates Order
 * amounts but then throws an error, both the Payment creation and the
 * Order amount updates are rolled back.
 *
 * Steps:
 *   1. Find an existing Invoice (tenant 9999) linked to an Order
 *   2. Record original paidAmount and outstandingAmount from the Order
 *   3. Start a transaction:
 *      a. Create a COMPLETED Payment
 *      b. Update Order paidAmount and outstandingAmount
 *      c. Throw an error BEFORE commit
 *   4. Catch the error
 *   5. Verify: Payment doesn't exist, Order values unchanged
 *
 * Run: npx tsx scripts/test-payment-rollback.ts
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
// Main test
// ---------------------------------------------------------------------------
async function testPaymentTransactionRollback() {
  console.log("\n=== Payment Transaction Rollback Test ===");

  // 1. Find an existing Invoice (tenant 9999) linked to an Order
  //    Invoice has no tenantId, so we filter through the Customer relation
  const invoice = await prisma.invoice.findFirst({
    where: {
      orderId: { not: null },
      customer: { tenantId: 9999 },
    },
    include: { order: true, payments: true },
  });

  if (!invoice) {
    console.log("  SKIP: No invoice with orderId found for tenant 9999");
    return;
  }

  if (!invoice.order) {
    console.log("  SKIP: Invoice has no linked order");
    return;
  }

  console.log(`  Found invoice id=${invoice.id} (invoiceNo=${invoice.invoiceNo}), orderId=${invoice.order.id}`);

  // 2. Record original paidAmount and outstandingAmount from the Order
  const orderBefore = await prisma.order.findUnique({ where: { id: invoice.order.id } });
  if (!orderBefore) {
    console.log("  SKIP: Could not re-fetch order");
    return;
  }

  const originalPaidAmount = Number(orderBefore.paidAmount);
  const originalOutstandingAmount = Number(orderBefore.outstandingAmount);
  const originalTotalAmount = Number(orderBefore.totalAmount);

  console.log(`  Order id=${orderBefore.id} before transaction:`);
  console.log(`    paidAmount        = ${originalPaidAmount}`);
  console.log(`    outstandingAmount = ${originalOutstandingAmount}`);
  console.log(`    totalAmount       = ${originalTotalAmount}`);

  // Count existing payments on this invoice before the test
  const paymentsBefore = await prisma.payment.count({ where: { invoiceId: invoice.id } });
  console.log(`    payments count    = ${paymentsBefore}`);

  // Record a sentinel amount for the "payment" we'll try to create
  const testPaymentAmount = 999.99;

  assert(originalPaidAmount >= 0, "Original paidAmount is non-negative");
  assert(originalOutstandingAmount >= 0, "Original outstandingAmount is non-negative");

  // 3. Start a transaction that creates Payment, updates Order, then throws
  let transactionError: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      // 3a. Create a Payment
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: testPaymentAmount,
          method: "CASH",
          notes: "FINAL_LOGIC_TEST: simulated payment for rollback test",
        },
      });
      console.log("  Transaction: created Payment (will be rolled back)");

      // 3b. Update Order paidAmount and outstandingAmount
      await tx.order.update({
        where: { id: invoice.order!.id },
        data: {
          paidAmount: originalPaidAmount + testPaymentAmount,
          outstandingAmount: Math.max(0, originalOutstandingAmount - testPaymentAmount),
        },
      });
      console.log("  Transaction: updated Order amounts (will be rolled back)");

      // 3c. Throw error BEFORE commit
      throw new Error("FINAL_LOGIC_TEST: Simulated error before commit");
    });
  } catch (err: any) {
    transactionError = err.message;
    console.log(`  Transaction caught error: "${transactionError}"`);
  }

  // 4. Verify the error was thrown
  assert(
    transactionError === "FINAL_LOGIC_TEST: Simulated error before commit",
    "Transaction threw expected error"
  );

  // 5. Verify: Payment doesn't exist
  const paymentsAfter = await prisma.payment.findMany({
    where: { invoiceId: invoice.id, notes: { contains: "FINAL_LOGIC_TEST" } },
  });
  assert(paymentsAfter.length === 0, "No test Payment exists after rollback");

  // Also verify total payment count is unchanged
  const paymentCountAfter = await prisma.payment.count({ where: { invoiceId: invoice.id } });
  assert(paymentCountAfter === paymentsBefore, `Payment count unchanged (${paymentsBefore} -> ${paymentCountAfter})`);

  // 6. Verify: Order paidAmount unchanged
  const orderAfter = await prisma.order.findUnique({ where: { id: invoice.order.id } });
  assert(orderAfter !== null, "Order still exists after rollback");

  if (orderAfter) {
    const paidAfter = Number(orderAfter.paidAmount);
    const outstandingAfter = Number(orderAfter.outstandingAmount);

    assert(
      paidAfter === originalPaidAmount,
      `Order paidAmount unchanged: ${originalPaidAmount} -> ${paidAfter}`
    );
    assert(
      outstandingAfter === originalOutstandingAmount,
      `Order outstandingAmount unchanged: ${originalOutstandingAmount} -> ${outstandingAfter}`
    );
  }

  console.log("\n=== Transaction Rollback Summary ===");
  console.log(`  Invoice: id=${invoice.id}, invoiceNo=${invoice.invoiceNo}`);
  console.log(`  Order:   id=${invoice.order.id}`);
  console.log(`  Test payment amount: ${testPaymentAmount}`);
  console.log(`  Result: All changes rolled back successfully`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("FINAL_LOGIC_TEST: Payment transaction rollback verification");
  console.log("===========================================================");

  await testPaymentTransactionRollback();

  console.log("\n===========================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
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
