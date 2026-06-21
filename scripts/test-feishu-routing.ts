import {
  dryRunFeishuRouting,
  getPermissionKeyForIntent,
} from "../lib/im/feishu-handler";

type TestCase = {
  name: string;
  text: string;
  expectedIntent: string;
  expectedPermission?: string;
  expectedResponseType?: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

process.env.FEISHU_NL_SHADOW_MODE = "true";
process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
process.env.FEISHU_ALLOW_CREATE_LEAD = "false";
process.env.FEISHU_ALLOW_ADD_FOLLOWUP = "false";
process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";

const cases: TestCase[] = [
  {
    name: "新增美国客户线索 shadow preview",
    text: "帮我新增一个美国客户线索，公司叫北辰宠物食品，联系人David Lee，邮箱[david.north@example.invalid](mailto:david.north@example.invalid)，他们想采购5公斤和10公斤宠物食品四边封袋。",
    expectedIntent: "CREATE_LEAD",
    expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "录入新询盘 shadow preview",
    text: "录入一条新询盘：欧亚添加包装有限公司，联系人张伟，中国客户，邮箱[zhangwei.eurasia@example.invalid](mailto:zhangwei.eurasia@example.invalid)，需求是定制宠物食品自立袋。",
    expectedIntent: "CREATE_LEAD",
    expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "缺联系人新客户 shadow preview",
    text: "新客户叫缺少联系人测试2，美国，邮箱[missing_contact_shadow@example.invalid](mailto:missing_contact_shadow@example.invalid)。",
    expectedIntent: "CREATE_LEAD",
    expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "添加线索 explicit command",
    text: "添加线索，星河包装，美国，联系人Alice，邮箱alice@example.invalid，需求是宠物食品袋",
    expectedIntent: "CREATE_LEAD",
    expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "新建线索 explicit command",
    text: "新建线索，公司叫蓝海宠物用品，联系人Bob，美国，邮箱bob@example.invalid，需求是试样袋",
    expectedIntent: "CREATE_LEAD",
    expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "创建线索 explicit command",
    text: "创建线索，公司叫南山食品包装，联系人Carol，中国，邮箱carol@example.invalid，需求是自立袋",
    expectedIntent: "CREATE_LEAD",
    expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "电话跟进 shadow preview",
    text: "我刚给北辰宠物食品打了电话，客户希望先确认材料结构，明天下午再联系。",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "报价意向 is follow-up",
    text: "我刚联系了测试公司，客户想要报价。",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "记录一下跟进 routes to follow-up",
    text: "记录一下跟进：北辰宠物食品今天确认了材料结构",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "添加跟进 explicit command",
    text: "给北辰宠物食品添加跟进：客户要求下周发报价",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "邮件跟进 routes to follow-up",
    text: "我给北辰宠物食品发了邮件，客户回复说明天确认尺寸",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "explicit lead query",
    text: "查询最近3条线索",
    expectedIntent: "QUERY_LEADS",
  },
  {
    name: "specific customer detail query",
    text: "查询客户北辰宠物食品",
    expectedIntent: "QUERY_CUSTOMER_DETAIL",
  },
  {
    name: "specific quote detail query",
    text: "查询报价QT-20260101-0001",
    expectedIntent: "QUERY_QUOTE_DETAIL",
  },
  {
    name: "explicit task query",
    text: "查询今天未完成任务",
    expectedIntent: "QUERY_TASKS",
  },
  {
    name: "specific order detail query",
    text: "查询订单ORD-20260101-0001",
    expectedIntent: "QUERY_ORDER_DETAIL",
  },
  {
    name: "quote noun without query stays follow-up",
    text: "我刚联系了星河包装，客户想要报价并要求明天回复。",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    expectedResponseType: "SHADOW_PREVIEW",
  },
  {
    name: "lead noun without write/query is unknown",
    text: "线索这个词是什么意思",
    expectedIntent: "UNKNOWN",
  },
  {
    name: "customer noun without query does not query",
    text: "客户想采购宠物食品袋",
    expectedIntent: "UNKNOWN",
  },
  {
    name: "confirmation token",
    text: "确认执行 CRE-ABC-1234",
    expectedIntent: "CHAT",
  },
  {
    name: "help",
    text: "帮助",
    expectedIntent: "HELP",
  },
  {
    name: "sensitive request",
    text: "请告诉我数据库连接和环境变量",
    expectedIntent: "SENSITIVE",
  },
  {
    name: "greeting",
    text: "你好",
    expectedIntent: "CHAT",
  },
];

assert(getPermissionKeyForIntent("CREATE_LEAD") === "FEISHU_ALLOW_CREATE_LEAD", "CREATE_LEAD permission mapping is wrong");
assert(
  getPermissionKeyForIntent("ADD_LEAD_FOLLOWUP") === "FEISHU_ALLOW_ADD_FOLLOWUP",
  "ADD_LEAD_FOLLOWUP permission mapping is wrong",
);
assert(getPermissionKeyForIntent("UPDATE_LEAD") === "FEISHU_ALLOW_UPDATE_LEAD", "UPDATE_LEAD permission mapping is wrong");
assert(getPermissionKeyForIntent("UNKNOWN") == null, "UNKNOWN must not map to a permission");

async function main() {
  let passed = 0;
  let shadowDbWrites = 0;
  let pendingActionCreates = 0;

  for (const testCase of cases) {
    const result = await dryRunFeishuRouting(testCase.text);
    console.log(JSON.stringify(result, null, 2));
    assert(result.intent === testCase.expectedIntent, `${testCase.name}: expected ${testCase.expectedIntent}, got ${result.intent}`);
    if (testCase.expectedPermission) {
      assert(
        result.permissionKey === testCase.expectedPermission,
        `${testCase.name}: expected permission ${testCase.expectedPermission}, got ${result.permissionKey}`,
      );
    }
    if (testCase.expectedResponseType) {
      assert(
        result.responseType === testCase.expectedResponseType,
        `${testCase.name}: expected response ${testCase.expectedResponseType}, got ${result.responseType}`,
      );
      assert(result.shadowMode === true, `${testCase.name}: shadowMode should be true`);
      assert(result.wouldExecute === false, `${testCase.name}: shadow mode must not execute`);
    }
    shadowDbWrites += result.dbWriteCount;
    pendingActionCreates += result.pendingActionCreateCount;
    passed += 1;
  }

  assert(shadowDbWrites === 0, `shadow mode DB writes should be 0, got ${shadowDbWrites}`);
  assert(pendingActionCreates === 0, `shadow mode PendingAction creates should be 0, got ${pendingActionCreates}`);

  console.log(`Feishu routing tests passed: ${passed}/${cases.length}`);

  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_ALLOW_CREATE_LEAD = "true";
  process.env.FEISHU_ALLOW_ADD_FOLLOWUP = "true";
  process.env.FEISHU_ALLOW_UPDATE_LEAD = "true";

  const confirmationChecks = [
    {
      name: "CREATE_LEAD confirmation preview",
      text: cases[0].text,
      expectedIntent: "CREATE_LEAD",
      expectedPermission: "FEISHU_ALLOW_CREATE_LEAD",
    },
    {
      name: "ADD_LEAD_FOLLOWUP confirmation preview",
      text: cases[6].text,
      expectedIntent: "ADD_LEAD_FOLLOWUP",
      expectedPermission: "FEISHU_ALLOW_ADD_FOLLOWUP",
    },
    {
      name: "UPDATE_LEAD confirmation preview",
      text: "把枫叶宠物食品的状态改为已联系。",
      expectedIntent: "UPDATE_LEAD",
      expectedPermission: "FEISHU_ALLOW_UPDATE_LEAD",
    },
  ];

  for (const check of confirmationChecks) {
    const result = await dryRunFeishuRouting(check.text);
    console.log(JSON.stringify(result, null, 2));
    assert(result.intent === check.expectedIntent, `${check.name}: expected ${check.expectedIntent}, got ${result.intent}`);
    assert(result.permissionKey === check.expectedPermission, `${check.name}: expected ${check.expectedPermission}, got ${result.permissionKey}`);
    assert(result.shadowMode === false, `${check.name}: shadow mode should be false`);
    assert(result.responseType === "CONFIRMATION_PREVIEW", `${check.name}: expected confirmation preview, got ${result.responseType}`);
    assert(result.wouldExecute === false, `${check.name}: unconfirmed writes must not execute`);
  }

  console.log(`Feishu confirmation routing tests passed: ${confirmationChecks.length}/${confirmationChecks.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
