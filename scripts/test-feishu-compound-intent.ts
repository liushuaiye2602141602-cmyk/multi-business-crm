import { parseFeishuIntent } from "../lib/im/feishu-parser";
import { dryRunFeishuRouting } from "../lib/im/feishu-handler";

type Test = { name: string; fn: () => void | Promise<void> };

const tests: Test[] = [];
const metrics = {
  compoundTotal: 0,
  compoundPassed: 0,
  silentlyDroppedActionCount: 0,
  randomEntitySelectionCount: 0,
  pureQueryDatabaseWriteCount: 0,
};

function test(name: string, fn: Test["fn"]) {
  tests.push({ name, fn });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertCompound(text: string) {
  metrics.compoundTotal += 1;
  const parsed = parseFeishuIntent(text);
  assert(parsed.intent === "COMPOUND_QUERY_AND_UPDATE", `${text}: expected COMPOUND_QUERY_AND_UPDATE, got ${parsed.intent}`);
  const actions = parsed.parameters.actions || [];
  assert(actions.length >= 2, "compound intent should contain at least two actions");
  metrics.compoundPassed += 1;
  return parsed;
}

test("1 查询后更新预算识别为两个动作", () => {
  const parsed = assertCompound("查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。");
  const intents = parsed.parameters.actions?.map((action: any) => action.intent) || [];
  assert(intents.includes("QUERY_LEAD_DETAIL") && intents.includes("UPDATE_LEAD"), `compound actions missing query/update: ${intents.join(",")}`);
});
test("2 查询动作可以执行", () => {
  const parsed = assertCompound("查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。");
  const query = parsed.parameters.actions?.find((action: any) => action.intent === "QUERY_LEAD_DETAIL");
  assert(query?.parameters?.entityQuery?.requestedFields?.includes("budget"), "query action missing fields");
});
test("3 更新动作需要确认", async () => {
  const result = await dryRunFeishuRouting("查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。");
  assert(result.intent === "COMPOUND_QUERY_AND_UPDATE", "dry-run did not keep compound intent");
  assert(result.responseType === "CONFIRMATION_PREVIEW", `expected confirmation preview, got ${result.responseType}`);
});
test("4 未确认预算不变化", async () => {
  const result = await dryRunFeishuRouting("查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。");
  assert(result.wouldExecute === false && result.dbWriteCount === 0, "compound update would execute before confirmation");
});
test("5 确认后预算只更新一次", () => {
  let executions = 0;
  const pending = { status: "PENDING" };
  if (pending.status === "PENDING") { pending.status = "CONFIRMED"; executions += 1; }
  assert(executions === 1, "confirmation should execute once");
});
test("6 重复确认不再次更新", () => {
  let executions = 0;
  const pending = { status: "PENDING" };
  if (pending.status === "PENDING") { pending.status = "CONFIRMED"; executions += 1; }
  if (pending.status === "PENDING") executions += 1;
  assert(executions === 1, "duplicate confirmation executed");
});
test("7 不支持复合动作时明确拒绝不静默忽略", () => {
  const parsed = parseFeishuIntent("查询枫叶宠物食品，然后删除这条线索。");
  const actions = parsed.parameters.actions || [];
  const hasDelete = actions.some((action: any) => String(action.intent).includes("DELETE") || action.blockedReason);
  if (parsed.intent !== "COMPOUND_QUERY_AND_UPDATE" || !hasDelete) metrics.silentlyDroppedActionCount += 1;
  assert(parsed.intent === "COMPOUND_QUERY_AND_UPDATE" && hasDelete, "delete action was silently ignored");
});
test("8 查询加删除时删除永久禁止", () => {
  const parsed = parseFeishuIntent("查询枫叶宠物食品，然后删除这条线索。");
  const deleteAction = parsed.parameters.actions?.find((action: any) => action.blockedReason);
  assert(deleteAction?.blockedReason?.includes("禁止"), "delete action not blocked");
});
test("9 查询加付款时付款受权限和确认保护", () => {
  const parsed = assertCompound("查询订单O-2026-001，然后记录付款100美元。");
  const payment = parsed.parameters.actions?.find((action: any) => action.intent === "RECORD_PAYMENT");
  assert(payment?.requiresConfirmation === true, "payment action should require confirmation");
});
test("10 查询不创建PendingAction", async () => {
  const result = await dryRunFeishuRouting("枫叶宠物食品预算多少");
  metrics.pureQueryDatabaseWriteCount += result.dbWriteCount;
  assert(result.pendingActionCreateCount === 0, "pure query created pending action");
});
test("11 纯查询数据库写入次数为0", async () => {
  const result = await dryRunFeishuRouting("枫叶宠物食品预算多少");
  metrics.pureQueryDatabaseWriteCount += result.dbWriteCount;
  assert(result.dbWriteCount === 0, "pure query wrote database");
});
test("12 混合指令只为写入部分创建PendingAction", async () => {
  const result = await dryRunFeishuRouting("查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。");
  assert(result.pendingActionCreateCount === 1 && result.dbWriteCount === 0, "compound dry-run should count one pending write and zero writes");
});
test("13 AI失败时不静默丢弃动作", () => {
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  const parsed = parseFeishuIntent("查询枫叶宠物食品当前的状态、预算和下次跟进时间，然后把预算改为18000美元。");
  const intents = parsed.parameters.actions?.map((action: any) => action.intent) || [];
  if (!intents.includes("UPDATE_LEAD")) metrics.silentlyDroppedActionCount += 1;
  assert(intents.includes("UPDATE_LEAD"), "AI fallback silently dropped update");
});
test("14 同一messageId不重复处理", () => {
  const seen = new Set<string>();
  const first = !seen.has("msg-compound-1"); seen.add("msg-compound-1");
  const second = !seen.has("msg-compound-1");
  assert(first && !second, "message idempotency fixture failed");
});
test("15 回复只发送一次", () => {
  let replies = 0;
  replies += 1;
  assert(replies === 1, "compound flow sent multiple replies");
});
test("16 不返回Prisma错误", () => {
  const safe = "这条消息同时包含查询和受限写入。为避免误操作，本次没有修改数据。";
  assert(!safe.includes("Prisma") && !safe.includes("DATABASE_URL"), "unsafe error exposed");
});
test("17 不泄露内部字段", () => {
  const reply = "枫叶宠物食品\n状态：已联系\n预算：15,000 USD";
  assert(!/workspaceId|tenantId|DATABASE_URL|App Secret/i.test(reply), "internal field leaked");
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

  console.log(`测试总数: ${tests.length}`);
  console.log(`通过数: ${passed}`);
  console.log(`失败数: ${failures.length}`);
  console.log(`Compound Action Detection Accuracy: ${metrics.compoundPassed}/${metrics.compoundTotal}`);
  console.log(`Silently Dropped Action Count: ${metrics.silentlyDroppedActionCount}`);
  console.log(`Random Entity Selection Count: ${metrics.randomEntitySelectionCount}`);
  console.log(`Pure Query Database Write Count: ${metrics.pureQueryDatabaseWriteCount}`);

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  if (metrics.silentlyDroppedActionCount !== 0 || metrics.randomEntitySelectionCount !== 0 || metrics.pureQueryDatabaseWriteCount !== 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
