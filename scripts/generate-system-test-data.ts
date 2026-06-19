import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TEST_TENANT_NAME = "CRM System Test Tenant";

async function main() {
  console.log("Starting system test data generation...\n");

  // 1. Create test tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 9999 },
    update: {},
    create: { id: 9999, name: TEST_TENANT_NAME, plan: "PRO" },
  });
  console.log(`[OK] Test tenant created: ID=${tenant.id}`);

  // 2. Create test users
  const password = "test1234";
  const users = [];
  const userData = [
    ["test.admin@example.invalid", "Test Admin", "ADMIN"],
    ["test.sales@example.invalid", "Test Sales", "SALES"],
    ["test.manager@example.invalid", "Test Manager", "MANAGER"],
  ] as const;

  for (const [email, name, role] of userData) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, password, role, tenantId: tenant.id },
    });
    users.push(user);
  }
  console.log(`[OK] Test users created: ${users.length}`);

  // 3. Get a business line
  const businessLines = await prisma.businessLine.findMany();
  const blId = businessLines[0]?.id || 1;
  console.log(`[OK] Using businessLineId: ${blId}`);

  // 4. Create 20 test customers
  const now = new Date();
  const DAY = 86400000;

  const customerData: {
    name: string;
    country: string;
    stage: string;
    purchaseIntent: string;
    dealProbability: number;
    rating: number;
    lastContactAt?: Date;
    nextFollowUpAt?: Date;
    createdAt?: Date;
  }[] = [
    { name: "TEST_Alpha Solutions", country: "USA", stage: "WON", purchaseIntent: "HIGH", dealProbability: 90, rating: 5, lastContactAt: new Date(now.getTime() - 2 * DAY), nextFollowUpAt: new Date(now.getTime() + 3 * DAY) },
    { name: "TEST_Beta Technologies", country: "UK", stage: "NEGOTIATION", purchaseIntent: "HIGH", dealProbability: 80, rating: 4, lastContactAt: new Date(now.getTime() - 1 * DAY), nextFollowUpAt: new Date(now.getTime() + 1 * DAY) },
    { name: "TEST_Gamma Trading", country: "Germany", stage: "PROPOSAL", purchaseIntent: "MEDIUM", dealProbability: 60, rating: 3, lastContactAt: new Date(now.getTime() - 10 * DAY), nextFollowUpAt: new Date(now.getTime() + 5 * DAY) },
    { name: "TEST_Delta Services", country: "Japan", stage: "QUALIFIED", purchaseIntent: "HIGH", dealProbability: 75, rating: 4, lastContactAt: new Date(now.getTime() - 35 * DAY) },
    { name: "TEST_Epsilon Consulting", country: "France", stage: "CONTACTED", purchaseIntent: "LOW", dealProbability: 20, rating: 2, lastContactAt: new Date(now.getTime() - 5 * DAY) },
    { name: "TEST_Zeta Manufacturing", country: "China", stage: "NEW", purchaseIntent: "MEDIUM", dealProbability: 50, rating: 3, createdAt: new Date(now.getTime() - 5 * DAY) },
    { name: "TEST_Eta Digital", country: "Australia", stage: "WON", purchaseIntent: "HIGH", dealProbability: 95, rating: 5, lastContactAt: new Date(now.getTime() - 1 * DAY), nextFollowUpAt: new Date(now.getTime() + 7 * DAY) },
    { name: "TEST_Theta Logistics", country: "Canada", stage: "LOST", purchaseIntent: "LOW", dealProbability: 10, rating: 1, lastContactAt: new Date(now.getTime() - 60 * DAY) },
    { name: "TEST_Iota Retail", country: "Brazil", stage: "PROPOSAL", purchaseIntent: "MEDIUM", dealProbability: 55, rating: 3, lastContactAt: new Date(now.getTime() - 20 * DAY), nextFollowUpAt: new Date(now.getTime() + 10 * DAY) },
    { name: "TEST_Kappa Studio", country: "India", stage: "NEGOTIATION", purchaseIntent: "HIGH", dealProbability: 85, rating: 4, lastContactAt: new Date(now.getTime() - 3 * DAY), nextFollowUpAt: new Date(now.getTime() + 2 * DAY) },
    { name: "TEST_Lambda Systems", country: "Singapore", stage: "CONTACTED", purchaseIntent: "MEDIUM", dealProbability: 40, rating: 3, lastContactAt: new Date(now.getTime() - 45 * DAY) },
    { name: "TEST_Mu Global", country: "UAE", stage: "NEW", purchaseIntent: "UNKNOWN", dealProbability: 30, rating: 2, createdAt: new Date(now.getTime() - 2 * DAY) },
    { name: "TEST_Nu Commerce", country: "South Korea", stage: "PROPOSAL", purchaseIntent: "HIGH", dealProbability: 70, rating: 4, lastContactAt: new Date(now.getTime() - 7 * DAY), nextFollowUpAt: new Date(now.getTime() - 1 * DAY) },
    { name: "TEST_Xi Innovations", country: "Mexico", stage: "WON", purchaseIntent: "HIGH", dealProbability: 100, rating: 5, lastContactAt: now, nextFollowUpAt: new Date(now.getTime() + 14 * DAY) },
    { name: "TEST_Omicron Labs", country: "Italy", stage: "QUALIFIED", purchaseIntent: "MEDIUM", dealProbability: 65, rating: 3 },
    { name: "TEST_Pi Enterprises", country: "Spain", stage: "NEW", purchaseIntent: "LOW", dealProbability: 15, rating: 2 },
    { name: "TEST_Rho Group", country: "Netherlands", stage: "CONTACTED", purchaseIntent: "MEDIUM", dealProbability: 45, rating: 3, lastContactAt: new Date(now.getTime() - 31 * DAY) },
    { name: "TEST_Sigma Network", country: "Sweden", stage: "NEGOTIATION", purchaseIntent: "HIGH", dealProbability: 78, rating: 4, lastContactAt: new Date(now.getTime() - 2 * DAY), nextFollowUpAt: new Date(now.getTime() + 4 * DAY) },
    { name: "TEST_Tau Partners", country: "Norway", stage: "WON", purchaseIntent: "HIGH", dealProbability: 88, rating: 4, lastContactAt: new Date(now.getTime() - 5 * DAY) },
    { name: "TEST_Upsilon Works", country: "Turkey", stage: "LOST", purchaseIntent: "LOW", dealProbability: 5, rating: 1, lastContactAt: new Date(now.getTime() - 90 * DAY) },
  ];

  const customers = [];
  for (let i = 0; i < customerData.length; i++) {
    const c = customerData[i];
    const customer = await prisma.customer.upsert({
      where: { id: 9000 + i },
      update: {},
      create: {
        id: 9000 + i,
        company: c.name,
        contactName: `Test Contact ${i + 1}`,
        country: c.country,
        stage: c.stage,
        purchaseIntent: c.purchaseIntent,
        dealProbability: c.dealProbability,
        rating: c.rating,
        lastContactAt: c.lastContactAt || null,
        nextFollowUpAt: c.nextFollowUpAt || null,
        ownerId: i % 2 === 0 ? users[0].id : users[1].id,
        businessLineId: blId,
        tenantId: tenant.id,
        createdAt: c.createdAt || now,
      },
    });
    customers.push(customer);
  }
  console.log(`[OK] Test customers created: ${customers.length}`);

  // 5. Create contacts (35 total)
  let contactCount = 0;
  for (let i = 0; i < customers.length; i++) {
    const numContacts = i < 5 ? (i < 3 ? 3 : 2) : (i % 3 === 0 ? 2 : 1);
    for (let j = 0; j < numContacts; j++) {
      const contact = await prisma.contact.create({
        data: {
          customerId: customers[i].id,
          name: `Test Person ${contactCount + 1}`,
          firstName: `First${contactCount + 1}`,
          lastName: `Last${contactCount + 1}`,
          nickname: `Nick${contactCount + 1}`,
          jobTitle: ["Manager", "Director", "VP", "Engineer", "CEO"][j % 5],
          department: ["Sales", "Engineering", "Finance", "Marketing", "Operations"][j % 5],
          email: `test.person${contactCount + 1}@example.invalid`,
          phone: `+1-555-0${String(100 + contactCount).padStart(3, "0")}`,
          mobile: `+1-555-0${String(200 + contactCount).padStart(3, "0")}`,
          phoneCountryCode: "+1",
          preferredContactMethod: ["EMAIL", "PHONE", "WHATSAPP"][j % 3],
          preferredLanguage: ["EN", "CN", "DE"][j % 3],
          isPrimary: j === 0,
          notes: `AUTO_TEST_DATA Contact for ${customers[i].company}`,
        },
      });
      contactCount++;

      // Add social profiles for first 5 contacts
      if (contactCount <= 5) {
        const platforms = ["LINKEDIN", "WHATSAPP", "TELEGRAM", "WECHAT", "OTHER"];
        await prisma.contactSocialProfile.create({
          data: {
            contactId: contact.id,
            platform: platforms[contactCount - 1],
            account: `test_user_${contactCount}`,
            isPrimary: true,
          },
        });
      }
    }
  }
  console.log(`[OK] Test contacts created: ${contactCount}`);

  // 6. Create custom field definitions and values
  const customFieldDefs = [
    { entityType: "CUSTOMER", key: "customer_priority", label: "Customer Priority", fieldType: "SELECT", options: JSON.stringify(["Low", "Medium", "High"]) },
    { entityType: "CUSTOMER", key: "renewal_date", label: "Renewal Date", fieldType: "DATE" },
    { entityType: "CUSTOMER", key: "annual_potential", label: "Annual Potential", fieldType: "CURRENCY" },
    { entityType: "CUSTOMER", key: "strategic_account", label: "Strategic Account", fieldType: "CHECKBOX" },
    { entityType: "CUSTOMER", key: "internal_note", label: "Internal Note", fieldType: "TEXTAREA" },
    { entityType: "CONTACT", key: "preferred_meeting_time", label: "Preferred Meeting Time", fieldType: "TEXT" },
    { entityType: "CONTACT", key: "decision_maker", label: "Decision Maker", fieldType: "CHECKBOX" },
    { entityType: "CONTACT", key: "linked_profile", label: "Linked Profile", fieldType: "URL" },
  ];

  const cfDefs = [];
  for (const cf of customFieldDefs) {
    const def = await prisma.customFieldDefinition.upsert({
      where: {
        tenantId_entityType_key: {
          tenantId: tenant.id,
          entityType: cf.entityType,
          key: cf.key,
        },
      },
      update: {},
      create: { ...cf, tenantId: tenant.id },
    });
    cfDefs.push(def);
  }
  console.log(`[OK] Custom field definitions created: ${cfDefs.length}`);

  // Set custom field values for some customers
  let cfvCount = 0;
  for (let i = 0; i < Math.min(10, cfDefs.length); i++) {
    const cfDef = cfDefs[i % cfDefs.length];
    await prisma.customFieldValue.upsert({
      where: {
        fieldDefinitionId_entityType_entityId: {
          fieldDefinitionId: cfDef.id,
          entityType: "CUSTOMER",
          entityId: customers[i].id,
        },
      },
      update: {},
      create: {
        fieldDefinitionId: cfDef.id,
        entityType: "CUSTOMER",
        entityId: customers[i].id,
        value: cfDef.fieldType === "CHECKBOX" ? "true" : "Test Value",
        tenantId: tenant.id,
      },
    });
    cfvCount++;
  }
  console.log(`[OK] Custom field values created: ${cfvCount}`);

  // 7. Create 8 test leads
  const leadData = [
    { company: "TEST_Lead_New", contactName: "New Person", source: "WEBSITE" as const, status: "NEW" as const },
    { company: "TEST_Lead_Contacted", contactName: "Contacted Person", source: "EMAIL" as const, status: "CONTACTED" as const },
    { company: "TEST_Lead_HighIntent", contactName: "High Person", source: "MANUAL_OUTREACH" as const, status: "QUALIFIED" as const },
    { company: "TEST_Lead_LowIntent", contactName: "Low Person", source: "OTHER" as const, status: "NEW" as const },
    { company: "TEST_Lead_Converted", contactName: "Converted Person", source: "REFERRAL" as const, status: "QUALIFIED" as const },
    { company: "TEST_Lead_Unconverted", contactName: "Unconverted Person", source: "EXHIBITION" as const, status: "CONTACTED" as const },
    { company: "TEST_Lead_Website", contactName: "Website Person", source: "WEBSITE" as const, status: "NEW" as const },
    { company: "TEST_Lead_Social", contactName: "Social Person", source: "FACEBOOK" as const, status: "NEW" as const },
  ];

  const leads = [];
  for (let i = 0; i < leadData.length; i++) {
    const l = leadData[i];
    // Delete any existing lead with same company+tenantId to ensure idempotency
    await prisma.lead.deleteMany({
      where: { company: l.company, tenantId: tenant.id },
    });
    const lead = await prisma.lead.create({
      data: {
        company: l.company,
        contactName: l.contactName,
        country: ["USA", "UK", "Germany", "Japan", "France", "China", "India", "Brazil"][i],
        source: l.source,
        status: l.status,
        businessLineId: blId,
        tenantId: tenant.id,
      },
    });
    leads.push(lead);
  }
  console.log(`[OK] Test leads created: ${leads.length}`);

  // 8. Create 10 quotes with items
  const quoteStatuses: Array<"DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "WAITING_FEEDBACK" | "REVISED"> = [
    "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED",
    "DRAFT", "SENT", "WAITING_FEEDBACK", "ACCEPTED", "REVISED",
  ];
  const quotes = [];
  for (let i = 0; i < 10; i++) {
    const quote = await prisma.quote.create({
      data: {
        quoteNo: `TEST-QT-${String(i + 1).padStart(4, "0")}`,
        customerId: customers[i].id,
        status: quoteStatuses[i],
        currency: i % 3 === 0 ? "EUR" : "USD",
        totalPrice: (i + 1) * 1000,
        tenantId: tenant.id,
      },
    });
    await prisma.quoteItem.createMany({
      data: [
        {
          quoteId: quote.id,
          itemName: `TEST Product A-${i + 1}`,
          quantity: (i + 1) * 10,
          unitPrice: 100 + i * 10,
          totalPrice: (i + 1) * 10 * (100 + i * 10),
        },
        {
          quoteId: quote.id,
          itemName: `TEST Product B-${i + 1}`,
          quantity: (i + 1) * 5,
          unitPrice: 200 + i * 20,
          totalPrice: (i + 1) * 5 * (200 + i * 20),
        },
      ],
    });
    quotes.push(quote);
  }
  console.log(`[OK] Test quotes created: ${quotes.length}`);

  // 9. Create 12 orders with items and charges
  const orderStatuses: Array<"DRAFT" | "CONFIRMED" | "PRODUCTION" | "READY_TO_SHIP" | "SHIPPED" | "COMPLETED" | "CANCELLED"> = [
    "DRAFT", "CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED",
    "CANCELLED", "DRAFT", "CONFIRMED", "PRODUCTION", "SHIPPED", "COMPLETED",
  ];
  const orders = [];
  for (let i = 0; i < 12; i++) {
    const order = await prisma.order.create({
      data: {
        orderNo: `TEST-ORD-${String(i + 1).padStart(4, "0")}`,
        orderTitle: `TEST Order ${i + 1}`,
        customerId: customers[i].id,
        orderStatus: orderStatuses[i],
        currency: i % 4 === 0 ? "EUR" : "USD",
        exchangeRate: i % 4 === 0 ? 0.92 : null,
        tenantId: tenant.id,
        quoteId: i < quotes.length ? quotes[i].id : null,
        ownerId: users[0].id,
        priceTerm: "FOB Shanghai",
        paymentTerm: "T/T 30%",
        expectedDeliveryDate: new Date(now.getTime() + (30 + i * 10) * DAY),
      },
    });
    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order.id,
          itemName: `TEST Item A-${i + 1}`,
          quantity: (i + 1) * 10,
          unitPrice: 50 + i * 5,
          costPrice: 30 + i * 3,
          tenantId: tenant.id,
        },
        {
          orderId: order.id,
          itemName: `TEST Item B-${i + 1}`,
          quantity: (i + 1) * 5,
          unitPrice: 100 + i * 10,
          costPrice: 60 + i * 6,
          tenantId: tenant.id,
        },
      ],
    });
    if (i % 3 === 0) {
      await prisma.orderCharge.create({
        data: {
          orderId: order.id,
          type: "SHIPPING",
          name: "Shipping",
          amount: 50 + i * 10,
        },
      });
    }
    orders.push(order);
  }
  console.log(`[OK] Test orders created: ${orders.length}`);

  // 10. Create invoices and payments
  let invoiceCount = 0;
  let paymentCount = 0;
  for (let i = 0; i < 8; i++) {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `TEST-INV-${String(i + 1).padStart(4, "0")}`,
        orderId: orders[i].id,
        customerId: customers[i].id,
        amount: (i + 1) * 500,
        currency: "USD",
        status: i < 5 ? "PAID" : "SENT",
      },
    });
    invoiceCount++;
    if (i < 5) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: (i + 1) * 500,
          method: "TT",
        },
      });
      paymentCount++;
    }
  }
  console.log(`[OK] Test invoices created: ${invoiceCount}`);
  console.log(`[OK] Test payments created: ${paymentCount}`);

  // 11. Create tasks
  const taskData = [
    { title: "TEST: Follow up with Alpha", status: "PENDING" as const, dueDate: new Date(now.getTime() + 3 * DAY) },
    { title: "TEST: Call Beta", status: "PENDING" as const, dueDate: new Date(now.getTime() + 1 * DAY) },
    { title: "TEST: Overdue task", status: "PENDING" as const, dueDate: new Date(now.getTime() - 5 * DAY) },
    { title: "TEST: Send proposal", status: "IN_PROGRESS" as const, dueDate: new Date(now.getTime() + 2 * DAY) },
    { title: "TEST: Completed task", status: "COMPLETED" as const, completedAt: new Date(now.getTime() - 1 * DAY), dueDate: new Date(now.getTime() - 1 * DAY) },
  ];
  for (const t of taskData) {
    await prisma.task.create({
      data: {
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: "completedAt" in t ? t.completedAt : undefined,
        customerId: customers[0].id,
        tenantId: tenant.id,
      },
    });
  }
  console.log(`[OK] Test tasks created: ${taskData.length}`);

  // Final summary
  console.log("\n=== Test Data Generation Complete ===");
  console.log(`Tenant:       ${tenant.name} (ID: ${tenant.id})`);
  console.log(`Users:        ${users.length}`);
  console.log(`Customers:    ${customers.length}`);
  console.log(`Contacts:     ${contactCount}`);
  console.log(`CustomDefs:   ${cfDefs.length}`);
  console.log(`CustomValues: ${cfvCount}`);
  console.log(`Leads:        ${leads.length}`);
  console.log(`Quotes:       ${quotes.length}`);
  console.log(`Orders:       ${orders.length}`);
  console.log(`Invoices:     ${invoiceCount}`);
  console.log(`Payments:     ${paymentCount}`);
  console.log(`Tasks:        ${taskData.length}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[ERROR]", e);
  process.exit(1);
});
