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

  const prisma = (await import("../lib/prisma")).default;
  const { parseFeishuIntent } = await import("../lib/im/feishu-parser");
  const { executeReadOnlyQuery } = await import("../lib/im/feishu-query");
  const { executeWriteIntent } = await import("../lib/im/feishu-write-executor");
  const quoteOrder = await import("../lib/services/quote-order-flow-service");

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const senderId = `feishu-order-sm-user-${stamp}`;
  const chatId = `feishu-order-sm-chat-${stamp}`;
  const ctx = (messageId: string) => ({ senderId, chatId, messageId });
  const metrics = {
    quoteId: 0,
    quoteNumber: "",
    orderId: 0,
    orderNumber: "",
    convertedOrderId: 0,
    quoteStatus: "",
    orderStatusTrace: [] as string[],
    duplicateOrderCount: 0,
    rollbackMismatchCount: 0,
    quotePollutionCount: 0,
    stateRegressionBlocked: false,
    explicitOrderQueryOk: false,
    lastOrderQueryOk: false,
    amountConsistencyOk: false,
    itemConsistencyOk: false,
    contextOrderIdOk: false,
  };

  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  assert(businessLine, "business line fixture missing");

  const customer = await prisma.customer.create({
    data: {
      company: `FEISHU_ORDER_SM_${stamp}_星河贸易`,
      contactName: "Order Tester",
      businessLineId: businessLine.id,
      tenantId: 1,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: `FEISHU_ORDER_SM_${stamp}_项目`,
      customerId: customer.id,
      businessLineId: businessLine.id,
      status: "QUOTING",
      currency: "USD",
    },
  });

  const createParsed = parseFeishuIntent(`给客户${customer.company}创建报价：15公斤宠物食品四边封袋10000个，每个1.5美元，运费800美元，有效期30天。`);
  assert(createParsed.intent === "CREATE_QUOTE", `create quote routed to ${createParsed.intent}`);
  const createValidation = await quoteOrder.validateCreateQuotePlan(
    (createParsed.parameters as any).quote,
    (createParsed.parameters as any).items,
    (createParsed.parameters as any).customerReference,
    { id: project.id },
    (createParsed.parameters as any).contactReference,
    ctx("create-quote"),
  );
  assert(createValidation.success && createValidation.plan, `create quote validation failed: ${createValidation.message}`);
  (createParsed.parameters as any).quoteOrderPlan = createValidation.plan;
  const createdQuote = await executeWriteIntent(createParsed, senderId, chatId);
  assert(createdQuote.success && createdQuote.entityId, `create quote failed: ${createdQuote.message}`);
  metrics.quoteId = createdQuote.entityId;

  const quoteBeforeAccept = await prisma.quote.findUnique({ where: { id: metrics.quoteId }, include: { items: true } });
  assert(quoteBeforeAccept, "quote missing before accept");
  metrics.quoteNumber = quoteBeforeAccept.quoteNo;

  const acceptValidation = await quoteOrder.validateAcceptQuotePlan({ id: metrics.quoteId }, ctx("accept-quote"));
  assert(acceptValidation.success && acceptValidation.plan, `accept validation failed: ${acceptValidation.message}`);
  const accepted = await executeWriteIntent({ intent: "ACCEPT_QUOTE", confidence: 1, parameters: { quoteOrderPlan: acceptValidation.plan } } as any, senderId, chatId);
  assert(accepted.success && accepted.entityId === metrics.quoteId, `accept failed: ${accepted.message}`);

  const convertValidation = await quoteOrder.validateQuoteToOrderPlan({ id: metrics.quoteId }, ctx("quote-to-order"));
  assert(convertValidation.success && convertValidation.plan, `convert validation failed: ${convertValidation.message}`);
  const converted = await executeWriteIntent({ intent: "CONVERT_QUOTE_TO_ORDER", confidence: 1, parameters: { quoteOrderPlan: convertValidation.plan } } as any, senderId, chatId);
  assert(converted.success && converted.entityId, `quote to order failed: ${converted.message}`);
  metrics.orderId = converted.entityId;

  const order = await prisma.order.findUnique({ where: { id: metrics.orderId }, include: { items: true, quote: true } });
  const quoteAfterConvert = await prisma.quote.findUnique({ where: { id: metrics.quoteId }, include: { items: true, orders: true } });
  assert(order && quoteAfterConvert, "order or quote missing after conversion");
  metrics.orderNumber = order.orderNo;
  metrics.convertedOrderId = (quoteAfterConvert as any).convertedOrderId || 0;
  metrics.quoteStatus = quoteAfterConvert.status;
  metrics.orderStatusTrace.push(order.orderStatus);
  metrics.amountConsistencyOk = String(order.totalAmount) === String(quoteAfterConvert.totalPrice) && order.currency === quoteAfterConvert.currency;
  metrics.itemConsistencyOk = order.items.length === quoteAfterConvert.items.length
    && order.items.every((item, index) => item.itemName === quoteAfterConvert.items[index].itemName && String(item.totalPrice) === String(quoteAfterConvert.items[index].totalPrice));
  metrics.contextOrderIdOk = ((quoteOrder as any).__quoteOrderFlowTestUtils.resolveOrderReferenceForTest({ useLastOrder: true }, ctx("inspect-order")).ref?.id) === metrics.orderId;
  assert(metrics.convertedOrderId === metrics.orderId, `convertedOrderId mismatch: ${metrics.convertedOrderId} !== ${metrics.orderId}`);
  assert(metrics.quoteStatus === "CONVERTED", `quote status not converted: ${metrics.quoteStatus}`);
  assert(order.orderStatus === "CONFIRMED", `initial quote-to-order status wrong: ${order.orderStatus}`);
  assert(metrics.amountConsistencyOk, "order amount/currency mismatch");
  assert(metrics.itemConsistencyOk, "order item mismatch");
  assert(metrics.contextOrderIdOk, "lastOrderId not written");

  const manualOrder = await prisma.order.create({
    data: {
      orderNo: `O-MANUAL-${stamp}`,
      customerId: customer.id,
      orderStatus: "PENDING_CONFIRMATION",
      totalAmount: "100",
      currency: "USD",
      tenantId: 1,
    },
  });
  const manualJump = await quoteOrder.validateUpdateOrderPlan(
    { id: manualOrder.id },
    { status: "IN_PRODUCTION" },
    { senderId: `${senderId}-manual`, chatId: `${chatId}-manual`, messageId: `manual-jump-${stamp}` },
  );
  assert(!manualJump.success, `manual PENDING_CONFIRMATION -> IN_PRODUCTION should be blocked: ${manualJump.message}`);

  const duplicateValidation = await quoteOrder.validateQuoteToOrderPlan({ id: metrics.quoteId }, ctx("duplicate-convert"));
  assert(!duplicateValidation.success && /已生成订单|已存在订单/.test(duplicateValidation.message), `duplicate convert not blocked: ${duplicateValidation.message}`);
  metrics.duplicateOrderCount = await prisma.order.count({ where: { quoteId: metrics.quoteId } });
  assert(metrics.duplicateOrderCount === 1, `duplicate order count ${metrics.duplicateOrderCount}`);

  const flow = [
    ["订单改为生产中", "IN_PRODUCTION"],
    ["订单改为待发货", "READY_TO_SHIP"],
    ["标记订单已发货", "SHIPPED"],
    ["订单完成", "COMPLETED"],
  ] as const;
  for (const [text, expected] of flow) {
    const parsed = parseFeishuIntent(text);
    assert(parsed.intent === "UPDATE_ORDER", `${text} routed to ${parsed.intent}`);
    const validation = await quoteOrder.validateUpdateOrderPlan((parsed.parameters as any).orderReference || { useLastOrder: true }, (parsed.parameters as any).changes, ctx(`state-${expected}`));
    assert(validation.success && validation.plan, `${text} validation failed: ${validation.message}`);
    const result = await executeWriteIntent({ intent: "UPDATE_ORDER", confidence: 1, parameters: { quoteOrderPlan: validation.plan } } as any, senderId, chatId);
    assert(result.success && result.entityId === metrics.orderId, `${text} execution failed: ${result.message}`);
    const updatedOrder = await prisma.order.findUnique({ where: { id: metrics.orderId } });
    metrics.orderStatusTrace.push(updatedOrder?.orderStatus || "");
    assert(updatedOrder?.orderStatus === expected, `${text} stored ${updatedOrder?.orderStatus}, expected ${expected}`);
  }

  const regression = await quoteOrder.validateUpdateOrderPlan({ id: metrics.orderId }, { status: "IN_PRODUCTION" }, ctx("regression"));
  metrics.stateRegressionBlocked = !regression.success;
  assert(metrics.stateRegressionBlocked, "COMPLETED -> IN_PRODUCTION was not blocked");

  const quoteAfterOrderUpdate = await prisma.quote.findUnique({ where: { id: metrics.quoteId } });
  metrics.quotePollutionCount = quoteAfterOrderUpdate?.status === "CONVERTED" && String(quoteAfterOrderUpdate.totalPrice) === String(quoteAfterConvert.totalPrice) ? 0 : 1;
  assert(metrics.quotePollutionCount === 0, "order update polluted quote");

  const lastOrderReply = await executeReadOnlyQuery(parseFeishuIntent("查询刚才的订单"), ctx("query-last-order"));
  metrics.lastOrderQueryOk = lastOrderReply.includes(metrics.orderNumber);
  assert(metrics.lastOrderQueryOk, `last order query failed: ${lastOrderReply}`);

  const explicitOrderReply = await executeReadOnlyQuery(parseFeishuIntent(`查询订单${metrics.orderNumber}`), ctx("query-explicit-order"));
  metrics.explicitOrderQueryOk = explicitOrderReply.includes(metrics.orderNumber);
  assert(metrics.explicitOrderQueryOk, `explicit order query failed: ${explicitOrderReply}`);

  metrics.rollbackMismatchCount = await prisma.order.count({ where: { quoteId: metrics.quoteId } }) === 1 ? 0 : 1;
  assert(metrics.rollbackMismatchCount === 0, "quote/order rollback consistency mismatch");

  console.log(JSON.stringify(metrics, null, 2));
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
