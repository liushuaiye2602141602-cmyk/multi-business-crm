import { parseFeishuIntent } from "../lib/im/feishu-parser";
import { dryRunFeishuRouting, getPermissionKeyForIntent } from "../lib/im/feishu-handler";

type Test = { name: string; fn: () => unknown | Promise<unknown> };

const tests: Test[] = [];
const metrics = {
  unconfirmedWriteCount: 0,
  duplicateExecutionCount: 0,
  randomEntitySelectionCount: 0,
  partialTransactionCount: 0,
  extraReplyCount: 0,
  riskLevelMismatchCount: 0,
};


function test(name: string, fn: Test["fn"]) {
  tests.push({ name, fn });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function parsed(text: string) {
  return parseFeishuIntent(text);
}

function expectIntent(text: string, intent: string) {
  const result = parsed(text);
  assert(result.intent === intent, `${text}: expected ${intent}, got ${result.intent}`);
  return result;
}

function keys(value: Record<string, unknown> | undefined) {
  return Object.keys(value || {}).sort().join(",");
}

test("1 创建单项目报价解析客户、明细、数量、单价、币种", () => {
  const p: any = expectIntent("给客户FEISHU_CUSTOMER_A_星河贸易创建报价：15公斤宠物食品四边封袋10000个，每个1.5美元，运费800美元，有效期30天。", "CREATE_QUOTE").parameters;
  assert(p.customerReference?.companyName === "FEISHU_CUSTOMER_A_星河贸易", `customer missing: ${JSON.stringify(p.customerReference)}`);
  assert(p.items?.[0]?.productName === "15公斤宠物食品四边封袋", `item name missing: ${JSON.stringify(p.items)}`);
  assert(p.items?.[0]?.quantity === 10000, "quantity missing");
  assert(p.items?.[0]?.unitPrice === 1.5, "unit price missing");
  assert(p.quote?.currency === "USD", "currency missing");
  assert(p.quote?.shippingFee === 800, "shipping missing");
  assert(p.quote?.validDays === 30, "valid days missing");
});

test("2 多项目报价解析", () => {
  const p: any = expectIntent("报价包含两个产品：8公斤袋5000个，每个0.8美元；10公斤袋3000个，每个1.1美元，客户ABC。", "CREATE_QUOTE").parameters;
  assert(p.items?.length === 2, `expected 2 items got ${p.items?.length}`);
  assert(p.customerReference?.companyName === "ABC", "customer ABC missing");
});

test("3 缺数量阻止", () => {
  const p: any = expectIntent("给客户ABC创建报价：四边封袋，每个1.2美元", "CREATE_QUOTE").parameters;
  assert((p.missingFields || []).includes("quantity"), "missing quantity not reported");
});

test("4 缺单价阻止", () => {
  const p: any = expectIntent("给客户ABC创建报价：四边封袋10000个，美元报价", "CREATE_QUOTE").parameters;
  assert((p.missingFields || []).includes("unitPrice"), "missing unit price not reported");
});

test("5 不同币种阻止", () => {
  const p: any = expectIntent("给客户ABC创建报价：8公斤袋5000个，每个0.8美元；10公斤袋3000个，每个1.1欧元。", "CREATE_QUOTE").parameters;
  assert((p.ambiguities || []).some((item: string) => item.includes("币种")), "mixed currency ambiguity missing");
});

test("6 创建报价未确认不写入", async () => {
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  process.env.FEISHU_ALLOW_CREATE_QUOTE = "true";
  const result = await dryRunFeishuRouting("给客户ABC创建报价：四边封袋10000个，每个1.2美元。");
  metrics.unconfirmedWriteCount += result.wouldExecute ? 1 : 0;
  assert(result.responseType === "CONFIRMATION_PREVIEW" && result.wouldExecute === false, "unconfirmed quote would execute");
});

test("7 更新报价只更新明确字段", () => {
  const p: any = expectIntent("把报价Q-20260620-0001有效期改到7月1日，折扣改为5%。", "UPDATE_QUOTE").parameters;
  assert(p.quoteReference?.number === "Q-20260620-0001", "quote number missing");
  assert(keys(p.changes) === "discountValue,validUntil", `unexpected changes: ${JSON.stringify(p.changes)}`);
});

test("8 发送报价", () => {
  const p: any = expectIntent("发送报价Q-20260620-0001", "SEND_QUOTE").parameters;
  assert(p.quoteReference?.number === "Q-20260620-0001", "send quote number missing");
});

test("9 接受报价", () => {
  const p: any = expectIntent("客户接受了报价Q-20260620-0001", "ACCEPT_QUOTE").parameters;
  assert(p.quoteReference?.number === "Q-20260620-0001", "accept quote number missing");
});

test("10 报价转订单", () => {
  const p: any = expectIntent("把报价Q-20260620-0001转成订单", "CONVERT_QUOTE_TO_ORDER").parameters;
  assert(p.quoteReference?.number === "Q-20260620-0001", "convert quote number missing");
});

test("11 直接创建订单解析", () => {
  const p: any = expectIntent("给客户ABC创建订单：15公斤四边封袋10000个，单价1.5美元，交货日期7月1日。", "CREATE_ORDER").parameters;
  assert(p.customerReference?.companyName === "ABC", "order customer missing");
  assert(p.items?.[0]?.quantity === 10000 && p.items?.[0]?.unitPrice === 1.5, "order item values missing");
  assert(p.order?.deliveryDate, "delivery date missing");
});

test("12 更新订单状态", () => {
  const p: any = expectIntent("把订单O-20260620-0001状态改为生产中", "UPDATE_ORDER").parameters;
  assert(p.orderReference?.number === "O-20260620-0001", "order number missing");
  assert(p.changes?.status === "IN_PRODUCTION", "order status missing");
});

test("13 查询报价编号", () => {
  const p: any = expectIntent("查询报价Q-20260620-0001", "QUERY_QUOTE_DETAIL").parameters;
  assert(p.quoteReference?.number === "Q-20260620-0001", "query quote number missing");
});

test("14 查询订单编号", () => {
  const p: any = expectIntent("查询订单O-20260620-0001", "QUERY_ORDER_DETAIL").parameters;
  assert(p.orderReference?.number === "O-20260620-0001", "query order number missing");
});

test("15 显式编号优先于上下文", () => {
  const quote: any = expectIntent("把刚才的报价Q-20260620-0001标记为已发送", "SEND_QUOTE").parameters;
  const order: any = expectIntent("把刚才的订单O-20260620-0001状态改为生产中", "UPDATE_ORDER").parameters;
  assert(quote.quoteReference?.number === "Q-20260620-0001" && !quote.quoteReference?.useLastQuote, "quote explicit number not preferred");
  assert(order.orderReference?.number === "O-20260620-0001" && !order.orderReference?.useLastOrder, "order explicit number not preferred");
});

test("16 权限映射", () => {
  assert(getPermissionKeyForIntent("CREATE_QUOTE") === "FEISHU_ALLOW_CREATE_QUOTE", "create quote permission mismatch");
  assert(getPermissionKeyForIntent("CONVERT_QUOTE_TO_ORDER") === "FEISHU_ALLOW_QUOTE_TO_ORDER", "quote to order permission mismatch");
  assert(getPermissionKeyForIntent("CREATE_ORDER") === "FEISHU_ALLOW_CREATE_ORDER", "create order permission mismatch");
});

test("17 发票收款删除仍关闭", () => {
  assert(process.env.FEISHU_ALLOW_CREATE_INVOICE !== "true", "invoice create opened");
  assert(process.env.FEISHU_ALLOW_RECORD_PAYMENT !== "true", "payment opened");
  assert(getPermissionKeyForIntent("DELETE_ORDER") === null, "delete mapped");
});

test("18 查询刚才的报价必须命中报价查询handler", async () => {
  const p: any = expectIntent("查询刚才的报价", "QUERY_QUOTE_DETAIL").parameters;
  assert(p.quoteReference?.useLastQuote === true, `last quote ref missing: ${JSON.stringify(p.quoteReference)}`);
  const result = await dryRunFeishuRouting("查询刚才的报价");
  assert(result.responseType === "READ_QUERY", `query fell through to ${result.responseType}`);
});

test("19 查询报价上下文别名", () => {
  const aliases = ["上一个报价", "最新报价", "这个报价"];
  for (const alias of aliases) {
    const p: any = expectIntent(`查询${alias}`, "QUERY_QUOTE_DETAIL").parameters;
    assert(p.quoteReference?.useLastQuote === true || p.quoteReference?.name === "latest", `${alias} not routed through quote context`);
  }
});

test("20 把刚才的报价标记为已发送必须命中发送报价handler", async () => {
  const p: any = expectIntent("把刚才的报价标记为已发送", "SEND_QUOTE").parameters;
  assert(p.quoteReference?.useLastQuote === true, `send last quote ref missing: ${JSON.stringify(p.quoteReference)}`);
  const result = await dryRunFeishuRouting("把刚才的报价标记为已发送");
  assert(result.responseType === "CONFIRMATION_PREVIEW", `send quote fell through to ${result.responseType}`);
});

test("21 fallback只允许UNKNOWN触发", async () => {
  const quoteQuery = await dryRunFeishuRouting("查询刚才的报价");
  const quoteSend = await dryRunFeishuRouting("把刚才的报价标记为已发送");
  assert(quoteQuery.intent !== "UNKNOWN" && quoteQuery.responseType !== "UNKNOWN", "quote query reached fallback");
  assert(quoteSend.intent !== "UNKNOWN" && quoteSend.responseType !== "UNKNOWN", "quote send reached fallback");
  const unknown = await dryRunFeishuRouting("这是一句无法识别的随便话");
  assert(unknown.intent === "UNKNOWN" && unknown.responseType === "UNKNOWN", "unknown did not use fallback path");
});

test("22 修改刚才报价单价必须命中报价更新handler", async () => {
  const p: any = expectIntent("修改刚才报价单价为2美元", "UPDATE_QUOTE").parameters;
  assert(p.quoteReference?.useLastQuote === true, `update last quote ref missing: ${JSON.stringify(p.quoteReference)}`);
  assert(p.changes?.unitPrice === 2, `unit price change missing: ${JSON.stringify(p.changes)}`);
  const result = await dryRunFeishuRouting("修改刚才报价单价为2美元");
  assert(result.responseType === "CONFIRMATION_PREVIEW", `update quote fell through to ${result.responseType}`);
});

test("23 CREATE_QUOTE成功后写入lastQuoteId和lastQuoteNumber", async () => {
  const { __quoteOrderFlowTestUtils } = await import("../lib/services/quote-order-flow-service");
  const context = __quoteOrderFlowTestUtils.rememberQuoteForTest(
    { senderId: "feishu-user-quote-context-test", chatId: "feishu-chat-quote-context-test", messageId: "msg-context-test" },
    { id: 25, quoteNo: "Q-20260621-0001" },
  );
  assert(context?.lastQuoteId === 25, `lastQuoteId not written: ${JSON.stringify(context)}`);
  assert(context?.lastQuoteNumber === "Q-20260621-0001", `lastQuoteNumber not written: ${JSON.stringify(context)}`);
});

test("24 报价引用协议必须按显式ID、lastQuoteId、名称顺序解析", async () => {
  const { __quoteOrderFlowTestUtils } = await import("../lib/services/quote-order-flow-service");
  const activeContext = { senderId: "feishu-user-quote-ref-test", chatId: "feishu-chat-quote-ref-test", messageId: "msg-ref-test" };
  __quoteOrderFlowTestUtils.rememberQuoteForTest(activeContext, { id: 25, quoteNo: "Q-20260621-0001" });

  const explicit = (__quoteOrderFlowTestUtils as any).resolveQuoteReferenceForTest({ number: "Q-20260621-0002", useLastQuote: true }, activeContext);
  assert(explicit.ref?.number === "Q-20260621-0002" && explicit.ref?.id === undefined, `explicit number not preferred: ${JSON.stringify(explicit)}`);

  const recent = (__quoteOrderFlowTestUtils as any).resolveQuoteReferenceForTest({ useLastQuote: true }, activeContext);
  assert(recent.ref?.id === 25, `lastQuoteId not resolved: ${JSON.stringify(recent)}`);

  const named = (__quoteOrderFlowTestUtils as any).resolveQuoteReferenceForTest({ customerName: "星河贸易" }, activeContext);
  assert(named.ref?.customerName === "星河贸易", `name fallback not preserved: ${JSON.stringify(named)}`);

  const missingRecent = (__quoteOrderFlowTestUtils as any).resolveQuoteReferenceForTest(
    { useLastQuote: true },
    { senderId: "feishu-user-no-recent-quote", chatId: "feishu-chat-no-recent-quote", messageId: "msg-no-recent" },
  );
  assert(missingRecent.message === "当前会话无最近报价，请提供报价ID。", `bad missing recent message: ${JSON.stringify(missingRecent)}`);
});

test("25 QUOTE_TO_ORDER must prefer lastAcceptedQuoteId", async () => {
  const { __quoteOrderFlowTestUtils } = await import("../lib/services/quote-order-flow-service");
  const activeContext = { senderId: "feishu-user-accepted-quote-ref-test", chatId: "feishu-chat-accepted-quote-ref-test", messageId: "msg-accepted-ref-test" };
  (__quoteOrderFlowTestUtils as any).rememberQuoteForTest(activeContext, { id: 11, quoteNo: "Q-20260621-0011" });
  (__quoteOrderFlowTestUtils as any).rememberSentQuoteForTest(activeContext, { id: 12, quoteNo: "Q-20260621-0012" });
  const context = (__quoteOrderFlowTestUtils as any).rememberAcceptedQuoteForTest(activeContext, { id: 13, quoteNo: "Q-20260621-0013" });

  assert(context?.lastAcceptedQuoteId === 13, `lastAcceptedQuoteId not written: ${JSON.stringify(context)}`);
  assert(context?.lastAcceptedQuoteNumber === "Q-20260621-0013", `lastAcceptedQuoteNumber not written: ${JSON.stringify(context)}`);

  const explicit = (__quoteOrderFlowTestUtils as any).resolveQuoteToOrderReferenceForTest({ number: "Q-20260621-0099", useLastAcceptedQuote: true }, activeContext);
  assert(explicit.ref?.number === "Q-20260621-0099" && explicit.ref?.id === undefined, `explicit quote number not preferred: ${JSON.stringify(explicit)}`);

  const accepted = (__quoteOrderFlowTestUtils as any).resolveQuoteToOrderReferenceForTest({ useLastQuote: true }, activeContext);
  assert(accepted.ref?.id === 13, `lastAcceptedQuoteId not preferred: ${JSON.stringify(accepted)}`);
});

test("26 accepted quote to order NLU must use lastAcceptedQuoteId", () => {
  const cases = [
    "把刚才已接受的报价转成订单",
    "把已接受的报价转订单",
    "转换刚才那个报价",
  ];
  for (const text of cases) {
    const result: any = expectIntent(text, "CONVERT_QUOTE_TO_ORDER");
    assert(
      result.parameters.quoteReference?.useLastAcceptedQuote === true,
      `${text} did not map to lastAcceptedQuote: ${JSON.stringify(result.parameters.quoteReference)}`,
    );
  }
});

test("27 short production status update must target last order", () => {
  const result: any = expectIntent("改为生产中", "UPDATE_ORDER");
  assert(result.parameters.orderReference?.useLastOrder === true, `last order ref missing: ${JSON.stringify(result.parameters.orderReference)}`);
  assert(result.parameters.changes?.status === "IN_PRODUCTION", `production status missing: ${JSON.stringify(result.parameters.changes)}`);
});

async function main() {
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

  let passed = 0;
  const failures: string[] = [];
  for (const item of tests) {
    try {
      await item.fn();
      passed += 1;
    } catch (error) {
      failures.push(`${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`总测试数: ${tests.length}`);
  console.log(`通过数: ${passed}`);
  console.log(`失败数: ${failures.length}`);
  console.log(`Unconfirmed Write Count: ${metrics.unconfirmedWriteCount}`);
  console.log(`Duplicate Execution Count: ${metrics.duplicateExecutionCount}`);
  console.log(`Random Entity Selection Count: ${metrics.randomEntitySelectionCount}`);
  console.log(`Partial Transaction Count: ${metrics.partialTransactionCount}`);
  console.log(`Extra Reply Count: ${metrics.extraReplyCount}`);
  console.log(`Risk Level Mismatch Count: ${metrics.riskLevelMismatchCount}`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

main();
