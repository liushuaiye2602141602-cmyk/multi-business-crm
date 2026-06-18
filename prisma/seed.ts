import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ==================== 业务线 ====================
  const businessLines = [
    { name: "软包装", code: "FLEX", description: "软包装业务线", mainProducts: "stand up pouch, spout pouch, flat bottom pouch, quad seal bag, retort pouch, bag in box, rollstock film, pet food packaging, coffee bag, frozen food packaging, snack packaging, beverage pouch, automotive fluid pouch" },
    { name: "包装机/灌装机", code: "PACK", description: "包装机和灌装机业务线", mainProducts: "packing machine, filling machine, sealing machine, labeling machine, capping machine, liquid filling line, powder packing machine, granule packing machine, pouch packing machine, bottle filling machine" },
    { name: "木质工艺品", code: "WOOD", description: "木质工艺品业务线", mainProducts: "wooden crafts, wooden box, wooden tray, wooden decoration, wooden sign, wooden toy, wooden display stand, holiday wooden craft, OEM wooden products" },
  ];

  for (const bl of businessLines) {
    await prisma.businessLine.upsert({
      where: { name: bl.name },
      update: { code: bl.code, description: bl.description, mainProducts: bl.mainProducts },
      create: bl,
    });
  }
  console.log("✅ 业务线已创建（3条）");

  // ==================== 产品目录 ====================
  const blRecords = await prisma.businessLine.findMany();
  const blMap = new Map(blRecords.map((bl) => [bl.code, bl.id]));

  const products = [
    // 软包装
    { name: "Stand Up Pouch", category: "Pouch", englishKeywords: "stand up pouch, doypack, SUP", businessLineCode: "FLEX" },
    { name: "Spout Pouch", category: "Pouch", englishKeywords: "spout pouch, spout bag, juice pouch", businessLineCode: "FLEX" },
    { name: "Flat Bottom Pouch", category: "Pouch", englishKeywords: "flat bottom pouch, box pouch, flat bottom bag", businessLineCode: "FLEX" },
    { name: "Quad Seal Bag", category: "Bag", englishKeywords: "quad seal bag, four corner seal bag, coffee bag", businessLineCode: "FLEX" },
    { name: "Retort Pouch", category: "Pouch", englishKeywords: "retort pouch, retortable pouch, heat resistant pouch", businessLineCode: "FLEX" },
    { name: "Bag in Box", category: "Special", englishKeywords: "bag in box, BIB, wine bag in box", businessLineCode: "FLEX" },
    { name: "Rollstock Film", category: "Film", englishKeywords: "rollstock film, packaging film, laminated film", businessLineCode: "FLEX" },
    { name: "Pet Food Packaging", category: "Special", englishKeywords: "pet food packaging, dog food bag, cat food pouch", businessLineCode: "FLEX" },
    { name: "Coffee Bag", category: "Bag", englishKeywords: "coffee bag, coffee packaging, roasted coffee bag", businessLineCode: "FLEX" },
    { name: "Frozen Food Packaging", category: "Special", englishKeywords: "frozen food packaging, frozen bag, freezer pouch", businessLineCode: "FLEX" },
    { name: "Snack Packaging", category: "Special", englishKeywords: "snack packaging, chips bag, candy wrapper", businessLineCode: "FLEX" },
    { name: "Beverage Pouch", category: "Pouch", englishKeywords: "beverage pouch, juice pouch, drink pouch", businessLineCode: "FLEX" },
    { name: "Automotive Fluid Pouch", category: "Special", englishKeywords: "automotive fluid pouch, oil pouch, coolant pouch", businessLineCode: "FLEX" },
    // 包装机/灌装机
    { name: "Packing Machine", category: "Machine", englishKeywords: "packing machine, packaging machine, automatic packing machine", businessLineCode: "PACK" },
    { name: "Filling Machine", category: "Machine", englishKeywords: "filling machine, liquid filler, bottle filler", businessLineCode: "PACK" },
    { name: "Sealing Machine", category: "Machine", englishKeywords: "sealing machine, heat sealer, bag sealer", businessLineCode: "PACK" },
    { name: "Labeling Machine", category: "Machine", englishKeywords: "labeling machine, label applicator, sticker machine", businessLineCode: "PACK" },
    { name: "Capping Machine", category: "Machine", englishKeywords: "capping machine, cap tightener, bottle capper", businessLineCode: "PACK" },
    { name: "Liquid Filling Line", category: "Line", englishKeywords: "liquid filling line, complete filling line, water filling line", businessLineCode: "PACK" },
    { name: "Powder Packing Machine", category: "Machine", englishKeywords: "powder packing machine, powder filler, powder packaging", businessLineCode: "PACK" },
    { name: "Granule Packing Machine", category: "Machine", englishKeywords: "granule packing machine, granule filler, sachet machine", businessLineCode: "PACK" },
    { name: "Pouch Packing Machine", category: "Machine", englishKeywords: "pouch packing machine, premade pouch machine, doypack machine", businessLineCode: "PACK" },
    { name: "Bottle Filling Machine", category: "Machine", englishKeywords: "bottle filling machine, bottle filler, beverage filling", businessLineCode: "PACK" },
    // 木质工艺品
    { name: "Wooden Box", category: "Box", englishKeywords: "wooden box, wood box, timber box, gift box", businessLineCode: "WOOD" },
    { name: "Wooden Tray", category: "Tray", englishKeywords: "wooden tray, wood tray, serving tray, display tray", businessLineCode: "WOOD" },
    { name: "Wooden Decoration", category: "Decoration", englishKeywords: "wooden decoration, wood decor, wall decor, home decoration", businessLineCode: "WOOD" },
    { name: "Wooden Sign", category: "Sign", englishKeywords: "wooden sign, wood sign, custom sign, personalized sign", businessLineCode: "WOOD" },
    { name: "Wooden Toy", category: "Toy", englishKeywords: "wooden toy, wood toy, educational toy, baby toy", businessLineCode: "WOOD" },
    { name: "Wooden Display Stand", category: "Display", englishKeywords: "wooden display stand, wood display, retail display, POP display", businessLineCode: "WOOD" },
    { name: "Holiday Wooden Craft", category: "Holiday", englishKeywords: "holiday wooden craft, christmas ornament, easter decor, seasonal craft", businessLineCode: "WOOD" },
    { name: "OEM Wooden Products", category: "OEM", englishKeywords: "OEM wooden products, custom wood products, private label wood", businessLineCode: "WOOD" },
  ];

  for (const p of products) {
    const blId = blMap.get(p.businessLineCode);
    if (!blId) continue;
    await prisma.product.upsert({
      where: { id: 0 }, // will fail, so it always creates
      update: {},
      create: {
        name: p.name,
        category: p.category,
        englishKeywords: p.englishKeywords,
        businessLineId: blId,
      },
    }).catch(async () => {
      // If upsert fails (id doesn't exist), check if product already exists
      const existing = await prisma.product.findFirst({ where: { name: p.name, businessLineId: blId } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            category: p.category,
            englishKeywords: p.englishKeywords,
            businessLineId: blId,
          },
        });
      }
    });
  }
  console.log("✅ 产品目录已创建");

  // ==================== 跟进模板 ====================
  const templates = [
    {
      title: "First Reply to Inquiry",
      scene: "FIRST_REPLY" as const,
      subject: "Re: Your Inquiry",
      content: `Dear Customer,

Thank you for your inquiry. We are pleased to receive your interest in our products.

We have reviewed your requirements and would like to confirm a few details:

1. What is your expected order quantity?
2. What is your target delivery date?
3. Do you have any specific requirements for packaging or labeling?

Once we have this information, we will be able to provide you with a detailed quotation.

Please feel free to let us know if you have any questions.

Best regards`,
      language: "EN" as const,
    },
    {
      title: "Quote Information Confirmation",
      scene: "QUOTE_CONFIRMATION" as const,
      subject: "Information Needed for Quotation",
      content: `Dear Customer,

Thank you for your interest in our products. To provide you with an accurate quotation, we need to confirm the following information:

1. Product specifications (size, material, thickness)
2. Order quantity
3. Printing requirements (colors, design)
4. Packaging requirements
5. Delivery address and preferred shipping method
6. Target delivery date

Once we receive these details, we will prepare a competitive quotation for you within 2 business days.

Best regards`,
      language: "EN" as const,
    },
    {
      title: "Quote Follow Up",
      scene: "QUOTE_FOLLOW_UP" as const,
      subject: "Follow Up: Quotation",
      content: `Dear Customer,

I hope this email finds you well. I am writing to follow up on the quotation we sent on [DATE].

We would like to know:
1. Have you had a chance to review our quotation?
2. Do you have any questions about the pricing or terms?
3. Would you like us to make any adjustments?

We are flexible on terms for first orders and would be happy to discuss further.

Looking forward to your reply.

Best regards`,
      language: "EN" as const,
    },
    {
      title: "Sample Follow Up",
      scene: "SAMPLE_FOLLOW_UP" as const,
      subject: "Follow Up: Sample Status",
      content: `Dear Customer,

I hope you have received the samples we sent. We would like to know your feedback:

1. Did the samples meet your expectations?
2. Are there any adjustments needed?
3. What is your expected order timeline?

If you need any modifications to the samples, please let us know and we will be happy to accommodate your requirements.

Best regards`,
      language: "EN" as const,
    },
    {
      title: "No Reply Follow Up",
      scene: "NO_REPLY_FOLLOW_UP" as const,
      subject: "Friendly Follow Up",
      content: `Dear Customer,

I hope this email finds you well. I am writing to follow up on our previous correspondence.

We understand you may be busy, but we wanted to make sure you received our information. If you have any questions or need further details about our products, please do not hesitate to contact us.

We are always ready to assist you with your packaging needs.

Looking forward to hearing from you.

Best regards`,
      language: "EN" as const,
    },
    {
      title: "Price Negotiation",
      scene: "PRICE_NEGOTIATION" as const,
      subject: "Re: Price Discussion",
      content: `Dear Customer,

Thank you for your feedback on our quotation. We understand your concern about the pricing.

We would like to offer the following options:

1. Adjust the order quantity to [X] units for a better unit price
2. Consider alternative materials that offer similar quality at a lower cost
3. Discuss payment terms that could help with cash flow

We value your business and want to find a solution that works for both parties. Please let us know which option interests you, or if you have other suggestions.

Best regards`,
      language: "EN" as const,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.followUpTemplate.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.followUpTemplate.create({
        data: {
          title: t.title,
          scene: t.scene,
          subject: t.subject,
          content: t.content,
          language: t.language,
        },
      });
    }
  }
  console.log("✅ 跟进模板已创建（6条）");

  // ==================== 测试线索 ====================
  const leads = [
    { company: "Acme Corp", contactName: "John Smith", country: "USA", source: "WEBSITE" as const, status: "NEW" as const, email: "john@acme.com" },
    { company: "Global Trading Ltd", contactName: "Sarah Chen", country: "UK", source: "FACEBOOK" as const, status: "CONTACTED" as const, email: "sarah@globaltrading.com" },
    { company: "Tech Solutions GmbH", contactName: "Hans Mueller", country: "Germany", source: "MANUAL_OUTREACH" as const, status: "QUALIFIED" as const, email: "hans@techsol.de" },
    { company: "Sakura Industries", contactName: "Yuki Tanaka", country: "Japan", source: "TIKTOK" as const, status: "NEW" as const, email: "yuki@sakura.jp" },
    { company: "Lost Prospect Inc", contactName: "Mike Brown", country: "Canada", source: "EMAIL" as const, status: "LOST" as const, email: "mike@lostprospect.ca" },
  ];

  for (const l of leads) {
    await prisma.lead.upsert({
      where: { id: 0 }, // always fails -> catch below
      update: {},
      create: {
        company: l.company,
        contactName: l.contactName,
        country: l.country,
        source: l.source,
        status: l.status,
        email: l.email,
        businessLineId: blRecords[0].id,
      },
    }).catch(async () => {
      const existing = await prisma.lead.findFirst({ where: { company: l.company } });
      if (!existing) {
        await prisma.lead.create({
          data: {
            company: l.company,
            contactName: l.contactName,
            country: l.country,
            source: l.source,
            status: l.status,
            email: l.email,
            businessLineId: blRecords[0].id,
          },
        });
      }
    });
  }
  console.log("✅ 测试线索已创建（5条）");

  // ==================== Customers ====================
  console.log("\n📦 创建客户数据...");

  const customersData = [
    {
      company: "Pacific Rim Trading Co",
      contactName: "David Lee",
      country: "Singapore",
      email: "david@pacrim.com",
      phone: "+65 9123 4567",
      customerStatus: "ACTIVE" as const,
      lifecycleStage: "FIRST_DEAL" as const,
      industry: "Import/Export",
    },
    {
      company: "European Imports GmbH",
      contactName: "Anna Schmidt",
      country: "Germany",
      email: "anna@euimports.de",
      phone: "+49 30 1234567",
      customerStatus: "ACTIVE" as const,
      lifecycleStage: "INTENT" as const,
      industry: "Retail",
    },
    {
      company: "Middle East Supplies LLC",
      contactName: "Ahmed Hassan",
      country: "UAE",
      email: "ahmed@mesupplies.ae",
      phone: "+971 50 123 4567",
      customerStatus: "POTENTIAL" as const,
      lifecycleStage: "POTENTIAL" as const,
      industry: "Wholesale",
    },
  ];

  const blRecord = await prisma.businessLine.findFirst();
  const businessLineId = blRecord?.id || 1;

  for (const c of customersData) {
    const existing = await prisma.customer.findFirst({ where: { company: c.company } });
    if (!existing) {
      const customer = await prisma.customer.create({
        data: {
          ...c,
          businessLineId,
        },
      });
      // Create a primary contact for each customer
      await prisma.contact.create({
        data: {
          customerId: customer.id,
          name: c.contactName,
          email: c.email,
          phone: c.phone,
          isPrimary: true,
        },
      });
    }
  }
  console.log("✅ 客户数据已创建（3条）");

  // ==================== Quotes ====================
  console.log("\n📦 创建报价数据...");

  const customers = await prisma.customer.findMany({ take: 3 });
  if (customers.length > 0) {
    const quotesData = [
      {
        quoteNo: "QT-2026-001",
        quoteTitle: "Stand Up Pouch Quote for Pacific Rim",
        status: "ACCEPTED" as const,
        currency: "USD" as const,
        totalPrice: 12500,
        customerId: customers[0]?.id,
        validUntil: new Date("2026-07-31"),
      },
      {
        quoteNo: "QT-2026-002",
        quoteTitle: "Packing Machine Quote for EU Imports",
        status: "SENT" as const,
        currency: "EUR" as const,
        totalPrice: 45000,
        customerId: customers[1]?.id,
        validUntil: new Date("2026-08-15"),
      },
      {
        quoteNo: "QT-2026-003",
        quoteTitle: "Wooden Crafts Sample Order",
        status: "DRAFT" as const,
        currency: "USD" as const,
        totalPrice: 3200,
        customerId: customers[2]?.id || customers[0]?.id,
        validUntil: new Date("2026-07-15"),
      },
    ];

    for (const q of quotesData) {
      const existing = await prisma.quote.findUnique({ where: { quoteNo: q.quoteNo } });
      if (!existing && q.customerId) {
        const quote = await prisma.quote.create({ data: q });

        // Add items for each quote
        await prisma.quoteItem.createMany({
          data: [
            {
              quoteId: quote.id,
              itemName: "Stand Up Pouch 200g",
              specification: "200g, 130x180mm, matte finish",
              quantity: 50000,
              unit: "pcs",
              unitPrice: 0.15,
              totalPrice: 7500,
            },
            {
              quoteId: quote.id,
              itemName: "Spout Pouch 500ml",
              specification: "500ml, center spout, resealable",
              quantity: 25000,
              unit: "pcs",
              unitPrice: 0.2,
              totalPrice: 5000,
            },
          ],
        });
      }
    }
  }
  console.log("✅ 报价数据已创建（3条）");

  // ==================== Orders ====================
  console.log("\n📦 创建订单数据...");

  const quotes = await prisma.quote.findMany({ where: { status: "ACCEPTED" }, take: 1 });
  const allCustomers = await prisma.customer.findMany({ take: 3 });

  if (allCustomers.length > 0) {
    const ordersData = [
      {
        orderNo: "ORD-2026-001",
        orderTitle: "Stand Up Pouch Production Order",
        orderStatus: "SHIPPED" as const,
        customerId: allCustomers[0]?.id,
        quoteId: quotes[0]?.id || null,
        totalAmount: 12500,
        currency: "USD" as const,
        paymentTerm: "T/T 30% deposit, 70% before shipment",
        deliveryTerm: "FOB Shanghai",
      },
      {
        orderNo: "ORD-2026-002",
        orderTitle: "Wooden Crafts Sample Order",
        orderStatus: "COMPLETED" as const,
        customerId: allCustomers[2]?.id || allCustomers[0]?.id,
        totalAmount: 3200,
        currency: "USD" as const,
        paymentTerm: "PayPal",
        deliveryTerm: "EXW Factory",
      },
    ];

    for (const o of ordersData) {
      const existing = await prisma.order.findUnique({ where: { orderNo: o.orderNo } });
      if (!existing) {
        const order = await prisma.order.create({ data: o });

        // Add items
        await prisma.orderItem.createMany({
          data: [
            {
              orderId: order.id,
              itemName: "Stand Up Pouch 200g",
              specification: "200g, 130x180mm, matte finish",
              quantity: 50000,
              unit: "pcs",
              unitPrice: 0.15,
              totalPrice: 7500,
            },
            {
              orderId: order.id,
              itemName: "Spout Pouch 500ml",
              specification: "500ml, center spout, resealable",
              quantity: 25000,
              unit: "pcs",
              unitPrice: 0.2,
              totalPrice: 5000,
            },
          ],
        });
      }
    }
  }
  console.log("✅ 订单数据已创建（2条）");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
