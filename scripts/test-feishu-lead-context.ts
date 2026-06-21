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
  process.env.FEISHU_ALLOW_CREATE_LEAD = "true";
  process.env.FEISHU_ALLOW_CONVERT_LEAD = "true";
  process.env.FEISHU_READ_ONLY = "false";

  const prisma = (await import("../lib/prisma")).default;
  const customerFlow = await import("../lib/services/customer-flow-service");
  const { executeWriteIntent } = await import("../lib/im/feishu-write-executor");
  const { parseFeishuIntent } = await import("../lib/im/feishu-parser");

  const stamp = Date.now();
  const context = {
    senderId: `lead-context-user-${stamp}`,
    chatId: `lead-context-chat-${stamp}`,
    messageId: `lead-context-create-${stamp}`,
  };
  const company = `LeadContext${stamp}`;
  const email = `lead-context-${stamp}@example.com`;
  let leadId: number | undefined;
  let customerId: number | undefined;

  try {
    const createResult = await executeWriteIntent(
      {
        intent: "CREATE_LEAD",
        confidence: 1,
        parameters: {
          exactName: company,
          contactName: "Lead Context Contact",
          email,
          country: "US",
          requirement: "context conversion regression",
          originalMessageId: context.messageId,
        },
      } as any,
      context.senderId,
      context.chatId,
    );
    assert(createResult.success && createResult.entityId, `create lead failed: ${createResult.message}`);
    leadId = createResult.entityId;

    const stored = (customerFlow as any).__customerFlowTestUtils.getLeadConversationContext(context);
    assert(stored?.activeLeadId === leadId, `activeLeadId not written: ${JSON.stringify(stored)}`);
    assert(stored?.lastLeadId === leadId, `lastLeadId not written: ${JSON.stringify(stored)}`);
    assert(stored?.activeLeadCompany === company, `activeLeadCompany not written: ${JSON.stringify(stored)}`);

    const parsed = parseFeishuIntent("转客户");
    assert(parsed.intent === "CONVERT_LEAD_TO_CUSTOMER", `convert text routed to ${parsed.intent}`);

    const validation = await customerFlow.validateConvertLeadToCustomerPlan(
      (parsed.parameters as any).leadReference || {},
      { ...context, messageId: `lead-context-convert-${stamp}` },
    );
    assert(validation.success && validation.plan, `convert validation failed: ${validation.message}`);
    assert(validation.entityId === leadId, `validation did not use last lead: ${validation.entityId} !== ${leadId}`);

    const convertResult = await executeWriteIntent(
      { intent: "CONVERT_LEAD_TO_CUSTOMER", confidence: 1, parameters: { customerFlowPlan: validation.plan } } as any,
      context.senderId,
      context.chatId,
    );
    assert(convertResult.success && convertResult.entityId, `convert execution failed: ${convertResult.message}`);
    customerId = convertResult.entityId;

    const afterConvert = (customerFlow as any).__customerFlowTestUtils.getLeadConversationContext(context);
    assert(afterConvert?.activeLeadId === leadId, `activeLeadId lost after convert: ${JSON.stringify(afterConvert)}`);
    assert(afterConvert?.lastConvertedCustomerId === customerId, `lastConvertedCustomerId not written: ${JSON.stringify(afterConvert)}`);

    console.log(JSON.stringify({
      createLeadSuccess: createResult.success,
      activeLeadId: stored.activeLeadId,
      lastLeadId: stored.lastLeadId,
      activeLeadCompany: stored.activeLeadCompany,
      convertIntent: parsed.intent,
      resolvedLeadId: validation.entityId,
      convertedCustomerId: customerId,
      lastConvertedCustomerId: afterConvert.lastConvertedCustomerId,
    }, null, 2));
  } finally {
    if (customerId) {
      await prisma.contact.deleteMany({ where: { customerId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
    if (leadId) await prisma.lead.deleteMany({ where: { id: leadId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
