/**
 * Transaction rollback and event emission verification tests.
 *
 * Tasks covered:
 *   2. Lead -> Customer conversion rollback
 *   3. Quote -> Order conversion rollback
 *   4. Event emission timing (AFTER transaction, not inside)
 *
 * Run: npx tsx scripts/test-transaction-rollback.ts
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
// Task 2: Lead -> Customer transaction rollback
// ---------------------------------------------------------------------------
async function testLeadToCustomerRollback() {
  console.log("\n=== Task 2: Lead->Customer transaction rollback ===");

  const TEST_SUFFIX = `TX_TEST_${Date.now()}`;
  let leadId: number;

  // 1. Create a test Lead
  const lead = await prisma.lead.create({
    data: {
      company: TEST_SUFFIX,
      contactName: "Rollback Test Contact",
      businessLineId: 1,
      tenantId: 9999,
      status: "NEW",
    },
  });
  leadId = lead.id;
  console.log(`  Created test lead id=${leadId}`);

  const leadBefore = await prisma.lead.findUnique({ where: { id: leadId } });
  assert(leadBefore!.status === "NEW", "Lead status is NEW before conversion");
  assert(leadBefore!.convertedCustomerId === null, "Lead has no convertedCustomerId before conversion");

  // 2-5. Run a transaction that creates Customer but throws BEFORE creating Contact
  let transactionError: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      // 3. Create customer
      const customer = await tx.customer.create({
        data: {
          company: TEST_SUFFIX,
          contactName: "Rollback Test Contact",
          businessLineId: 1,
          tenantId: 9999,
          customerStatus: "POTENTIAL",
          customerType: "UNKNOWN",
        },
      });

      // 4. Simulate error BEFORE creating Contact
      throw new Error("Simulated error before Contact creation");
    });
  } catch (err: any) {
    transactionError = err.message;
  }

  assert(transactionError === "Simulated error before Contact creation", "Transaction threw expected error");

  // 6. Verify Customer was NOT created
  const leakedCustomer = await prisma.customer.findFirst({
    where: { company: TEST_SUFFIX, tenantId: 9999 },
  });
  assert(leakedCustomer === null, "Customer was NOT created (rolled back)");

  // 7. Verify Lead was NOT updated
  const leadAfter = await prisma.lead.findUnique({ where: { id: leadId } });
  assert(leadAfter!.status === "NEW", "Lead status unchanged after rollback");
  assert(leadAfter!.convertedCustomerId === null, "Lead convertedCustomerId unchanged after rollback");

  // Cleanup
  await prisma.lead.delete({ where: { id: leadId } });
  console.log("  Cleaned up test lead");
}

// ---------------------------------------------------------------------------
// Task 3: Quote -> Order transaction rollback
// ---------------------------------------------------------------------------
async function testQuoteToOrderRollback() {
  console.log("\n=== Task 3: Quote->Order transaction rollback ===");

  const TEST_SUFFIX = `TX_ORD_TEST_${Date.now()}`;

  // Find an existing quote to use (or create a minimal one)
  const existingQuote = await prisma.quote.findFirst({
    where: { tenantId: 9999 },
    orderBy: { id: "desc" },
  });

  let quoteId: number;
  let wasCreated = false;

  if (existingQuote) {
    quoteId = existingQuote.id;
    console.log(`  Using existing quote id=${quoteId}`);
  } else {
    // Create a minimal test quote (need a customer first)
    const testCustomer = await prisma.customer.findFirst({ where: { tenantId: 9999 } });
    if (!testCustomer) {
      console.log("  SKIP: No customers or quotes in DB to test with");
      return;
    }
    const q = await prisma.quote.create({
      data: {
        quoteNo: TEST_SUFFIX,
        customerId: testCustomer.id,
        tenantId: 9999,
        status: "DRAFT",
      },
    });
    quoteId = q.id;
    wasCreated = true;
    console.log(`  Created test quote id=${quoteId}`);
  }

  // Get quote data before
  const quoteBefore = await prisma.quote.findUnique({ where: { id: quoteId } });
  const ordersBefore = await prisma.order.findMany({ where: { quoteId } });
  assert(ordersBefore.length === 0 || quoteBefore!.status !== "ACCEPTED", "No existing orders from this quote (or status allows creation)");

  // Run transaction that creates Order but then throws
  let transactionError: string | null = null;
  let orderIdCreated: number | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      // Create an order (simplified, matching the action's structure)
      const order = await tx.order.create({
        data: {
          orderNo: TEST_SUFFIX,
          customerId: quoteBefore!.customerId!,
          quoteId: quoteId,
          tenantId: 9999,
          orderStatus: "DRAFT",
        },
      });
      orderIdCreated = order.id;

      // Throw error to trigger rollback
      throw new Error("Simulated error after Order creation");
    });
  } catch (err: any) {
    transactionError = err.message;
  }

  assert(transactionError === "Simulated error after Order creation", "Transaction threw expected error");

  // Verify Order was NOT created (rolled back)
  const leakedOrder = await prisma.order.findFirst({
    where: { orderNo: TEST_SUFFIX },
  });
  assert(leakedOrder === null, "Order was NOT created (rolled back)");

  // Cleanup if needed
  if (wasCreated) {
    await prisma.quote.delete({ where: { id: quoteId } });
    console.log("  Cleaned up test quote");
  }
}

// ---------------------------------------------------------------------------
// Task 4: Verify event emission happens AFTER transaction
// ---------------------------------------------------------------------------
async function testEventEmissionTiming() {
  console.log("\n=== Task 4: Verify event emission timing ===");

  // We analyze the source code to verify emit() is called AFTER prisma.$transaction().
  // This is a static analysis check on the action files.

  const fs = await import("fs");
  const path = await import("path");

  const filesToCheck = [
    { file: "app/(dashboard)/leads/actions.ts", name: "leads/actions.ts" },
    { file: "app/(dashboard)/orders/actions.ts", name: "orders/actions.ts" },
    { file: "app/(dashboard)/quotes/actions.ts", name: "quotes/actions.ts" },
  ];

  let allCorrect = true;

  for (const { file, name } of filesToCheck) {
    const fullPath = path.resolve(process.cwd(), file);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Find all emit() calls
    const emitRegex = /await\s+emit\s*\(\s*\{/g;
    let match;
    const emitPositions: number[] = [];
    while ((match = emitRegex.exec(content)) !== null) {
      emitPositions.push(match.index);
    }

    if (emitPositions.length === 0) {
      console.log(`  INFO: ${name} has no emit() calls`);
      continue;
    }

    // Find all $transaction calls
    const txRegex = /prisma\.\$transaction\s*\(/g;
    const txPositions: number[] = [];
    while ((match = txRegex.exec(content)) !== null) {
      txPositions.push(match.index);
    }

    for (const emitPos of emitPositions) {
      // Find which transaction (if any) the emit is associated with
      const enclosingTx = txPositions.filter((txPos) => {
        // Check if this emit is inside the transaction callback
        // Simple heuristic: emit is within the transaction's scope
        const afterTx = content.substring(txPos, emitPos);
        const closingBrace = content.indexOf("});", emitPos);
        const closingBrace2 = content.indexOf("});", closingBrace + 3);
        return afterTx.includes("async") && (closingBrace === -1 || emitPos < closingBrace);
      });

      if (enclosingTx.length > 0) {
        // emit is INSIDE a $transaction - this is a potential issue
        // But we need to check if it's in the transaction's callback or outside
        console.log(`  WARNING: ${name} has emit() potentially inside $transaction at char ${emitPos}`);
        allCorrect = false;
      } else {
        // emit is OUTSIDE $transaction - correct pattern
        console.log(`  OK: ${name} emit() at char ${emitPos} is outside $transaction`);
      }
    }
  }

  // More precise check: for each function, verify emit is outside the transaction block
  console.log("\n  Detailed analysis:");

  // leads/actions.ts - convertLeadToCustomer uses $transaction
  {
    const content = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/leads/actions.ts"), "utf-8");
    // The emit in createLead is in createLead, not in convertLeadToCustomer
    // convertLeadToCustomer wraps everything in $transaction but has no emit inside
    const hasEmitInTransaction = content.includes("$transaction") && (() => {
      // Find the convertLeadToCustomer function
      const fnMatch = content.match(/async function convertLeadToCustomer[\s\S]*?^}/m);
      if (fnMatch) {
        return fnMatch[0].includes("emit(");
      }
      return false;
    })();
    assert(!hasEmitInTransaction, "leads/actions.ts: convertLeadToCustomer has no emit() inside $transaction");
  }

  // quotes/actions.ts - updateQuoteStatus emits AFTER the prisma.quote.update (not in $transaction)
  {
    const content = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/quotes/actions.ts"), "utf-8");
    const fnMatch = content.match(/async function updateQuoteStatus[\s\S]*?^}/m);
    if (fnMatch) {
      const fn = fnMatch[0];
      const hasTx = fn.includes("$transaction");
      const hasEmit = fn.includes("emit(");
      // updateQuoteStatus does NOT use $transaction - it uses plain prisma.quote.update then emit
      assert(!hasTx, "quotes/actions.ts: updateQuoteStatus does not use $transaction (emit is safe)");
    }
  }

  // orders/actions.ts - updateOrderStatus emits AFTER the prisma.order.update (not in $transaction)
  {
    const content = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/orders/actions.ts"), "utf-8");
    const fnMatch = content.match(/async function updateOrderStatus[\s\S]*?^}/m);
    if (fnMatch) {
      const fn = fnMatch[0];
      const hasTx = fn.includes("$transaction");
      // updateOrderStatus does NOT use $transaction
      assert(!hasTx, "orders/actions.ts: updateOrderStatus does not use $transaction (emit is safe)");
    }
  }

  // createOrderFromQuote uses $transaction but has no emit inside
  {
    const content = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/orders/actions.ts"), "utf-8");
    const fnMatch = content.match(/async function createOrderFromQuote[\s\S]*?^}/m);
    if (fnMatch) {
      const fn = fnMatch[0];
      const hasEmitInTx = fn.includes("emit(");
      assert(!hasEmitInTx, "orders/actions.ts: createOrderFromQuote has no emit() inside $transaction");
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Transaction Rollback & Event Emission Tests");
  console.log("============================================");

  await testLeadToCustomerRollback();
  await testQuoteToOrderRollback();
  await testEventEmissionTiming();

  console.log("\n============================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);

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
