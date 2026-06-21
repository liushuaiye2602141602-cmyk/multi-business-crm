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

async function ensureCustomer(prisma: any, company: string) {
  const existing = await prisma.customer.findFirst({ where: { company } });
  if (existing) return existing;
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  assert(businessLine, "business line fixture missing");
  return prisma.customer.create({
    data: {
      company,
      contactName: "NLU Tester",
      businessLineId: businessLine.id,
      tenantId: 1,
    },
  });
}

function assertExpandedItems(parseFeishuIntent: (text: string) => any, text: string, expectedQuantity = 10000) {
  const parsed = parseFeishuIntent(text);
  assert(parsed.intent === "CREATE_QUOTE", `expected CREATE_QUOTE, got ${parsed.intent}`);
  const items = (parsed.parameters as any).items || [];
  assert(items.length === 2, `expected 2 expanded items, got ${items.length}: ${JSON.stringify(items)}`);
  assert(String(items[0].productName).includes("10kg"), `first product should include 10kg: ${JSON.stringify(items[0])}`);
  assert(String(items[1].productName).includes("15kg"), `second product should include 15kg: ${JSON.stringify(items[1])}`);
  assert(Number(items[0].quantity) === expectedQuantity, `first qty should be ${expectedQuantity}: ${JSON.stringify(items[0])}`);
  assert(Number(items[1].quantity) === expectedQuantity, `second qty should be ${expectedQuantity}: ${JSON.stringify(items[1])}`);
  assert(!(parsed.parameters as any).missingFields?.includes("quantity"), `quantity should not be missing: ${JSON.stringify(parsed.parameters)}`);
  return parsed;
}

async function main() {
  loadEnv();
  process.env.FEISHU_ALLOW_CREATE_QUOTE = "true";
  const prisma = (await import("../lib/prisma")).default;
  const { parseFeishuIntent } = await import("../lib/im/feishu-parser");
  const { createQuoteService, validateCreateQuotePlan } = await import("../lib/services/quote-order-flow-service");
  const stamp = Date.now();
  const company = `星河贸易NLU${stamp}`;
  const customer = await ensureCustomer(prisma, company);
  let createdQuoteId: number | undefined;

  try {
    const chinese = assertExpandedItems(parseFeishuIntent, `给客户${company}创建报价，10kg和15kg宠物食品四边封袋各10000个，单价0.15美元`);
    const englishEach = assertExpandedItems(parseFeishuIntent, `给客户${company}创建报价，10kg and 15kg pet food quad seal bags each 10000 pcs, unit price 0.15 USD`);
    const englishPer = assertExpandedItems(parseFeishuIntent, `给客户${company}创建报价，10kg and 15kg pet food quad seal bags per 10000 units, unit price 0.15 USD`);

    const firstValidation = await validateCreateQuotePlan(
      (chinese.parameters as any).quote,
      (chinese.parameters as any).items,
      (chinese.parameters as any).customerReference,
      undefined,
      undefined,
      { senderId: "quote-nlu-boundary", chatId: "quote-nlu-boundary", messageId: `create-${stamp}` },
    );
    assert(firstValidation.success && firstValidation.plan, `first quote should validate: ${firstValidation.message}`);
    const created = await createQuoteService(firstValidation.plan, "quote-nlu-boundary", `create-${stamp}`, "quote-nlu-boundary");
    assert(created.success && created.entityId, `first quote should create: ${created.message}`);
    createdQuoteId = created.entityId;
    const createdQuote = await prisma.quote.findUnique({ where: { id: createdQuoteId } });
    assert(createdQuote?.quoteNo, "created quote number missing");

    const differentItems = assertExpandedItems(parseFeishuIntent, `给客户${company}创建报价，10kg和15kg宠物食品四边封袋各12000个，单价0.15美元`, 12000);
    const differentValidation = await validateCreateQuotePlan(
      (differentItems.parameters as any).quote,
      (differentItems.parameters as any).items,
      (differentItems.parameters as any).customerReference,
      undefined,
      undefined,
      { senderId: "quote-nlu-boundary", chatId: "quote-nlu-boundary", messageId: `different-${stamp}` },
    );
    assert(differentValidation.success, `customer existence or company name alone must not trigger duplicate: ${differentValidation.message}`);

    const quoteNumberDuplicateValidation = await validateCreateQuotePlan(
      { ...(differentItems.parameters as any).quote, quoteNo: createdQuote.quoteNo },
      (differentItems.parameters as any).items,
      (differentItems.parameters as any).customerReference,
      undefined,
      undefined,
      { senderId: "quote-nlu-boundary", chatId: "quote-nlu-boundary", messageId: `quote-no-duplicate-${stamp}` },
    );
    assert(!quoteNumberDuplicateValidation.success && /重复|duplicate|疑似/.test(quoteNumberDuplicateValidation.message), `explicit quoteNo should trigger duplicate: ${quoteNumberDuplicateValidation.message}`);

    const duplicate = assertExpandedItems(parseFeishuIntent, `给客户${company}创建报价，10kg和15kg宠物食品四边封袋各10000个，单价0.15美元`);
    const duplicateValidation = await validateCreateQuotePlan(
      (duplicate.parameters as any).quote,
      (duplicate.parameters as any).items,
      (duplicate.parameters as any).customerReference,
      undefined,
      undefined,
      { senderId: "quote-nlu-boundary", chatId: "quote-nlu-boundary", messageId: `duplicate-${stamp}` },
    );
    assert(!duplicateValidation.success && /重复|duplicate|疑似/.test(duplicateValidation.message), `identical items and price should be duplicate: ${duplicateValidation.message}`);

    console.log(JSON.stringify({
      chineseItems: (chinese.parameters as any).items,
      englishEachItems: (englishEach.parameters as any).items,
      englishPerItems: (englishPer.parameters as any).items,
      differentQuoteValidation: differentValidation.success,
      quoteNumberDuplicateValidation: quoteNumberDuplicateValidation.success,
      duplicateValidation: duplicateValidation.success,
    }, null, 2));
  } finally {
    if (createdQuoteId) {
      await prisma.quoteItem.deleteMany({ where: { quoteId: createdQuoteId } });
      await prisma.quote.deleteMany({ where: { id: createdQuoteId } });
    }
    await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
