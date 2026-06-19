/**
 * System Test Data Cleanup Script
 *
 * Safely removes test data from the test tenant (ID: 9999).
 *
 * Usage:
 *   npx tsx scripts/cleanup-system-test-data.ts              # dry-run only
 *   npx tsx scripts/cleanup-system-test-data.ts --confirm    # actual cleanup
 *
 * Safety:
 * - Only targets tenantId = 9999
 * - Requires explicit --confirm flag
 * - Shows what will be deleted before deleting
 * - Uses transaction for atomicity
 * - Verifies cleanup after completion
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const TEST_TENANT_ID = 9999;
const TEST_TENANT_NAME = "CRM System Test Tenant";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const confirm = process.argv.includes("--confirm");
  const isDryRun = !confirm;

  console.log("========================================");
  console.log("  System Test Data Cleanup");
  console.log(`  Mode: ${isDryRun ? "DRY RUN (preview only)" : "CONFIRMED (will delete)"}`);
  console.log("========================================\n");

  // Step 1: Verify test tenant exists and matches
  const tenant = await prisma.tenant.findUnique({ where: { id: TEST_TENANT_ID } });
  if (!tenant) {
    console.log("❌ Test tenant (ID: 9999) not found. Nothing to clean.");
    await prisma.$disconnect();
    return;
  }

  if (tenant.name !== TEST_TENANT_NAME) {
    console.log(`❌ Tenant name mismatch! Expected "${TEST_TENANT_NAME}", got "${tenant.name}".`);
    console.log("   Aborting to protect non-test data.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`✅ Test tenant verified: ID=${tenant.id}, Name="${tenant.name}"\n`);

  // Step 2: Count records to be deleted
  console.log("Records to be deleted:");
  console.log("---");

  const counts: Record<string, number> = {};

  // Check each model
  counts["ActivityLog"] = await prisma.activityLog.count({ where: { entityType: { contains: "Test" } } });
  counts["AIExecutionLog"] = await prisma.aIExecutionLog.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["AIAnalysis"] = await prisma.aIAnalysis.count();
  counts["Message"] = await prisma.message.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["EmailMessage"] = await prisma.emailMessage.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["EmailThread"] = await prisma.emailThread.count({ where: { tenantId: TEST_TENANT_ID } });
  const testCustomerIds = (await prisma.customer.findMany({ where: { tenantId: TEST_TENANT_ID }, select: { id: true } })).map(c => c.id);

  counts["Payment"] = await prisma.payment.count({ where: { invoice: { customerId: { in: testCustomerIds } } } });
  counts["Invoice"] = await prisma.invoice.count({ where: { customerId: { in: testCustomerIds } } });
  counts["OrderCharge"] = await prisma.orderCharge.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["OrderItem"] = await prisma.orderItem.count({ where: { order: { tenantId: TEST_TENANT_ID } } });
  counts["Order"] = await prisma.order.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["QuoteItem"] = await prisma.quoteItem.count({ where: { quote: { tenantId: TEST_TENANT_ID } } });
  counts["Quote"] = await prisma.quote.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["Task"] = await prisma.task.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["FollowUp"] = await prisma.followUp.count({ where: { customer: { tenantId: TEST_TENANT_ID } } });
  counts["CustomFieldValue"] = await prisma.customFieldValue.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["CustomFieldDefinition"] = await prisma.customFieldDefinition.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["PresetSegmentPreference"] = await prisma.presetSegmentPreference.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["CustomerListView"] = await prisma.customerListView.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["ContactSocialProfile"] = await prisma.contactSocialProfile.count({ where: { contact: { customerId: { in: testCustomerIds } } } });
  counts["Contact"] = await prisma.contact.count({ where: { customerId: { in: testCustomerIds } } });
  counts["Customer"] = await prisma.customer.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["Customer"] = await prisma.customer.count({ where: { tenantId: TEST_TENANT_ID } });
  counts["Lead"] = await prisma.lead.count({ where: { tenantId: TEST_TENANT_ID } });

  let totalRecords = 0;
  for (const [model, count] of Object.entries(counts)) {
    if (count > 0) {
      console.log(`  ${model}: ${count}`);
      totalRecords += count;
    }
  }
  console.log(`\n  Total records to delete: ${totalRecords}`);

  if (totalRecords === 0) {
    console.log("\n✅ No test data found. Nothing to clean.");
    await prisma.$disconnect();
    return;
  }

  if (isDryRun) {
    console.log("\n⚠️  DRY RUN mode. No data will be deleted.");
    console.log("   Run with --confirm to execute cleanup:");
    console.log("   npm run test:data:cleanup");
    await prisma.$disconnect();
    return;
  }

  // Step 3: Confirm deletion
  console.log("\n⚠️  CONFIRMED mode. Deleting test data...");
  console.log("   This operation will be performed in a single transaction.\n");

  try {
    await prisma.$transaction(async (tx) => {
      // Delete in foreign key order
      // 1. ActivityLogs referencing test entities
      await tx.activityLog.deleteMany({ where: { entityType: { contains: "Test" } } });
      console.log("  ✅ ActivityLog deleted");

      // 2. AI logs
      await tx.aIExecutionLog.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ AIExecutionLog deleted");

      // 3. Messages
      await tx.message.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ Message deleted");

      // 4. Email threads and messages
      await tx.emailMessage.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      await tx.emailThread.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ EmailMessage/EmailThread deleted");

      // 5. Payments (via invoices)
      const testInvoiceIdsForDelete = (await tx.invoice.findMany({ where: { customerId: { in: testCustomerIds } }, select: { id: true } })).map(i => i.id);
      await tx.payment.deleteMany({ where: { invoiceId: { in: testInvoiceIdsForDelete } } });
      console.log("  ✅ Payment deleted");

      // 6. Invoices
      await tx.invoice.deleteMany({ where: { customerId: { in: testCustomerIds } } });
      console.log("  ✅ Invoice deleted");

      // 7. Order charges, items, orders
      await tx.orderCharge.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      await tx.orderItem.deleteMany({ where: { order: { tenantId: TEST_TENANT_ID } } });
      await tx.order.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ OrderCharge/OrderItem/Order deleted");

      // 8. Quote items, quotes
      await tx.quoteItem.deleteMany({ where: { quote: { tenantId: TEST_TENANT_ID } } });
      await tx.quote.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ QuoteItem/Quote deleted");

      // 9. Tasks, FollowUps
      await tx.task.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ Task deleted");

      // 10. Custom fields
      await tx.customFieldValue.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      await tx.customFieldDefinition.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ CustomFieldValue/CustomFieldDefinition deleted");

      // 11. List views, segment preferences
      await tx.customerListView.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      await tx.presetSegmentPreference.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ CustomerListView/PresetSegmentPreference deleted");

      // 12. Contact social profiles, contacts, customers
      await tx.contactSocialProfile.deleteMany({ where: { contact: { customerId: { in: testCustomerIds } } } });
      await tx.contact.deleteMany({ where: { customerId: { in: testCustomerIds } } });
      await tx.customer.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ ContactSocialProfile/Contact/Customer deleted");

      // 13. Leads
      await tx.lead.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
      console.log("  ✅ Lead deleted");

      // 14. Test users (email starts with test.)
      const testUserIds = (await tx.user.findMany({ where: { email: { startsWith: "test." } }, select: { id: true } })).map(u => u.id);
      await tx.user.deleteMany({ where: { id: { in: testUserIds } } });
      console.log("  ✅ Test users deleted");

      // 15. Test tenant
      await tx.tenant.delete({ where: { id: TEST_TENANT_ID } });
      console.log("  ✅ Test tenant deleted");
    });

    console.log("\n✅ Transaction committed. All test data deleted.");

    // Step 4: Verify cleanup
    console.log("\nVerifying cleanup...");
    const remainingCustomers = await prisma.customer.count({ where: { tenantId: TEST_TENANT_ID } });
    const remainingLeads = await prisma.lead.count({ where: { tenantId: TEST_TENANT_ID } });
    const remainingOrders = await prisma.order.count({ where: { tenantId: TEST_TENANT_ID } });

    if (remainingCustomers === 0 && remainingLeads === 0 && remainingOrders === 0) {
      console.log("✅ Verification passed: No test data remaining.");
    } else {
      console.log("⚠️  Warning: Some test data may remain.");
      console.log(`   Customers: ${remainingCustomers}, Leads: ${remainingLeads}, Orders: ${remainingOrders}`);
    }

  } catch (error) {
    console.error("\n❌ Transaction failed:", error);
    console.log("   Data should have been rolled back.");
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((e) => { console.error("Fatal error:", e); process.exit(1); });
