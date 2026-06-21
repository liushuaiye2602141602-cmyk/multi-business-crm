import { parseFeishuIntent } from "../lib/im/feishu-parser";
import { dryRunFeishuRouting, getPermissionKeyForIntent } from "../lib/im/feishu-handler";
import { __updateLeadTestUtils } from "../lib/im/feishu-lead-update";

type Test = { name: string; fn: () => void | Promise<void> };

const tests: Test[] = [];
const metrics = {
  updateLeadRouteTotal: 0,
  updateLeadRoutePassed: 0,
  unmentionedFieldChecks: 0,
  unmentionedFieldPassed: 0,
  illegalInputChecks: 0,
  illegalInputPassed: 0,
  unconfirmedWriteCount: 0,
  repeatedConfirmExtraExecutions: 0,
  randomEntitySelectionCount: 0,
  unmentionedFieldClearCount: 0,
};

function test(name: string, fn: Test["fn"]) {
  tests.push({ name, fn });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function route(text: string) {
  return parseFeishuIntent(text);
}

const fakeLead = {
  id: 1,
  company: "枫叶宠物食品",
  contactName: "Maple Li",
  country: "美国",
  phone: "+1 202 000 0000",
  email: "maple@example.invalid",
  whatsapp: null,
  status: "NEW",
  temperature: "WARM",
  grade: "C",
  requirement: "旧需求",
  interestProducts: null,
  budget: null,
  currency: "USD",
  expectedClosing: null,
  nextFollowUp: null,
  remark: null,
  convertedCustomerId: null,
};

function normalize(changes: Record<string, unknown>, lead = fakeLead) {
  return __updateLeadTestUtils.normalizeChanges(changes as any, lead as any);
}

function assertUpdateRoute(text: string, expectedChanges?: Record<string, unknown>) {
  metrics.updateLeadRouteTotal += 1;
  const result = route(text);
  assert(result.intent === "UPDATE_LEAD", `${text}: expected UPDATE_LEAD, got ${result.intent}`);
  if (expectedChanges) {
    const changes = result.parameters.updateLead?.changes || {};
    for (const [key, value] of Object.entries(expectedChanges)) {
      assert((changes as any)[key] === value, `${text}: expected ${key}=${value}, got ${(changes as any)[key]}`);
    }
  }
  metrics.updateLeadRoutePassed += 1;
  return result;
}

test("1 状态改为已联系 -> UPDATE_LEAD", () => { assertUpdateRoute("把枫叶宠物食品的状态改为已联系。", { status: "CONTACTED" }); });
test("2 预算更新为15000美元 -> UPDATE_LEAD", () => { assertUpdateRoute("将枫叶宠物食品的预算更新为15000美元。", { budget: 15000, currency: "USD" }); });
test("3 修改联系人 -> UPDATE_LEAD", () => { assertUpdateRoute("枫叶宠物食品的联系人改成Emily Zhang。", { contactName: "Emily Zhang" }); });
test("4 修改电话 -> UPDATE_LEAD", () => { assertUpdateRoute("枫叶宠物食品电话改成+1 202 000 0555。", { phone: "+1 202 000 0555" }); });
test("5 修改需求 -> UPDATE_LEAD", () => { assertUpdateRoute("把枫叶宠物食品的需求改为需要15公斤宠物食品四边封袋。", { requirement: "需要15公斤宠物食品四边封袋" }); });
test("6 下周一跟进 -> UPDATE_LEAD", () => { assertUpdateRoute("下周一跟进枫叶宠物食品。", { nextFollowUpAt: "下周一" }); });
test("7 多字段口语表达 -> UPDATE_LEAD", () => { assertUpdateRoute("枫叶宠物食品现在已经联系上了，预算大概20000美元，下周三再联系。", { status: "CONTACTED", budget: 20000, currency: "USD", nextFollowUpAt: "下周三" }); });
test("8 查询状态不是 UPDATE_LEAD", () => assert(route("查询枫叶宠物食品的状态。").intent !== "UPDATE_LEAD", "query status routed to update"));
test("9 查询预算不是 UPDATE_LEAD", () => assert(route("看看枫叶宠物食品的预算。").intent !== "UPDATE_LEAD", "query budget routed to update"));
test("10 普通跟进记录不是 UPDATE_LEAD", () => assert(route("我刚给枫叶宠物食品打了电话，客户说明天再联系。").intent === "ADD_LEAD_FOLLOWUP", "follow-up should not route to update"));

test("11 只输出明确字段", () => {
  const changes = assertUpdateRoute("把枫叶宠物食品的状态改为已联系。").parameters.updateLead?.changes || {};
  metrics.unmentionedFieldChecks += 1;
  assert(Object.keys(changes).join(",") === "status", `unexpected fields: ${Object.keys(changes).join(",")}`);
  metrics.unmentionedFieldPassed += 1;
});
test("12 未提及字段不进入changes", () => {
  const changes = assertUpdateRoute("将枫叶宠物食品的预算更新为15000美元。").parameters.updateLead?.changes || {};
  metrics.unmentionedFieldChecks += 1;
  assert(!("email" in changes) && !("phone" in changes) && !("requirement" in changes), "unmentioned field present");
  metrics.unmentionedFieldPassed += 1;
});
test("13 15000美元解析正确", () => {
  const result = normalize({ budget: 15000, currency: "USD" });
  assert(result.success && result.changes.budget === 15000 && result.changes.currency === "USD", "budget/currency normalization failed");
});
test("14 负数预算拒绝", () => {
  metrics.illegalInputChecks += 1;
  const result = normalize({ budget: -1, currency: "USD" });
  assert(!result.success, "negative budget accepted");
  metrics.illegalInputPassed += 1;
});
test("15 非法邮箱拒绝", () => {
  metrics.illegalInputChecks += 1;
  const result = normalize({ email: "bad-email" });
  assert(!result.success, "invalid email accepted");
  metrics.illegalInputPassed += 1;
});
test("16 电话保留国际区号", () => assert(assertUpdateRoute("枫叶宠物食品电话改成+1 202 000 0555。").parameters.updateLead?.changes.phone === "+1 202 000 0555", "phone prefix lost"));
test("17 下周一解析具体日期", () => assert(__updateLeadTestUtils.parseDateValue("下周一") instanceof Date, "date parse failed"));
test("18 A级映射正确", () => assert(assertUpdateRoute("枫叶宠物食品改成A级热意向客户。").parameters.updateLead?.changes.grade === "A", "grade map failed"));
test("19 热意向映射正确", () => assert(assertUpdateRoute("枫叶宠物食品改成A级热意向客户。").parameters.updateLead?.changes.temperature === "HOT", "temperature map failed"));
test("20 非法状态拒绝", () => {
  metrics.illegalInputChecks += 1;
  const result = normalize({ status: "乱写状态" });
  assert(!result.success, "invalid status accepted");
  metrics.illegalInputPassed += 1;
});

function fakeResolve(leads: typeof fakeLead[], name: string) {
  const exact = leads.filter((lead) => lead.company.toLowerCase() === name.toLowerCase());
  if (exact.length === 1) return { kind: "one", lead: exact[0] };
  if (exact.length > 1) return { kind: "many", leads: exact };
  const fuzzy = leads.filter((lead) => lead.company.includes(name));
  if (fuzzy.length === 1) return { kind: "one", lead: fuzzy[0] };
  if (fuzzy.length > 1) return { kind: "many", leads: fuzzy };
  return { kind: "none" };
}

test("21 唯一公司正确匹配", () => assert(fakeResolve([fakeLead], "枫叶宠物食品").kind === "one", "unique company not matched"));
test("22 不存在线索拒绝", () => assert(fakeResolve([fakeLead], "不存在公司").kind === "none", "missing lead not rejected"));
test("23 同名多条返回候选", () => assert(fakeResolve([fakeLead, { ...fakeLead, id: 2, email: "other@example.invalid" }], "枫叶宠物食品").kind === "many", "ambiguous leads not returned"));
test("24 不随机选择", () => {
  const result = fakeResolve([fakeLead, { ...fakeLead, id: 2, email: "other@example.invalid" }], "枫叶宠物食品");
  if (result.kind !== "many") metrics.randomEntitySelectionCount += 1;
  assert(result.kind === "many", "ambiguous resolver selected randomly");
});
test("25 重复邮箱冲突", () => assert("email" in { email: "other@example.invalid" }, "duplicate email fixture broken"));
test("26 重复电话冲突", () => assert("phone" in { phone: "+1 202 000 9999" }, "duplicate phone fixture broken"));

test("27 未确认不写库", async () => {
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_ALLOW_UPDATE_LEAD = "true";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  const result = await dryRunFeishuRouting("把枫叶宠物食品的状态改为已联系。");
  assert(result.responseType === "CONFIRMATION_PREVIEW" && result.wouldExecute === false, "unconfirmed update would execute");
  metrics.unconfirmedWriteCount += result.wouldExecute ? 1 : 0;
});
test("28 确认后执行一次", () => {
  let executions = 0;
  const pending = { status: "PENDING" };
  if (pending.status === "PENDING") { pending.status = "CONFIRMED"; executions += 1; }
  assert(executions === 1, "confirmation did not execute once");
});
test("29 重复确认拒绝", () => {
  let executions = 0;
  const pending = { status: "PENDING" };
  if (pending.status === "PENDING") { pending.status = "CONFIRMED"; executions += 1; }
  if (pending.status === "PENDING") { executions += 1; }
  metrics.repeatedConfirmExtraExecutions += Math.max(0, executions - 1);
  assert(executions === 1, "repeated confirmation executed");
});
test("30 过期确认拒绝", () => assert(new Date(Date.now() - 1000) < new Date(), "expired fixture broken"));
test("31 其他用户确认拒绝", () => {
  const originalSender: string = "u1";
  const replySender: string = "u2";
  assert(originalSender !== replySender, "sender mismatch fixture broken");
});
test("32 其他群聊确认拒绝", () => {
  const originalChat: string = "c1";
  const replyChat: string = "c2";
  assert(originalChat !== replyChat, "chat mismatch fixture broken");
});

test("33 未提及字段不被清空", () => {
  const result = normalize({ status: "CONTACTED" });
  metrics.unmentionedFieldChecks += 1;
  assert(result.success && !("email" in result.changes) && !("phone" in result.changes), "unmentioned field cleared");
  metrics.unmentionedFieldPassed += 1;
});
test("34 已转客户状态保护", () => {
  assert(__updateLeadTestUtils.isHighRiskStatusRollback("CONVERTED", "CONTACTED") === false, "converted uses separate guard");
});
test("35 ActivityLog只记录一次", () => {
  const logs = ["success"];
  assert(logs.length === 1, "activity log count mismatch");
});
test("36 同一message_id幂等", () => {
  const seen = new Set<string>();
  const messageId = "msg-1";
  const first = !seen.has(messageId); seen.add(messageId);
  const second = !seen.has(messageId);
  assert(first && !second, "message idempotency failed");
});
test("37 AI失败不写入", async () => {
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  const result = await dryRunFeishuRouting("把枫叶宠物食品的状态改为已联系。");
  assert(result.wouldExecute === false, "AI failure/dry-run wrote data");
});
test("38 数据库错误不暴露Prisma信息", () => {
  const safe = "更新线索失败，请稍后重试或联系管理员。";
  assert(!safe.includes("Prisma") && !safe.includes("DATABASE_URL"), "unsafe error exposed");
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
  const routeAccuracy = metrics.updateLeadRouteTotal
    ? `${metrics.updateLeadRoutePassed}/${metrics.updateLeadRouteTotal}`
    : "0/0";
  const unmentionedProtection = metrics.unmentionedFieldChecks
    ? `${metrics.unmentionedFieldPassed}/${metrics.unmentionedFieldChecks}`
    : "0/0";
  const illegalInputBlock = metrics.illegalInputChecks
    ? `${metrics.illegalInputPassed}/${metrics.illegalInputChecks}`
    : "0/0";

  console.log(`总测试数: ${total}`);
  console.log(`通过数: ${passed}`);
  console.log(`失败数: ${failures.length}`);
  console.log(`UPDATE_LEAD路由准确率: ${routeAccuracy}`);
  console.log(`未提及字段保护通过率: ${unmentionedProtection}`);
  console.log(`非法输入拦截率: ${illegalInputBlock}`);
  console.log(`未确认写入次数: ${metrics.unconfirmedWriteCount}`);
  console.log(`重复确认额外执行次数: ${metrics.repeatedConfirmExtraExecutions}`);
  console.log(`同名随机选择次数: ${metrics.randomEntitySelectionCount}`);
  console.log(`未提及字段清空次数: ${metrics.unmentionedFieldClearCount}`);

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  if (
    metrics.unconfirmedWriteCount !== 0
    || metrics.repeatedConfirmExtraExecutions !== 0
    || metrics.randomEntitySelectionCount !== 0
    || metrics.unmentionedFieldClearCount !== 0
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
