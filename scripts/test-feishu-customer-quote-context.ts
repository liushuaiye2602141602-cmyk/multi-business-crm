import fs from "node:fs";

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  loadEnv();
  const prisma = (await import("../lib/prisma")).default;
  const quoteOrder = await import("../lib/services/quote-order-flow-service");
  const customerFlow = await import("../lib/services/customer-flow-service");
  const { executeWriteIntent } = await import("../lib/im/feishu-write-executor");

  const stamp = Date.now();
  const context = {
    senderId: `customer-quote-context-user-${stamp}`,
    chatId: `customer-quote-context-chat-${stamp}`,
    messageId: `customer-quote-context-msg-${stamp}`,
  };
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  assert(businessLine, "business line fixture missing");
  const customer = await prisma.customer.create({
    data: {
      company: `QuoteContextCustomer${stamp}`,
      contactName: "Quote Context",
      businessLineId: businessLine.id,
      tenantId: 1,
    },
  });
  const lead = await prisma.lead.create({
    data: {
      company: `ConvertedQuoteContextLead${stamp}`,
      contactName: "Converted Contact",
      businessLineId: businessLine.id,
      tenantId: 1,
    },
  });

  try {
    const stored = (quoteOrder as any).__quoteOrderFlowTestUtils.rememberCustomerForTest(context, {
      id: customer.id,
      company: customer.company,
      converted: true,
    });
    assert(stored?.activeCustomerId === customer.id, `activeCustomerId not written: ${JSON.stringify(stored)}`);
    assert(stored?.activeCustomerName === customer.company, `activeCustomerName not written: ${JSON.stringify(stored)}`);
    assert(stored?.lastConvertedCustomerId === customer.id, `lastConvertedCustomerId not written: ${JSON.stringify(stored)}`);

    const validation = await quoteOrder.validateCreateQuotePlan(
      { currency: "USD" },
      [{ productName: "context bag", quantity: 1000, unit: "pcs", unitPrice: 1, currency: "USD" }],
      undefined,
      undefined,
      undefined,
      context,
    );
    assert(validation.success && validation.plan, `quote validation should use active customer context: ${validation.message}`);
    assert(validation.plan.validatedParameters.data.customerId === customer.id, `quote customerId mismatch: ${validation.plan.validatedParameters.data.customerId}`);

    const convertValidation = await customerFlow.validateConvertLeadToCustomerPlan({ id: lead.id }, context.messageId);
    assert(convertValidation.success && convertValidation.plan, `convert validation failed: ${convertValidation.message}`);
    const convertResult = await executeWriteIntent(
      { intent: "CONVERT_LEAD_TO_CUSTOMER", confidence: 1, parameters: { customerFlowPlan: convertValidation.plan } } as any,
      context.senderId,
      context.chatId,
    );
    assert(convertResult.success && convertResult.entityId, `convert execution failed: ${convertResult.message}`);

    const convertedQuoteValidation = await quoteOrder.validateCreateQuotePlan(
      { currency: "USD" },
      [{ productName: "converted context bag", quantity: 2000, unit: "pcs", unitPrice: 1, currency: "USD" }],
      undefined,
      undefined,
      undefined,
      context,
    );
    assert(convertedQuoteValidation.success && convertedQuoteValidation.plan, `quote validation should use converted customer context: ${convertedQuoteValidation.message}`);
    assert(
      convertedQuoteValidation.plan.validatedParameters.data.customerId === convertResult.entityId,
      `converted quote customerId mismatch: ${convertedQuoteValidation.plan.validatedParameters.data.customerId} !== ${convertResult.entityId}`,
    );

    console.log(JSON.stringify({
      activeCustomerId: stored.activeCustomerId,
      activeCustomerName: stored.activeCustomerName,
      lastConvertedCustomerId: stored.lastConvertedCustomerId,
      quoteCustomerId: validation.plan.validatedParameters.data.customerId,
      convertedCustomerId: convertResult.entityId,
      convertedQuoteCustomerId: convertedQuoteValidation.plan.validatedParameters.data.customerId,
      quoteValidationSuccess: validation.success,
    }, null, 2));
  } finally {
    const convertedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    if (convertedLead?.convertedCustomerId) {
      await prisma.contact.deleteMany({ where: { customerId: convertedLead.convertedCustomerId } });
      await prisma.customer.deleteMany({ where: { id: convertedLead.convertedCustomerId } });
    }
    await prisma.lead.deleteMany({ where: { id: lead.id } });
    await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
