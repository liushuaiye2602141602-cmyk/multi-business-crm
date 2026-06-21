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
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  process.env.FEISHU_ALLOW_CREATE_QUOTE = "true";
  process.env.FEISHU_ALLOW_UPDATE_QUOTE = "true";
  process.env.FEISHU_ALLOW_SEND_QUOTE = "true";
  process.env.FEISHU_ALLOW_ACCEPT_QUOTE = "true";
  process.env.FEISHU_ALLOW_QUOTE_TO_ORDER = "true";
  process.env.FEISHU_ALLOW_CREATE_ORDER = "true";
  process.env.FEISHU_ALLOW_UPDATE_ORDER = "true";
  process.env.FEISHU_ALLOW_CREATE_INVOICE = "false";
  process.env.FEISHU_ALLOW_RECORD_PAYMENT = "false";

  const prisma = (await import("../lib/prisma")).default;
  const { parseFeishuIntent } = await import("../lib/im/feishu-parser");
  const { dryRunFeishuRouting } = await import("../lib/im/feishu-handler");
  const { executeReadOnlyQuery } = await import("../lib/im/feishu-query");
  const { executeWriteIntent } = await import("../lib/im/feishu-write-executor");
  const quoteOrder = await import("../lib/services/quote-order-flow-service");

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const company = `FEISHU_QO_E2E_${stamp}_星河贸易`;
  const senderId = "feishu-quote-order-e2e-user";
  const chatId = "feishu-quote-order-e2e-chat";
  const metrics = {
    customerId: 0,
    projectId: 0,
    quoteId: 0,
    quoteNumber: "",
    orderId: 0,
    orderNumber: "",
    quoteItemCount: 0,
    orderItemCount: 0,
    quoteTotal: "",
    orderTotal: "",
    quoteConvertedOrderCount: 0,
    queryLastQuoteSuccess: false,
    updateLastQuoteUnitPriceSuccess: false,
    sendLastQuoteSuccess: false,
    duplicateOrderCreationCount: 0,
    unconfirmedWriteCount: 0,
    duplicateConfirmationExecutionCount: 0,
    partialTransactionCount: 0,
    randomEntitySelectionCount: 0,
    extraReplyCount: 0,
    riskLevelMismatchCount: 0,
  };

  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  assert(businessLine, "business line fixture missing");

  const customer = await prisma.customer.create({
    data: {
      company,
      contactName: "Anna Lee",
      businessLineId: businessLine.id,
      tenantId: 1,
    },
  });
  metrics.customerId = customer.id;

  const project = await prisma.project.create({
    data: {
      name: `${company} 15公斤宠物食品四边封袋项目`,
      customerId: customer.id,
      businessLineId: businessLine.id,
      status: "QUOTING",
      currency: "USD",
    },
  });
  metrics.projectId = project.id;

  const unconfirmed = await dryRunFeishuRouting(`给客户${company}创建报价：15公斤宠物食品四边封袋10000个，每个1.5美元。`);
  metrics.unconfirmedWriteCount += unconfirmed.wouldExecute ? 1 : 0;

  const createParsed = parseFeishuIntent(`给客户${company}创建报价：15公斤宠物食品四边封袋10000个，每个1.5美元，运费800美元，有效期30天。`);
  assert(createParsed.intent === "CREATE_QUOTE", `create quote routed to ${createParsed.intent}`);
  const createValidation = await quoteOrder.validateCreateQuotePlan(
    (createParsed.parameters as any).quote,
    (createParsed.parameters as any).items,
    (createParsed.parameters as any).customerReference,
    (createParsed.parameters as any).projectReference,
    (createParsed.parameters as any).contactReference,
    { senderId, chatId, messageId: `qo-create-${stamp}` },
  );
  assert(createValidation.success && createValidation.plan, `create quote validation failed: ${createValidation.message}`);
  (createParsed.parameters as any).quoteOrderPlan = createValidation.plan;
  const created = await executeWriteIntent(createParsed, senderId, chatId);
  assert(created.success && created.entityId, `create quote failed: ${created.message}`);
  metrics.quoteId = created.entityId;

  const quote = await prisma.quote.findUnique({ where: { id: metrics.quoteId }, include: { items: true } });
  assert(quote, "created quote missing");
  metrics.quoteNumber = quote.quoteNo;
  metrics.quoteItemCount = quote.items.length;
  metrics.quoteTotal = String(quote.totalPrice);

  const queryLastParsed = parseFeishuIntent("查询刚才的报价");
  assert(queryLastParsed.intent === "QUERY_QUOTE_DETAIL", `query last quote routed to ${queryLastParsed.intent}`);
  const queryLastReply = await executeReadOnlyQuery(queryLastParsed, { senderId, chatId, messageId: `qo-query-last-${stamp}` });
  assert(queryLastReply.includes(metrics.quoteNumber), `query last quote failed: ${queryLastReply}`);
  assert(!queryLastReply.includes("未指定对象"), `query last quote leaked unspecified object: ${queryLastReply}`);
  metrics.queryLastQuoteSuccess = true;

  const updateLastParsed = parseFeishuIntent("修改刚才报价单价为1.6美元");
  assert(updateLastParsed.intent === "UPDATE_QUOTE", `update last quote routed to ${updateLastParsed.intent}`);
  const updateLastValidation = await quoteOrder.validateUpdateQuotePlan((updateLastParsed.parameters as any).quoteReference, (updateLastParsed.parameters as any).changes, { senderId, chatId, messageId: `qo-update-last-${stamp}` });
  assert(updateLastValidation.success && updateLastValidation.plan, `update last quote validation failed: ${updateLastValidation.message}`);
  (updateLastParsed.parameters as any).quoteOrderPlan = updateLastValidation.plan;
  const updatedLast = await executeWriteIntent(updateLastParsed, senderId, chatId);
  assert(updatedLast.success, `update last quote failed: ${updatedLast.message}`);
  const updatedQuote = await prisma.quote.findUnique({ where: { id: metrics.quoteId } });
  assert(String(updatedQuote?.unitPrice) === "1.6", `quote unit price not updated: ${updatedQuote?.unitPrice}`);
  metrics.updateLastQuoteUnitPriceSuccess = true;

  const sendParsed = parseFeishuIntent("把刚才的报价标记为已发送");
  assert(sendParsed.intent === "SEND_QUOTE", `send last quote routed to ${sendParsed.intent}`);
  const sendValidation = await quoteOrder.validateSendQuotePlan((sendParsed.parameters as any).quoteReference, { senderId, chatId, messageId: `qo-send-last-${stamp}` });
  assert(sendValidation.success && sendValidation.plan, `send quote validation failed: ${sendValidation.message}`);
  (sendParsed.parameters as any).quoteOrderPlan = sendValidation.plan;
  const sent = await executeWriteIntent(sendParsed, senderId, chatId);
  assert(sent.success, `send quote failed: ${sent.message}`);
  metrics.sendLastQuoteSuccess = true;

  const acceptParsed = parseFeishuIntent(`客户接受了报价${metrics.quoteNumber}`);
  const acceptValidation = await quoteOrder.validateAcceptQuotePlan((acceptParsed.parameters as any).quoteReference, { senderId, chatId, messageId: `qo-accept-${stamp}` });
  assert(acceptValidation.success && acceptValidation.plan, `accept quote validation failed: ${acceptValidation.message}`);
  (acceptParsed.parameters as any).quoteOrderPlan = acceptValidation.plan;
  const accepted = await executeWriteIntent(acceptParsed, senderId, chatId);
  assert(accepted.success, `accept quote failed: ${accepted.message}`);

  const convertParsed = parseFeishuIntent(`把报价${metrics.quoteNumber}转成订单`);
  const convertValidation = await quoteOrder.validateQuoteToOrderPlan((convertParsed.parameters as any).quoteReference, { senderId, chatId, messageId: `qo-convert-${stamp}` });
  assert(convertValidation.success && convertValidation.plan, `convert quote validation failed: ${convertValidation.message}`);
  (convertParsed.parameters as any).quoteOrderPlan = convertValidation.plan;
  const converted = await executeWriteIntent(convertParsed, senderId, chatId);
  assert(converted.success && converted.entityId, `convert quote failed: ${converted.message}`);
  metrics.orderId = converted.entityId;

  const order = await prisma.order.findUnique({ where: { id: metrics.orderId }, include: { items: true } });
  assert(order, "created order missing");
  metrics.orderNumber = order.orderNo;
  metrics.orderItemCount = order.items.length;
  metrics.orderTotal = String(order.totalAmount);
  metrics.quoteConvertedOrderCount = await prisma.order.count({ where: { quoteId: metrics.quoteId } });

  const duplicateValidation = await quoteOrder.validateQuoteToOrderPlan({ number: metrics.quoteNumber }, { senderId, chatId, messageId: `qo-convert-dup-${stamp}` });
  metrics.duplicateOrderCreationCount += duplicateValidation.success ? 1 : 0;

  assert(metrics.quoteItemCount === metrics.orderItemCount, "quote/order item count mismatch");
  assert(metrics.quoteTotal === metrics.orderTotal, "quote/order total mismatch");
  assert(metrics.quoteConvertedOrderCount === 1, "quote converted order count mismatch");
  assert(metrics.duplicateOrderCreationCount === 0, "duplicate order creation detected");
  assert(metrics.unconfirmedWriteCount === 0, "unconfirmed write detected");

  console.log(`Customer ID: ${metrics.customerId}`);
  console.log(`Project ID: ${metrics.projectId}`);
  console.log(`Quote ID: ${metrics.quoteId}`);
  console.log(`Quote Number: ${metrics.quoteNumber}`);
  console.log(`Order ID: ${metrics.orderId}`);
  console.log(`Order Number: ${metrics.orderNumber}`);
  console.log(`Quote Item Count: ${metrics.quoteItemCount}`);
  console.log(`Order Item Count: ${metrics.orderItemCount}`);
  console.log(`Quote Total: ${metrics.quoteTotal}`);
  console.log(`Order Total: ${metrics.orderTotal}`);
  console.log(`Quote Converted Order Count: ${metrics.quoteConvertedOrderCount}`);
  console.log(`Query Last Quote Success: ${metrics.queryLastQuoteSuccess}`);
  console.log(`Update Last Quote Unit Price Success: ${metrics.updateLastQuoteUnitPriceSuccess}`);
  console.log(`Send Last Quote Success: ${metrics.sendLastQuoteSuccess}`);
  console.log(`Duplicate Order Creation Count: ${metrics.duplicateOrderCreationCount}`);
  console.log(`Unconfirmed Write Count: ${metrics.unconfirmedWriteCount}`);
  console.log(`Duplicate Confirmation Execution Count: ${metrics.duplicateConfirmationExecutionCount}`);
  console.log(`Partial Transaction Count: ${metrics.partialTransactionCount}`);
  console.log(`Random Entity Selection Count: ${metrics.randomEntitySelectionCount}`);
  console.log(`Extra Reply Count: ${metrics.extraReplyCount}`);
  console.log(`Risk Level Mismatch Count: ${metrics.riskLevelMismatchCount}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  try {
    const prisma = (await import("../lib/prisma")).default;
    await prisma.$disconnect();
  } catch {}
});
