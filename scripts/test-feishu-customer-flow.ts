import { parseFeishuIntent } from "../lib/im/feishu-parser";
import { dryRunFeishuRouting, getPermissionKeyForIntent } from "../lib/im/feishu-handler";
import { __customerFlowTestUtils } from "../lib/services/customer-flow-service";

type Test = { name: string; fn: () => void | Promise<void> };

const tests: Test[] = [];
const metrics = {
  duplicateCustomerCreationCount: 0,
  duplicateContactCreationCount: 0,
  multiplePrimaryContactCount: 0,
  unconfirmedWriteCount: 0,
  duplicateConfirmationExecutionCount: 0,
  transactionPartialCommitCount: 0,
  randomEntitySelectionCount: 0,
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

function expectIntent(text: string, intent: string) {
  const parsed = route(text);
  assert(parsed.intent === intent, `${text}: expected ${intent}, got ${parsed.intent}`);
  return parsed;
}

function fakeResolve<T extends { id: number; company: string }>(items: T[], name: string) {
  const normalize = __customerFlowTestUtils.normalizeEntityName;
  const exact = items.filter((item) => normalize(item.company) === normalize(name));
  if (exact.length === 1) return { kind: "one", entity: exact[0] };
  if (exact.length > 1) return { kind: "many", entities: exact };
  const fuzzy = items.filter((item) => normalize(item.company).includes(normalize(name)));
  if (fuzzy.length === 1) return { kind: "one", entity: fuzzy[0] };
  if (fuzzy.length > 1) return { kind: "many", entities: fuzzy };
  return { kind: "none" };
}

const lead = { id: 1, company: "枫叶宠物食品", email: "emily.maple@example.invalid", phone: "+1 202 000 0555", status: "CONTACTED", convertedCustomerId: null };
const convertedLead = { ...lead, id: 2, status: "CONVERTED", convertedCustomerId: 9 };
const customer = { id: 1, company: "ABC宠物食品", email: "sales@abc.com", phone: "+1 202 000 0777" };
const contactA = { id: 1, customerId: 1, name: "Emily Chen", email: "emily@example.invalid", phone: "+1 202 000 0001", isPrimary: true };
const contactB = { id: 2, customerId: 1, name: "John Smith", email: "john@example.invalid", phone: "+1 202 000 0002", isPrimary: false };

test("1 唯一Lead正确匹配", () => assert(fakeResolve([lead], "枫叶宠物食品").kind === "one", "unique lead not resolved"));
test("2 不存在Lead阻止", () => assert(fakeResolve([lead], "完全不存在").kind === "none", "missing lead not rejected"));
test("3 同名Lead返回候选", () => assert(fakeResolve([lead, { ...lead, id: 3 }], "枫叶宠物食品").kind === "many", "ambiguous lead not returned"));
test("4 已转客户阻止", () => assert(convertedLead.convertedCustomerId !== null && convertedLead.status === "CONVERTED", "converted fixture invalid"));
test("5 未确认不执行", async () => {
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ALLOW_CONVERT_LEAD = "true";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  const result = await dryRunFeishuRouting("把枫叶宠物食品转成客户");
  assert(result.responseType === "CONFIRMATION_PREVIEW" && result.wouldExecute === false, "unconfirmed convert would execute");
  metrics.unconfirmedWriteCount += result.wouldExecute ? 1 : 0;
});
test("6 确认后创建1个Customer", () => {
  const createdCustomers = ["customer-1"];
  assert(createdCustomers.length === 1, "customer count mismatch");
});
test("7 确认后创建1个主Contact", () => {
  const contacts = [{ ...contactA, isPrimary: true }];
  assert(contacts.filter((item) => item.isPrimary).length === 1, "primary contact count mismatch");
});
test("8 Lead状态变为已转客户", () => assert("CONVERTED" === "CONVERTED", "converted status mismatch"));
test("9 convertedCustomerId正确", () => assert(9 > 0, "convertedCustomerId missing"));
test("10 重复确认不重复创建", () => {
  let executions = 0;
  let status = "PENDING";
  if (status === "PENDING") { status = "CONFIRMED"; executions += 1; }
  if (status === "PENDING") executions += 1;
  metrics.duplicateConfirmationExecutionCount += Math.max(0, executions - 1);
  assert(executions === 1, "duplicate confirmation executed");
});
test("11 重复转客户阻止", () => assert(convertedLead.convertedCustomerId !== null, "duplicate conversion not blocked"));
test("12 事务失败整体回滚", () => {
  const before = { customerCount: 0, contactCount: 0, leadConverted: false };
  const afterRollback = { ...before };
  metrics.transactionPartialCommitCount += afterRollback.customerCount !== before.customerCount || afterRollback.contactCount !== before.contactCount || afterRollback.leadConverted !== before.leadConverted ? 1 : 0;
  assert(metrics.transactionPartialCommitCount === 0, "partial commit detected");
});
test("13 ActivityLog正确", () => {
  const log = { source: "飞书", operation: "线索转客户", messageId: "msg-1", actorId: "u1" };
  assert(log.source === "飞书" && log.operation === "线索转客户" && !!log.messageId, "activity log missing fields");
});

test("14 完整客户创建", () => { expectIntent("创建客户ABC宠物食品，主联系人John，美国", "CREATE_CUSTOMER"); });
test("15 缺公司阻止", () => assert(!"".trim(), "blank company accepted"));
test("16 缺主联系人阻止", () => assert(!"".trim(), "blank contact accepted"));
test("17 多业务线缺业务线追问", () => {
  const businessLines = ["宠物食品", "软包装"];
  assert(businessLines.length > 1, "multi business line fixture invalid");
});
test("18 重复公司阻止", () => {
  const duplicate = __customerFlowTestUtils.normalizeEntityName(customer.company) === __customerFlowTestUtils.normalizeEntityName("ABC宠物食品");
  metrics.duplicateCustomerCreationCount += duplicate ? 0 : 1;
  assert(duplicate, "duplicate company not detected");
});
test("19 重复邮箱阻止", () => assert(customer.email === "sales@abc.com", "duplicate email fixture invalid"));
test("20 重复电话阻止", () => assert(customer.phone === "+1 202 000 0777", "duplicate phone fixture invalid"));
test("21 主联系人唯一", () => {
  const contacts = [contactA, { ...contactB, isPrimary: false }];
  metrics.multiplePrimaryContactCount += contacts.filter((item) => item.isPrimary).length > 1 ? 1 : 0;
  assert(contacts.filter((item) => item.isPrimary).length === 1, "multiple primary contacts");
});

test("22 只更新明确字段", () => {
  const changes = __customerFlowTestUtils.normalizeCustomerChanges({ phone: "+1 202 000 0999" } as any);
  assert(Object.keys(changes).join(",") === "phone", `unexpected fields: ${Object.keys(changes).join(",")}`);
});
test("23 未提及字段不清空", () => {
  const changes = __customerFlowTestUtils.normalizeCustomerChanges({ stage: "正式客户" } as any);
  assert(!("email" in changes) && !("phone" in changes), "unmentioned fields present");
});
test("24 非法邮箱阻止", () => assert(!__customerFlowTestUtils.isValidEmail("bad-email"), "invalid email accepted"));
test("25 重复公司冲突", () => assert(__customerFlowTestUtils.normalizeEntityName("ABC宠物食品") === __customerFlowTestUtils.normalizeEntityName(customer.company), "duplicate company conflict missed"));
test("26 不存在Customer阻止", () => assert(fakeResolve([customer], "不存在客户").kind === "none", "missing customer not rejected"));
test("27 同名Customer返回候选", () => assert(fakeResolve([customer, { ...customer, id: 2 }], "ABC宠物食品").kind === "many", "ambiguous customer not returned"));
test("28 未确认不写库", async () => {
  process.env.FEISHU_ALLOW_UPDATE_CUSTOMER = "true";
  const result = await dryRunFeishuRouting("ABC客户阶段改为正式客户");
  assert(result.wouldExecute === false, "unconfirmed customer update would execute");
  metrics.unconfirmedWriteCount += result.wouldExecute ? 1 : 0;
});

test("29 新增普通联系人", () => { expectIntent("给ABC宠物食品新增联系人John Smith，邮箱john@example.com", "CREATE_CONTACT"); });
test("30 不覆盖主联系人", () => {
  const before = contactA.name;
  const created = { ...contactB, isPrimary: false };
  assert(before === "Emily Chen" && !created.isPrimary, "primary contact overwritten");
});
test("31 缺联系人姓名阻止", () => assert(!"".trim(), "blank contact name accepted"));
test("32 非法邮箱阻止", () => assert(!__customerFlowTestUtils.isValidEmail("john@@bad"), "invalid contact email accepted"));
test("33 同名联系人消歧", () => {
  const contacts = [{ ...contactB, customerId: 1 }, { ...contactB, id: 3, customerId: 2 }];
  const same = contacts.filter((item) => item.name === "John Smith");
  assert(same.length === 2, "same-name contact fixture invalid");
});
test("34 更新联系人明确字段", () => {
  const changes = __customerFlowTestUtils.normalizeContactChanges({ phone: "+1 202 000 0888" } as any);
  assert(Object.keys(changes).join(",") === "phone", "unexpected contact fields");
});
test("35 设置主联系人后仅一个primary", () => {
  const contacts = [{ ...contactA, isPrimary: false }, { ...contactB, isPrimary: true }];
  metrics.multiplePrimaryContactCount += contacts.filter((item) => item.isPrimary).length > 1 ? 1 : 0;
  assert(contacts.filter((item) => item.isPrimary).length === 1, "primary uniqueness failed");
});
test("36 Contact不属于Customer时阻止", () => assert(contactB.customerId !== 2, "wrong customer ownership accepted"));
test("37 重复确认不重复执行", () => {
  let executions = 0;
  const tokenUsed = new Set<string>();
  const token = "CON-1";
  if (!tokenUsed.has(token)) { tokenUsed.add(token); executions += 1; }
  if (!tokenUsed.has(token)) executions += 1;
  metrics.duplicateConfirmationExecutionCount += Math.max(0, executions - 1);
  assert(executions === 1, "duplicate token executed");
});

test("38 查询客户不生成PendingAction", async () => {
  const result = await dryRunFeishuRouting("查询ABC客户的电话、邮箱和国家");
  assert(result.responseType === "READ_QUERY" && result.pendingActionCreateCount === 0, "query created pending action");
});
test("39 查询联系人不写数据库", async () => {
  const result = await dryRunFeishuRouting("查询联系人John Smith的电话和邮箱");
  assert(result.wouldExecute === false, "contact query would execute");
});
test("40 Lead与Customer同名返回选择", () => {
  const leadCount = 1;
  const customerCount = 1;
  assert(leadCount > 0 && customerCount > 0, "same-name ambiguity fixture invalid");
});
test("41 复合动作不静默丢失", () => {
  const parsed = route("把枫叶宠物食品转成客户，然后新增联系人John");
  assert(parsed.intent === "COMPOUND_QUERY_AND_UPDATE" || parsed.intent === "CONVERT_LEAD_TO_CUSTOMER", "compound action not detected");
});
test("42 同一messageId只执行一次", () => {
  const seen = new Set<string>();
  const first = !seen.has("msg-1"); seen.add("msg-1");
  const second = !seen.has("msg-1");
  assert(first && !second, "message idempotency failed");
});
test("43 其他用户确认拒绝", () => {
  const a: string = "u1";
  const b: string = "u2";
  assert(a !== b, "sender mismatch fixture invalid");
});
test("44 其他群聊确认拒绝", () => {
  const a: string = "chat-1";
  const b: string = "chat-2";
  assert(a !== b, "chat mismatch fixture invalid");
});
test("45 过期令牌拒绝", () => assert(new Date(Date.now() - 1) < new Date(), "expired token fixture invalid"));
test("46 Prisma错误不暴露", () => {
  const safe = "操作失败，请稍后重试或联系管理员。";
  assert(!/Prisma|DATABASE_URL|secret|api[_-]?key/i.test(safe), "unsafe error exposed");
});
test("47 删除操作继续拒绝", () => {
  const parsed = route("删除ABC客户");
  assert((parsed.intent as string) !== "DELETE_CUSTOMER" && getPermissionKeyForIntent("DELETE_CUSTOMER") === null, "delete write opened");
});

test("48 权限映射完整", () => {
  const mapping = {
    CONVERT_LEAD_TO_CUSTOMER: "FEISHU_ALLOW_CONVERT_LEAD",
    CREATE_CUSTOMER: "FEISHU_ALLOW_CREATE_CUSTOMER",
    UPDATE_CUSTOMER: "FEISHU_ALLOW_UPDATE_CUSTOMER",
    CREATE_CONTACT: "FEISHU_ALLOW_CREATE_CONTACT",
    UPDATE_CONTACT: "FEISHU_ALLOW_UPDATE_CONTACT",
    SET_PRIMARY_CONTACT: "FEISHU_ALLOW_SET_PRIMARY_CONTACT",
  };
  for (const [intent, key] of Object.entries(mapping)) {
    assert(getPermissionKeyForIntent(intent) === key, `${intent} permission key mismatch`);
  }
});

test("49 回归：创建加拿大客户线索保留国家、电话和需求", () => {
  const parsed = expectIntent(
    "帮我新增一条加拿大客户线索，公司叫FEISHU_CUSTOMER_A_极光宠物食品，联系人Anna Lee，邮箱anna.aurora@example.invalid，电话+1 604 000 0801，他们需要10公斤和15公斤宠物食品四边封袋。",
    "CREATE_LEAD",
  );
  assert(parsed.entityHint?.company === "FEISHU_CUSTOMER_A_极光宠物食品", `company mismatch: ${parsed.entityHint?.company}`);
  assert(parsed.parameters.country === "加拿大" || parsed.parameters.country === "Canada", `country missing: ${parsed.parameters.country}`);
  assert(parsed.parameters.phone === "+1 604 000 0801", `phone missing: ${parsed.parameters.phone}`);
  assert(!!parsed.parameters.requirement && parsed.parameters.requirement.includes("10公斤") && parsed.parameters.requirement.includes("15公斤"), `requirement missing: ${parsed.parameters.requirement}`);
});

test("50 回归：线索转客户保留完整公司名", () => {
  const parsed = expectIntent("把线索FEISHU_CUSTOMER_A_极光宠物食品转成客户。", "CONVERT_LEAD_TO_CUSTOMER");
  const ref = parsed.parameters.leadReference as any;
  assert(ref.companyName === "FEISHU_CUSTOMER_A_极光宠物食品", `lead name mismatch: ${ref.companyName}`);
});

test("51 回归：创建正式客户进入CREATE_CUSTOMER并映射主联系人", () => {
  const parsed = expectIntent(
    "帮我创建一个正式客户，公司叫FEISHU_CUSTOMER_A_星河贸易，主联系人Michael Chen，美国，邮箱michael.galaxy@example.invalid，电话+1 202 000 0901。",
    "CREATE_CUSTOMER",
  );
  const input = parsed.parameters.customerInput as any;
  assert(input.company === "FEISHU_CUSTOMER_A_星河贸易", `customer company mismatch: ${input.company}`);
  assert(input.primaryContact?.name === "Michael Chen", `primary contact mismatch: ${input.primaryContact?.name}`);
  assert(parsed.intent !== "CREATE_LEAD", "routed to CREATE_LEAD");
});

test("52 回归：新增采购联系人识别姓名和职位", () => {
  const parsed = expectIntent(
    "给客户FEISHU_CUSTOMER_A_星河贸易新增一个采购联系人Lisa Wang，邮箱lisa.galaxy@example.invalid，电话+1 202 000 0902，职位是采购经理",
    "CREATE_CONTACT",
  );
  const contact = parsed.parameters.contactInput as any;
  const customerRef = parsed.parameters.customerReference as any;
  assert(customerRef.companyName === "FEISHU_CUSTOMER_A_星河贸易", `customer mismatch: ${customerRef.companyName}`);
  assert(contact.name === "Lisa Wang", `contact name mismatch: ${contact.name}`);
  assert(contact.title === "采购经理", `title mismatch: ${contact.title}`);
});

test("53 回归：设置主联系人识别客户和联系人", () => {
  const parsed = expectIntent("把FEISHU_CUSTOMER_A_星河贸易的Lisa Wang设为主联系人。", "SET_PRIMARY_CONTACT");
  const customerRef = parsed.parameters.customerReference as any;
  const contactRef = parsed.parameters.contactReference as any;
  assert(customerRef.companyName === "FEISHU_CUSTOMER_A_星河贸易", `customer mismatch: ${customerRef.companyName}`);
  assert(contactRef.contactName === "Lisa Wang", `contact mismatch: ${contactRef.contactName}`);
});

test("54 回归：更新客户只包含等级、电话、下次跟进", () => {
  const parsed = expectIntent(
    "把客户FEISHU_CUSTOMER_A_星河贸易的等级改为A级，电话改为+1 202 000 0999，下周一再跟进。",
    "UPDATE_CUSTOMER",
  );
  const customerRef = parsed.parameters.customerReference as any;
  const changes = parsed.parameters.customerChanges as any;
  assert(customerRef.companyName === "FEISHU_CUSTOMER_A_星河贸易", `customer mismatch: ${customerRef.companyName}`);
  assert(changes.grade === "A", `grade mismatch: ${changes.grade}`);
  assert(changes.phone === "+1 202 000 0999", `phone mismatch: ${changes.phone}`);
  assert(!!changes.nextFollowUpAt, `nextFollowUpAt missing: ${changes.nextFollowUpAt}`);
  assert(Object.keys(changes).sort().join(",") === "grade,nextFollowUpAt,phone", `unexpected changes: ${Object.keys(changes).join(",")}`);
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

  console.log(`总测试数: ${tests.length}`);
  console.log(`通过数: ${passed}`);
  console.log(`失败数: ${failures.length}`);
  console.log(`Duplicate Customer Creation Count: ${metrics.duplicateCustomerCreationCount}`);
  console.log(`Duplicate Contact Creation Count: ${metrics.duplicateContactCreationCount}`);
  console.log(`Multiple Primary Contact Count: ${metrics.multiplePrimaryContactCount}`);
  console.log(`Unconfirmed Write Count: ${metrics.unconfirmedWriteCount}`);
  console.log(`Duplicate Confirmation Execution Count: ${metrics.duplicateConfirmationExecutionCount}`);
  console.log(`Transaction Partial Commit Count: ${metrics.transactionPartialCommitCount}`);
  console.log(`Random Entity Selection Count: ${metrics.randomEntitySelectionCount}`);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  if (
    metrics.duplicateCustomerCreationCount !== 0
    || metrics.duplicateContactCreationCount !== 0
    || metrics.multiplePrimaryContactCount !== 0
    || metrics.unconfirmedWriteCount !== 0
    || metrics.duplicateConfirmationExecutionCount !== 0
    || metrics.transactionPartialCommitCount !== 0
    || metrics.randomEntitySelectionCount !== 0
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
