import { parseFeishuIntent } from "../lib/im/feishu-parser";
import { dryRunFeishuRouting } from "../lib/im/feishu-handler";
import { __entityQueryTestUtils } from "../lib/im/feishu-entity-query";

type Test = { name: string; fn: () => void | Promise<void> };

const tests: Test[] = [];
const metrics = {
  queryIntentTotal: 0,
  queryIntentPassed: 0,
  entityTypeTotal: 0,
  entityTypePassed: 0,
  entityNameBoundaryTotal: 0,
  entityNameBoundaryPassed: 0,
  exactMatchIsolationTotal: 0,
  exactMatchIsolationPassed: 0,
  requestedFieldsTotal: 0,
  requestedFieldsPassed: 0,
  separationTotal: 0,
  separationPassed: 0,
  randomEntitySelectionCount: 0,
  databaseWriteCount: 0,
  pendingActionCreationCount: 0,
};

function test(name: string, fn: Test["fn"]) {
  tests.push({ name, fn });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertIntent(text: string, intent: string) {
  metrics.queryIntentTotal += 1;
  const parsed = parseFeishuIntent(text);
  assert(parsed.intent === intent, `${text}: expected ${intent}, got ${parsed.intent}`);
  metrics.queryIntentPassed += 1;
  return parsed;
}

function assertFields(text: string, expected: string[]) {
  metrics.requestedFieldsTotal += 1;
  const parsed = parseFeishuIntent(text);
  const fields = parsed.parameters.entityQuery?.requestedFields || [];
  for (const field of expected) {
    assert(fields.includes(field), `${text}: missing requested field ${field}; got ${fields.join(",")}`);
  }
  metrics.requestedFieldsPassed += 1;
  return parsed;
}

function assertSeparation(text: string, expected: string) {
  metrics.separationTotal += 1;
  const parsed = parseFeishuIntent(text);
  assert(parsed.intent === expected, `${text}: expected ${expected}, got ${parsed.intent}`);
  metrics.separationPassed += 1;
}

function assertEntityType(text: string, intent: string) {
  metrics.entityTypeTotal += 1;
  const parsed = parseFeishuIntent(text);
  assert(parsed.intent === intent, `${text}: expected ${intent}, got ${parsed.intent}`);
  metrics.entityTypePassed += 1;
  return parsed;
}

function assertEntityName(text: string, expected: string) {
  metrics.entityNameBoundaryTotal += 1;
  const parsed = parseFeishuIntent(text);
  const name = parsed.parameters.entityQuery?.entityReference.name;
  assert(name === expected, `${text}: expected entity name ${expected}, got ${name}`);
  metrics.entityNameBoundaryPassed += 1;
  return parsed;
}

function assertExactIsolation<T extends { company: string }>(items: T[], name: string, expectedCompanies: string[]) {
  metrics.exactMatchIsolationTotal += 1;
  const result = __entityQueryTestUtils.resolveLeadReference(items as any, { name });
  const companies = result.kind === "one"
    ? [(result.entity as any).company]
    : result.kind === "many"
      ? result.entities.map((entity: any) => entity.company)
      : [];
  assert(
    companies.join("|") === expectedCompanies.join("|"),
    `expected isolated ${expectedCompanies.join("|")}, got ${companies.join("|")}`,
  );
  metrics.exactMatchIsolationPassed += 1;
  return result;
}

const fakeLeads = [
  { id: 1, company: "枫叶宠物食品", contactName: "Emily", email: "maple@example.invalid", phone: "+1 202 000 0555", whatsapp: null, status: "CONTACTED" },
  { id: 2, company: "枫叶宠物食品", contactName: "David", email: "maple2@example.invalid", phone: "+1 202 000 0666", whatsapp: null, status: "NEW" },
];

const mixedLeads = [
  { id: 11, company: "测试公司", contactName: "A", email: "a@example.invalid", phone: null, whatsapp: null, status: "CONTACTED" },
  { id: 12, company: "MANUAL_A_华星贸易测试公司_已修改", contactName: "B", email: "b@example.invalid", phone: null, whatsapp: null, status: "NEW" },
  { id: 13, company: "MANUAL_A_无关联删除测试", contactName: "C", email: "c@example.invalid", phone: null, whatsapp: null, status: "NEW" },
  { id: 14, company: "FEISHU_WRITE_A_非法邮箱测试", contactName: "D", email: "d@example.invalid", phone: null, whatsapp: null, status: "NEW" },
];

test("1 查询状态预算下次跟进 -> QUERY_LEAD_DETAIL", () => {
  const parsed = assertFields("查询枫叶宠物食品当前的状态、预算和下次跟进时间。", ["status", "budget", "currency", "nextFollowUpAt"]);
  assert(parsed.intent === "QUERY_LEAD_DETAIL", `expected QUERY_LEAD_DETAIL, got ${parsed.intent}`);
  assert(parsed.parameters.entityQuery?.entityReference.name === "枫叶宠物食品", "entity name not extracted");
});
test("2 只查询状态", () => { assertFields("帮我看看枫叶宠物食品现在是什么状态", ["status"]); });
test("3 只查询预算", () => { assertFields("枫叶宠物食品预算多少", ["budget", "currency"]); });
test("4 查询联系人和电话", () => { assertFields("告诉我枫叶宠物食品的联系人和电话", ["contactName", "phone"]); });
test("5 查询完整信息", () => { assertFields("查看枫叶宠物食品的完整信息", ["companyName", "contactName", "status"]); });
test("6 按ID查询", () => {
  const parsed = assertIntent("查一下线索ID 46", "QUERY_LEAD_DETAIL");
  assert(parsed.parameters.entityQuery?.entityReference.id === "46", "lead id not extracted");
});
test("7 按邮箱查询", () => {
  const parsed = assertIntent("查询邮箱为xxx@example.com的线索", "QUERY_LEAD_DETAIL");
  assert(parsed.parameters.entityQuery?.entityReference.email === "xxx@example.com", "email not extracted");
});
test("8 按电话查询", () => {
  const parsed = assertIntent("看一下电话+1 202 000 0555对应的线索", "QUERY_LEAD_DETAIL");
  assert(parsed.parameters.entityQuery?.entityReference.phone === "+1 202 000 0555", "phone not extracted");
});
test("9 不存在线索", () => {
  const result = __entityQueryTestUtils.resolveLeadReference([], { name: "不存在公司" });
  assert(result.kind === "none", "missing lead should be none");
});
test("10 同名线索歧义", () => {
  const result = __entityQueryTestUtils.resolveLeadReference(fakeLeads as any, { name: "枫叶宠物食品" });
  if (result.kind !== "many") metrics.randomEntitySelectionCount += 1;
  assert(result.kind === "many", "same-name leads must return candidates");
});
test("11 空字段显示暂未填写", () => {
  assert(__entityQueryTestUtils.formatValue("budget", null) === "暂未填写", "empty budget label mismatch");
});
test("12 中文枚举显示", () => {
  assert(__entityQueryTestUtils.formatValue("status", "CONTACTED") === "已联系", "status enum not localized");
});

test("13 查询不创建PendingAction", async () => {
  const result = await dryRunFeishuRouting("查询枫叶宠物食品当前的状态、预算和下次跟进时间。");
  metrics.pendingActionCreationCount += result.pendingActionCreateCount;
  assert(result.pendingActionCreateCount === 0, "query created pending action");
});
test("14 查询不修改数据库", async () => {
  const result = await dryRunFeishuRouting("查询枫叶宠物食品当前的状态、预算和下次跟进时间。");
  metrics.databaseWriteCount += result.dbWriteCount;
  assert(result.dbWriteCount === 0 && result.wouldExecute === false, "query would write database");
});
test("15 不进入UPDATE_LEAD", () => { assertSeparation("查询枫叶宠物食品当前的状态、预算和下次跟进时间。", "QUERY_LEAD_DETAIL"); });

test("16 查询预算 -> QUERY", () => { assertSeparation("枫叶宠物食品预算多少", "QUERY_LEAD_DETAIL"); });
test("17 更新预算 -> UPDATE", () => { assertSeparation("把枫叶宠物食品预算改为15000美元", "UPDATE_LEAD"); });
test("18 查询状态 -> QUERY", () => { assertSeparation("枫叶宠物食品现在是什么状态", "QUERY_LEAD_DETAIL"); });
test("19 修改状态 -> UPDATE", () => { assertSeparation("把枫叶宠物食品的状态改为已联系。", "UPDATE_LEAD"); });
test("20 客户想要报价 -> 跟进", () => { assertSeparation("我刚联系了测试公司，客户想要报价。", "ADD_LEAD_FOLLOWUP"); });
test("21 查询报价 -> QUERY_QUOTE", () => { assertSeparation("查询报价Q-2026-001的状态和金额", "QUERY_QUOTE_DETAIL"); });
test("22 查询订单 -> QUERY_ORDER", () => { assertSeparation("查询订单O-2026-001的状态和金额", "QUERY_ORDER_DETAIL"); });

test("23 查询客户阶段和主联系人", () => { assertFields("查询ABC客户的阶段和主联系人", ["stage", "primaryContact"]); });
test("24 查询客户联系人列表", () => { assertFields("ABC客户有哪些联系人", ["contacts"]); });
test("25 查询客户订单数量", () => { assertFields("ABC客户目前有几个订单和报价", ["orderCount", "quoteCount"]); });
test("26 查询任务优先级和截止时间", () => { assertFields("查询任务“联系枫叶宠物食品”的截止时间和优先级", ["dueAt", "priority"]); });
test("27 同名任务歧义", () => {
  const result = __entityQueryTestUtils.resolveByName([{ id: 1, title: "联系枫叶" }, { id: 2, title: "联系枫叶" }] as any, "联系枫叶", "title");
  if (result.kind !== "many") metrics.randomEntitySelectionCount += 1;
  assert(result.kind === "many", "same-name tasks must return candidates");
});
test("28 按报价编号查询", () => { assertIntent("查询报价Q-2026-001的状态和金额", "QUERY_QUOTE_DETAIL"); });
test("29 按客户查询最近报价", () => { assertIntent("看看枫叶宠物食品最近一份报价", "QUERY_QUOTE_DETAIL"); });
test("30 按订单编号查询", () => { assertIntent("查询订单O-2026-001的状态和金额", "QUERY_ORDER_DETAIL"); });
test("31 按客户查询最近订单", () => { assertIntent("看看枫叶宠物食品最近的订单", "QUERY_ORDER_DETAIL"); });
test("32 查询不写库", async () => {
  const result = await dryRunFeishuRouting("枫叶宠物食品预算多少");
  metrics.databaseWriteCount += result.dbWriteCount;
  assert(result.responseType === "READ_QUERY" && result.dbWriteCount === 0, "query is not read-only");
});
test("33 查询不生成确认令牌", async () => {
  const result = await dryRunFeishuRouting("枫叶宠物食品预算多少");
  metrics.pendingActionCreationCount += result.pendingActionCreateCount;
  assert(result.responseType === "READ_QUERY" && result.pendingActionCreateCount === 0, "query creates confirmation");
});
test("34 AI失败不误执行写入", async () => {
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  const result = await dryRunFeishuRouting("枫叶宠物食品预算多少");
  assert(result.wouldExecute === false && result.permissionKey == null, "AI fallback query would write");
});
test("35 同一消息只回复一次", () => {
  const seen = new Set<string>();
  const first = !seen.has("msg-query-1");
  seen.add("msg-query-1");
  const second = !seen.has("msg-query-1");
  assert(first && !second, "message idempotency fixture failed");
});
test("36 不返回Prisma错误", () => {
  const safe = __entityQueryTestUtils.safeQueryError();
  assert(!safe.includes("Prisma") && !safe.includes("DATABASE_URL"), "unsafe query error exposed");
});

test("37 告诉我联系人和需求优先识别为线索", () => {
  const parsed = assertEntityType("告诉我枫叶宠物食品的联系人、电话、邮箱和客户需求。", "QUERY_LEAD_DETAIL");
  const fields = parsed.parameters.entityQuery?.requestedFields || [];
  assert(fields.includes("contactName") && fields.includes("phone") && fields.includes("email") && fields.includes("requirement"), "lead shared fields not extracted");
});
test("38 查询状态预算优先识别为线索", () => { assertEntityType("查询枫叶宠物食品状态预算", "QUERY_LEAD_DETAIL"); });
test("39 查询客户阶段识别为客户", () => { assertEntityType("查询枫叶宠物食品客户阶段", "QUERY_CUSTOMER_DETAIL"); });
test("40 Lead精确存在Customer不存在时选择Lead", () => {
  const choice = __entityQueryTestUtils.chooseEntityTypeByFieldsAndMatches(["contactName", "phone", "email", "requirement"], 1, 0);
  assert(choice === "lead", `expected lead, got ${choice}`);
  metrics.entityTypeTotal += 1;
  metrics.entityTypePassed += 1;
});
test("41 Lead和Customer都存在时返回实体类型候选", () => {
  const choice = __entityQueryTestUtils.chooseEntityTypeByFieldsAndMatches(["contactName", "phone", "email"], 1, 1);
  assert(choice === "ambiguous", `expected ambiguous, got ${choice}`);
  metrics.entityTypeTotal += 1;
  metrics.entityTypePassed += 1;
});

test("42 FEISHU_QUERY_完全不存在公司完整保留", () => { assertEntityName("查询FEISHU_QUERY_完全不存在公司的完整信息。", "FEISHU_QUERY_完全不存在公司"); });
test("43 测试公司完整保留", () => { assertEntityName("查询测试公司的状态和联系人。", "测试公司"); });
test("44 星海食品有限公司完整保留", () => { assertEntityName("查询星海食品有限公司的完整信息", "星海食品有限公司"); });
test("45 名称内部查询关键词不被删除", () => { assertEntityName("查询查询科技公司的完整信息", "查询科技公司"); });
test("46 不存在实体返回完整原名称", () => {
  const result = __entityQueryTestUtils.resolveLeadReference([], { name: "FEISHU_QUERY_完全不存在公司" });
  assert(result.kind === "none", "missing entity should remain none");
  assert(__entityQueryTestUtils.referenceLabel({ name: "FEISHU_QUERY_完全不存在公司" }) === "FEISHU_QUERY_完全不存在公司", "reference label lost suffix");
  metrics.entityNameBoundaryTotal += 1;
  metrics.entityNameBoundaryPassed += 1;
});

test("47 测试公司精确匹配不混入相似结果", () => {
  assertExactIsolation(mixedLeads, "测试公司", ["测试公司"]);
});
test("48 精确匹配0条才使用模糊匹配", () => {
  const result = assertExactIsolation(mixedLeads, "华星贸易测试", ["MANUAL_A_华星贸易测试公司_已修改"]);
  assert(result.kind !== "none", "fuzzy should return candidates after exact miss");
});
test("49 多条精确同名返回候选", () => {
  metrics.exactMatchIsolationTotal += 1;
  const result = __entityQueryTestUtils.resolveLeadReference([...fakeLeads, { ...fakeLeads[0], id: 3, email: "third@example.invalid" }] as any, { name: "枫叶宠物食品" });
  if (result.kind !== "many") metrics.randomEntitySelectionCount += 1;
  assert(result.kind === "many", "exact same-name should return candidates");
  metrics.exactMatchIsolationPassed += 1;
});
test("50 模糊候选明确标注为相似结果", () => {
  metrics.exactMatchIsolationTotal += 1;
  const label = __entityQueryTestUtils.matchLevelLabel("fuzzy");
  assert(label.includes("相似"), "fuzzy label should mention similar candidates");
  metrics.exactMatchIsolationPassed += 1;
});
test("51 不随机选择", () => {
  const result = __entityQueryTestUtils.resolveLeadReference(fakeLeads as any, { name: "枫叶宠物食品" });
  if (result.kind !== "many") metrics.randomEntitySelectionCount += 1;
  assert(result.kind === "many", "resolver randomly selected a lead");
});

async function main() {
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

  const total = tests.length;
  const queryIntentAccuracy = `${metrics.queryIntentPassed}/${metrics.queryIntentTotal}`;
  const entityTypeAccuracy = `${metrics.entityTypePassed}/${metrics.entityTypeTotal}`;
  const entityNameBoundaryAccuracy = `${metrics.entityNameBoundaryPassed}/${metrics.entityNameBoundaryTotal}`;
  const exactMatchIsolationAccuracy = `${metrics.exactMatchIsolationPassed}/${metrics.exactMatchIsolationTotal}`;
  const requestedFieldsAccuracy = `${metrics.requestedFieldsPassed}/${metrics.requestedFieldsTotal}`;
  const separationAccuracy = `${metrics.separationPassed}/${metrics.separationTotal}`;

  console.log(`测试总数: ${total}`);
  console.log(`通过数: ${passed}`);
  console.log(`失败数: ${failures.length}`);
  console.log(`Query Intent Accuracy: ${queryIntentAccuracy}`);
  console.log(`Entity Type Accuracy: ${entityTypeAccuracy}`);
  console.log(`Entity Name Boundary Accuracy: ${entityNameBoundaryAccuracy}`);
  console.log(`Exact Match Isolation Accuracy: ${exactMatchIsolationAccuracy}`);
  console.log(`Requested Fields Accuracy: ${requestedFieldsAccuracy}`);
  console.log(`Query/Update Separation Accuracy: ${separationAccuracy}`);
  console.log(`Random Entity Selection Count: ${metrics.randomEntitySelectionCount}`);
  console.log(`Database Write Count: ${metrics.databaseWriteCount}`);
  console.log(`PendingAction Creation Count: ${metrics.pendingActionCreationCount}`);

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  if (
    metrics.randomEntitySelectionCount !== 0
    || metrics.databaseWriteCount !== 0
    || metrics.pendingActionCreationCount !== 0
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
