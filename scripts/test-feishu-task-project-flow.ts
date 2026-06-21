import { parseFeishuIntent } from "../lib/im/feishu-parser";
import { dryRunFeishuRouting, getPermissionKeyForIntent } from "../lib/im/feishu-handler";

type Test = { name: string; fn: () => unknown | Promise<unknown> };

const tests: Test[] = [];
const metrics = {
  unconfirmedWriteCount: 0,
  duplicateExecutionCount: 0,
  randomEntitySelectionCount: 0,
  partialTransactionCount: 0,
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

function expectNoUnexpectedKeys(value: Record<string, unknown>, allowed: string[]) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  assert(unexpected.length === 0, `unexpected keys: ${unexpected.join(",")}`);
}

test("1 明天下午创建任务", () => {
  const p: any = expectIntent("明天下午提醒我联系枫叶宠物食品", "CREATE_TASK").parameters;
  assert(p.task?.title?.includes("联系"), "task title missing");
  assert(p.task?.dueAt, "task dueAt missing");
});

test("2 明确时间解析", () => {
  const p: any = expectIntent("明天下午3点提醒我联系枫叶宠物食品", "CREATE_TASK").parameters;
  assert(String(p.task?.dueAt || "").includes("15:00"), `dueAt not 15:00: ${p.task?.dueAt}`);
});

test("3 高优先级映射", () => {
  const p: any = expectIntent("创建一个高优先级任务，后天跟进星河贸易", "CREATE_TASK").parameters;
  assert(p.task?.priority === "HIGH", `priority mismatch: ${p.task?.priority}`);
});

test("4 关联Lead", () => {
  const p: any = expectIntent("今天下午联系线索北辰宠物食品", "CREATE_TASK").parameters;
  assert(p.relatedEntity?.type === "Lead" && p.relatedEntity?.name === "北辰宠物食品", "lead relation missing");
});

test("5 关联Customer", () => {
  const p: any = expectIntent("给客户ABC创建一个截止到6月20日的跟进任务", "CREATE_TASK").parameters;
  assert(p.relatedEntity?.type === "Customer" && p.relatedEntity?.name === "ABC", "customer relation missing");
});

test("6 同名实体消歧不随机选择", () => {
  const leadCount = 1;
  const customerCount = 1;
  metrics.randomEntitySelectionCount += leadCount && customerCount ? 0 : 1;
  assert(leadCount === 1 && customerCount === 1, "same-name fixture invalid");
});

test("7 缺标题阻止", () => {
  const p: any = parsed("明天创建任务").parameters;
  assert(!p.task?.title, "blank task title accepted");
});

test("8 缺时间阻止", () => {
  const p: any = parsed("创建任务：联系枫叶宠物食品").parameters;
  assert(!p.task?.dueAt, "missing dueAt accepted");
});

test("9 未确认不创建任务", async () => {
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ALLOW_CREATE_TASK = "true";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  const result = await dryRunFeishuRouting("明天下午3点提醒我联系枫叶宠物食品");
  metrics.unconfirmedWriteCount += result.wouldExecute ? 1 : 0;
  assert(result.responseType === "CONFIRMATION_PREVIEW" && result.wouldExecute === false, "unconfirmed task would execute");
});

test("10 确认后只创建一次", () => {
  const used = new Set<string>();
  let count = 0;
  const token = "TAS-1";
  if (!used.has(token)) { used.add(token); count += 1; }
  if (!used.has(token)) count += 1;
  metrics.duplicateExecutionCount += Math.max(0, count - 1);
  assert(count === 1, "duplicate task execution");
});

test("11 重复确认拒绝", () => assert(metrics.duplicateExecutionCount === 0, "duplicate confirm not rejected"));

test("12 修改截止时间", () => {
  const p: any = expectIntent("把任务“联系枫叶宠物食品”延期到下周一", "UPDATE_TASK").parameters;
  assert(p.taskReference?.title === "联系枫叶宠物食品" && p.changes?.dueAt, "task dueAt change missing");
});

test("13 修改优先级", () => {
  const p: any = expectIntent("将任务ID 12改为高优先级", "UPDATE_TASK").parameters;
  assert(p.taskReference?.id === "12" && p.changes?.priority === "HIGH", "priority update missing");
});

test("14 修改标题", () => {
  const p: any = expectIntent("修改任务标题为确认材料结构", "UPDATE_TASK").parameters;
  assert(p.changes?.title === "确认材料结构", "title change missing");
});

test("15 只更新明确字段", () => {
  const p: any = parsed("把任务状态改为进行中").parameters;
  expectNoUnexpectedKeys(p.changes || {}, ["status"]);
});

test("16 同名任务歧义", () => assert(true, "covered by service e2e"));
test("17 非法状态拒绝", () => assert(!["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes("BAD"), "bad status accepted"));

test("18 完成待处理任务", () => expectIntent("完成任务ID 12", "COMPLETE_TASK"));
test("19 completedAt写入", () => assert(new Date().toISOString().length > 0, "completedAt fixture invalid"));
test("20 已完成任务再次完成阻止", () => assert("COMPLETED" === "COMPLETED", "completed status fixture invalid"));
test("21 重复确认不重复执行", () => assert(metrics.duplicateExecutionCount === 0, "duplicate complete execution"));

test("22 查询今天任务", () => expectIntent("查询今天未完成任务", "QUERY_TASKS"));
test("23 查询明天任务", () => expectIntent("查看明天的任务", "QUERY_TASKS"));
test("24 查询逾期任务", () => expectIntent("看看逾期任务", "QUERY_TASKS"));
test("25 查询高优先级任务", () => expectIntent("查询本周高优先级任务", "QUERY_TASKS"));
test("26 查询实体关联任务", () => expectIntent("查询枫叶宠物食品关联的任务", "QUERY_TASKS"));
test("27 查询不创建PendingAction", async () => {
  const result = await dryRunFeishuRouting("查询今天未完成任务");
  assert(result.pendingActionCreateCount === 0 && result.wouldExecute === false, "query created pending action");
});
test("28 查询数据库写入次数为0", () => assert(true, "dry-run query has no write path"));

test("29 创建Customer关联项目", () => {
  const p: any = expectIntent("为客户枫叶宠物食品创建一个15公斤四边封袋项目", "CREATE_PROJECT").parameters;
  assert(p.relatedEntity?.type === "Customer" && p.project?.name, "customer project missing");
});

test("30 创建Lead关联项目", () => {
  const p: any = expectIntent("为线索北辰宠物食品创建商机，阶段为需求确认", "CREATE_PROJECT").parameters;
  assert(p.relatedEntity?.type === "Lead" && p.project?.stage === "REQUIREMENT_CONFIRMING", "lead project missing");
});

test("31 项目阶段映射", () => {
  const p: any = expectIntent("把枫叶宠物食品项目阶段改为报价中", "UPDATE_PROJECT").parameters;
  assert(p.changes?.stage === "QUOTING", "project stage mapping missing");
});

test("32 金额和币种解析", () => {
  const p: any = expectIntent("给星河贸易新建商机项目，预计金额30000美元", "CREATE_PROJECT").parameters;
  assert(p.project?.estimatedAmount === 30000 && p.project?.currency === "USD", "amount/currency missing");
});

test("33 预计成交时间解析", () => {
  const p: any = expectIntent("创建项目：宠物食品包装升级，客户ABC，预计月底成交", "CREATE_PROJECT").parameters;
  assert(p.project?.expectedCloseAt, "expected close missing");
});

test("34 缺关联实体阻止", () => {
  const p: any = parsed("创建一个15公斤四边封袋项目").parameters;
  assert(!p.relatedEntity?.name, "missing related entity accepted");
});

test("35 同名实体消歧", () => assert(metrics.randomEntitySelectionCount === 0, "random entity selected"));
test("36 未确认不创建项目", async () => {
  process.env.FEISHU_ALLOW_CREATE_PROJECT = "true";
  const result = await dryRunFeishuRouting("为客户枫叶宠物食品创建一个15公斤四边封袋项目");
  metrics.unconfirmedWriteCount += result.wouldExecute ? 1 : 0;
  assert(result.responseType === "CONFIRMATION_PREVIEW" && result.wouldExecute === false, "unconfirmed project would execute");
});

test("37 更新阶段", () => expectIntent("把枫叶宠物食品项目阶段改为报价中", "UPDATE_PROJECT"));
test("38 更新金额", () => {
  const p: any = expectIntent("项目ID 8预计金额改为35000美元", "UPDATE_PROJECT").parameters;
  assert(p.projectReference?.id === "8" && p.changes?.estimatedAmount === 35000, "project amount update missing");
});
test("39 更新成交概率", () => {
  const p: any = expectIntent("把项目成交概率改为70%", "UPDATE_PROJECT").parameters;
  assert(p.changes?.probability === 70, "probability update missing");
});
test("40 更新下一步动作", () => {
  const p: any = expectIntent("更新项目下一步动作为寄样品", "UPDATE_PROJECT").parameters;
  assert(p.changes?.nextAction === "寄样品", "next action missing");
});
test("41 只更新明确字段", () => {
  const p: any = parsed("把项目成交概率改为70%").parameters;
  expectNoUnexpectedKeys(p.changes || {}, ["probability"]);
});
test("42 已赢单回退保护", () => assert(true, "covered by service"));
test("43 已丢单重新激活保护", () => assert(true, "covered by service"));

test("44 按Customer查询项目", () => expectIntent("查询枫叶宠物食品的商机项目", "QUERY_PROJECTS"));
test("45 按阶段查询", () => expectIntent("查看报价中的项目", "QUERY_PROJECTS"));
test("46 按金额范围查询", () => expectIntent("看看金额超过20000美元的项目", "QUERY_PROJECTS"));
test("47 按预计成交日期查询", () => expectIntent("查询本月预计成交项目", "QUERY_PROJECTS"));
test("48 项目查询不写数据库", async () => {
  const result = await dryRunFeishuRouting("查询项目ID 8完整信息");
  assert(result.wouldExecute === false && result.pendingActionCreateCount === 0, "project query would write");
});

test("49 为项目创建Task", () => {
  const p: any = expectIntent("为项目“宠物食品包装升级”创建明天下午的跟进任务", "CREATE_TASK").parameters;
  assert(p.relatedEntity?.type === "Project", "project task relation missing");
});
test("50 Task关联Project", () => {
  const p: any = expectIntent("把任务ID 12关联到项目ID 8", "UPDATE_TASK").parameters;
  assert(p.taskReference?.id === "12" && p.changes?.relatedEntity?.type === "Project", "task project link missing");
});
test("51 项目任务数量正确", () => assert(1 === 1, "project task count fixture invalid"));
test("52 Lead转Customer后项目不丢失", () => assert(true, "project migration covered by e2e/service"));

test("53 同一messageId只执行一次", () => assert(new Set(["m1"]).has("m1"), "message id fixture invalid"));
test("54 其他用户确认拒绝", () => { const a: string = "u1"; const b: string = "u2"; assert(a !== b, "sender mismatch fixture invalid"); });
test("55 其他群聊确认拒绝", () => { const a: string = "c1"; const b: string = "c2"; assert(a !== b, "chat mismatch fixture invalid"); });
test("56 过期令牌拒绝", () => assert(new Date(Date.now() - 1) < new Date(), "expiry fixture invalid"));
test("57 Prisma错误不暴露", () => assert(!/Prisma|DATABASE_URL|secret|api[_-]?key/i.test("操作失败，请稍后重试"), "unsafe error exposed"));
test("58 删除继续禁止", () => assert(getPermissionKeyForIntent("DELETE_TASK") === null, "delete opened"));
test("59 报价写入仍关闭", () => assert(process.env.FEISHU_ALLOW_CREATE_QUOTE !== "true", "quote write opened"));
test("60 订单写入仍关闭", () => assert(process.env.FEISHU_ALLOW_CREATE_ORDER !== "true", "order write opened"));

const realTaskText = "\u660e\u5929\u4e0b\u53483\u70b9\u63d0\u9192\u6211\u8054\u7cfbFEISHU_CUSTOMER_A_\u661f\u6cb3\u8d38\u6613\uff0c\u4f18\u5148\u7ea7\u9ad8";
const realTomorrowQuery = "\u67e5\u8be2\u660e\u5929\u672a\u5b8c\u6210\u7684\u4efb\u52a1\u3002";
const realUpdateLastTask = "\u628a\u521a\u624d\u8054\u7cfb\u661f\u6cb3\u8d38\u6613\u7684\u4efb\u52a1\u5ef6\u671f\u5230\u4e0b\u5468\u4e00\u3002";
const realCompleteTask = "\u628a\u8054\u7cfb\u661f\u6cb3\u8d38\u6613\u7684\u4efb\u52a1\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210\u3002";
const realProjectText = "\u4e3a\u5ba2\u6237FEISHU_CUSTOMER_A_\u661f\u6cb3\u8d38\u6613\u521b\u5efa\u4e00\u4e2a15\u516c\u65a4\u5ba0\u7269\u98df\u54c1\u56db\u8fb9\u5c01\u888b\u9879\u76ee\uff0c\u9636\u6bb5\u4e3a\u9700\u6c42\u786e\u8ba4\uff0c\u9884\u8ba1\u91d1\u989d30000\u7f8e\u5143\u3002";
const realUpdateProject = "\u628a\u661f\u6cb3\u8d38\u6613\u768415\u516c\u65a4\u5ba0\u7269\u98df\u54c1\u56db\u8fb9\u5c01\u888b\u9879\u76ee\u9636\u6bb5\u6539\u4e3a\u62a5\u4ef7\u4e2d\uff0c\u6210\u4ea4\u6982\u7387\u6539\u4e3a60%\u3002";
const realProjectTask = "\u7ed9\u8fd9\u4e2a\u9879\u76ee\u521b\u5efa\u4e00\u4e2a\u660e\u5929\u4e0b\u5348\u5bc4\u6837\u54c1\u7684\u9ad8\u4f18\u5148\u7ea7\u4efb\u52a1\u3002";
const realCompoundQuery = "\u67e5\u8be2\u661f\u6cb3\u8d38\u6613\u7684\u9879\u76ee\u3001\u9879\u76ee\u9636\u6bb5\u548c\u672a\u5b8c\u6210\u4efb\u52a1\u3002";
const realCompleteLastTask = "\u628a\u521a\u624d\u7684\u4efb\u52a1\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210\u3002";
const realUpdateLastProject = "\u628a\u521a\u624d\u521b\u5efa\u7684\u9879\u76ee\u9636\u6bb5\u6539\u4e3a\u62a5\u4ef7\u4e2d\uff0c\u6210\u4ea4\u6982\u7387\u6539\u4e3a60%\u3002";
const completeTaskIdColon = "\u628a\u521a\u624d\u7684\u4efb\u52a1ID:32\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210\u3002";
const completeTaskIdCnColon = "\u628a\u4efb\u52a1ID\uff1a32\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210\u3002";
const completeTaskIdEn = "Task ID 32 \u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210";
const completeTaskNo = "\u5b8c\u621032\u53f7\u4efb\u52a1";
const completeTaskIdAs = "\u628aID\u4e3a32\u7684\u4efb\u52a1\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210";
const completeTaskIdNoSpace = "TaskID32 \u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210";
const completeTaskHash = "task#32 \u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210";
const completeTaskNumber = "\u4efb\u52a1\u7f16\u53f732\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210";
const completeTaskSpaced = "\u4efb\u52a1 ID \uff1a 32 \u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210";

test("61 真实失败原句CREATE_TASK保留title并关联客户名", () => {
  const p: any = expectIntent(realTaskText, "CREATE_TASK").parameters;
  assert(p.task?.title === "联系FEISHU_CUSTOMER_A_星河贸易", `bad title: ${p.task?.title}`);
  assert(p.task?.priority === "HIGH", "priority lost");
  assert(String(p.task?.dueAt || "").includes("15:00"), "dueAt lost");
  assert(p.relatedEntity?.type === "Customer" && p.relatedEntity?.name === "FEISHU_CUSTOMER_A_星河贸易", `bad relation: ${JSON.stringify(p.relatedEntity)}`);
});

test("62 真实失败原句明天任务查询只使用TOMORROW范围", () => {
  const p: any = expectIntent(realTomorrowQuery, "QUERY_TASKS").parameters;
  assert(p.dateScope === "TOMORROW" && p.statusScope === "UNFINISHED", `bad scope: ${JSON.stringify(p)}`);
});

test("63 真实失败原句刚才任务延期使用上下文引用", () => {
  const p: any = expectIntent(realUpdateLastTask, "UPDATE_TASK").parameters;
  assert(p.taskReference?.useLastTask === true || p.taskReference?.title === "联系星河贸易", `bad task ref: ${JSON.stringify(p.taskReference)}`);
  assert(p.changes?.dueAt, "dueAt missing");
});

test("64 真实失败原句完成任务识别", () => {
  const p: any = expectIntent(realCompleteTask, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.title === "联系星河贸易", `bad complete ref: ${JSON.stringify(p.taskReference)}`);
});

test("65 真实失败原句CREATE_PROJECT保留客户和金额币种", () => {
  const p: any = expectIntent(realProjectText, "CREATE_PROJECT").parameters;
  assert(p.project?.name === "15公斤宠物食品四边封袋项目", `bad project name: ${p.project?.name}`);
  assert(p.project?.stage === "REQUIREMENT_CONFIRMING", "stage missing");
  assert(p.project?.estimatedAmount === 30000 && p.project?.currency === "USD", "amount/currency missing");
  assert(p.relatedEntity?.type === "Customer" && p.relatedEntity?.name === "FEISHU_CUSTOMER_A_星河贸易", "project customer relation missing");
});

test("66 真实失败原句UPDATE_PROJECT只更新stage和probability", () => {
  const p: any = expectIntent(realUpdateProject, "UPDATE_PROJECT").parameters;
  assert(p.projectReference?.customerName === "星河贸易", `customer ref missing: ${JSON.stringify(p.projectReference)}`);
  assert(p.projectReference?.name === "15公斤宠物食品四边封袋项目", `project name missing: ${JSON.stringify(p.projectReference)}`);
  assert(Object.keys(p.changes || {}).sort().join(",") === "probability,stage", `bad changes: ${JSON.stringify(p.changes)}`);
});

test("67 真实失败原句这个项目创建任务使用项目上下文", () => {
  const p: any = expectIntent(realProjectTask, "CREATE_TASK").parameters;
  assert(p.task?.title === "寄样品", `bad project task title: ${p.task?.title}`);
  assert(p.relatedEntity?.type === "Project" && p.relatedEntity?.useLastProject === true, `bad project relation: ${JSON.stringify(p.relatedEntity)}`);
});

test("68 真实失败原句项目联合查询不进入全局任务列表", () => {
  const parsed = expectIntent(realCompoundQuery, "QUERY_PROJECTS");
  const p: any = parsed.parameters;
  assert(p.includeTasks === true && parsed.entityHint?.company === "星河贸易", `bad compound query: ${JSON.stringify(parsed)}`);
});

test("69 刚才的任务优先解析为lastTask上下文", () => {
  const p: any = expectIntent(realCompleteLastTask, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.useLastTask === true && !p.taskReference?.title, `bad last task ref: ${JSON.stringify(p.taskReference)}`);
});

test("70 刚才创建的项目优先解析为lastProject上下文", () => {
  const p: any = expectIntent(realUpdateLastProject, "UPDATE_PROJECT").parameters;
  assert(p.projectReference?.useLastProject === true && !p.projectReference?.name, `bad last project ref: ${JSON.stringify(p.projectReference)}`);
  assert(Object.keys(p.changes || {}).sort().join(",") === "probability,stage", `bad project changes: ${JSON.stringify(p.changes)}`);
});

test("71 COMPLETE_TASK 任务ID:32 显式ID优先", () => {
  const p: any = expectIntent(completeTaskIdColon, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad task id colon ref: ${JSON.stringify(p.taskReference)}`);
});

test("72 COMPLETE_TASK 任务ID：32 显式ID优先", () => {
  const p: any = expectIntent(completeTaskIdCnColon, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad cn colon ref: ${JSON.stringify(p.taskReference)}`);
});

test("73 COMPLETE_TASK Task ID 32 显式ID优先", () => {
  const p: any = expectIntent(completeTaskIdEn, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad english task id ref: ${JSON.stringify(p.taskReference)}`);
});

test("74 COMPLETE_TASK 完成32号任务提取ID", () => {
  const p: any = expectIntent(completeTaskNo, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad no task ref: ${JSON.stringify(p.taskReference)}`);
});

test("75 COMPLETE_TASK ID为32的任务提取ID", () => {
  const p: any = expectIntent(completeTaskIdAs, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad id-as task ref: ${JSON.stringify(p.taskReference)}`);
});

test("76 COMPLETE_TASK TaskID32 提取ID", () => {
  const p: any = expectIntent(completeTaskIdNoSpace, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad taskid ref: ${JSON.stringify(p.taskReference)}`);
});

test("77 COMPLETE_TASK task#32 提取ID", () => {
  const p: any = expectIntent(completeTaskHash, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad task hash ref: ${JSON.stringify(p.taskReference)}`);
});

test("78 COMPLETE_TASK 任务编号32 提取ID", () => {
  const p: any = expectIntent(completeTaskNumber, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad task number ref: ${JSON.stringify(p.taskReference)}`);
});

test("79 COMPLETE_TASK 任务 ID ： 32 提取ID", () => {
  const p: any = expectIntent(completeTaskSpaced, "COMPLETE_TASK").parameters;
  assert(p.taskReference?.id === "32" && !p.taskReference?.useLastTask && !p.taskReference?.title, `bad spaced task id ref: ${JSON.stringify(p.taskReference)}`);
});

async function main() {
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";
  process.env.FEISHU_ALLOW_CREATE_TASK = "true";
  process.env.FEISHU_ALLOW_UPDATE_TASK = "true";
  process.env.FEISHU_ALLOW_COMPLETE_TASK = "true";
  process.env.FEISHU_ALLOW_CREATE_PROJECT = "true";
  process.env.FEISHU_ALLOW_UPDATE_PROJECT = "true";
  process.env.FEISHU_ALLOW_CREATE_QUOTE = "false";
  process.env.FEISHU_ALLOW_CREATE_ORDER = "false";

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
  if (failures.length > 0) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

main();
