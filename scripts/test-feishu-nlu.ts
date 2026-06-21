import { parseFeishuIntent } from "../lib/im/feishu-parser";

type TestCase = {
  name: string;
  text: string;
  expectedIntent: string;
  expected?: (result: ReturnType<typeof parseFeishuIntent>) => void;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cases: TestCase[] = [
  {
    name: "新增美国客户线索 routes to CREATE_LEAD",
    text: "帮我新增一个美国客户线索，公司叫北辰宠物食品，联系人David Lee，邮箱[david.north@example.invalid](mailto:david.north@example.invalid)，他们想采购5公斤和10公斤宠物食品四边封袋。",
    expectedIntent: "CREATE_LEAD",
  },
  {
    name: "录入新询盘 routes to CREATE_LEAD",
    text: "录入一条新询盘：欧亚添加包装有限公司，联系人张伟，中国客户，邮箱[zhangwei.eurasia@example.invalid](mailto:zhangwei.eurasia@example.invalid)，需求是定制宠物食品自立袋。",
    expectedIntent: "CREATE_LEAD",
    expected: (result) => {
      assert(result.entityHint?.company === "欧亚添加包装有限公司", "公司名称应完整保留“添加”");
      assert(result.parameters.followUpContent == null, "创建线索不应产生 followUpContent");
    },
  },
  {
    name: "新客户缺联系人 keeps contactName null",
    text: "新客户叫缺少联系人测试2，美国，邮箱[missing_contact_shadow@example.invalid](mailto:missing_contact_shadow@example.invalid)。",
    expectedIntent: "CREATE_LEAD",
    expected: (result) => {
      assert(result.entityHint?.company === "缺少联系人测试2", "公司名称应完整保留“测试2”");
      assert(result.parameters.contactName == null, "缺联系人时 contactName 应保持 null/undefined");
      assert(result.parameters.email === "missing_contact_shadow@example.invalid", "邮箱末尾标点应清理");
    },
  },
  {
    name: "刚打电话 routes to ADD_LEAD_FOLLOWUP",
    text: "我刚给北辰宠物食品打了电话，客户希望先确认材料结构，明天下午再联系。",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
    expected: (result) => {
      assert(result.parameters.phone == null, "电话跟进不应误抽 phone 字段");
    },
  },
  {
    name: "客户想要报价 is follow-up, not query quote",
    text: "我刚联系了测试公司，客户想要报价。",
    expectedIntent: "ADD_LEAD_FOLLOWUP",
  },
  {
    name: "明确查询线索 remains QUERY_LEADS",
    text: "查询最近3条线索",
    expectedIntent: "QUERY_LEADS",
  },
  {
    name: "指定客户查询 routes to QUERY_CUSTOMER_DETAIL",
    text: "查询客户北辰宠物食品",
    expectedIntent: "QUERY_CUSTOMER_DETAIL",
  },
  {
    name: "指定报价查询 routes to QUERY_QUOTE_DETAIL",
    text: "查询报价QT-20260101-0001",
    expectedIntent: "QUERY_QUOTE_DETAIL",
  },
  {
    name: "UPDATE_LEAD 修改状态",
    text: "把枫叶宠物食品的状态改为已联系。",
    expectedIntent: "UPDATE_LEAD",
    expected: (result) => {
      assert(result.parameters.updateLead?.changes.status === "CONTACTED", "应提取状态变更");
    },
  },
  {
    name: "UPDATE_LEAD 修改预算和币种",
    text: "将枫叶宠物食品的预算更新为15000美元。",
    expectedIntent: "UPDATE_LEAD",
    expected: (result) => {
      assert(result.parameters.updateLead?.changes.budget === 15000, "应提取预算");
      assert(result.parameters.updateLead?.changes.currency === "USD", "应提取币种");
    },
  },
  {
    name: "UPDATE_LEAD 修改联系人和电话",
    text: "枫叶宠物食品的联系人改成Emily Zhang，电话改成+1 202 000 0555。",
    expectedIntent: "UPDATE_LEAD",
  },
  {
    name: "UPDATE_LEAD 修改客户需求",
    text: "把枫叶宠物食品的客户需求改为10公斤和15公斤宠物食品四边封袋。",
    expectedIntent: "UPDATE_LEAD",
  },
  {
    name: "UPDATE_LEAD 修改下次跟进时间",
    text: "下周一跟进枫叶宠物食品。",
    expectedIntent: "UPDATE_LEAD",
  },
  {
    name: "UPDATE_LEAD 修改等级和温度",
    text: "将枫叶宠物食品的等级改为A级，温度改为热。",
    expectedIntent: "UPDATE_LEAD",
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = parseFeishuIntent(testCase.text);
  assert(
    result.intent === testCase.expectedIntent,
    `${testCase.name}: expected ${testCase.expectedIntent}, got ${result.intent}`,
  );
  testCase.expected?.(result);
  passed += 1;
}

console.log(`Feishu NLU tests passed: ${passed}/${cases.length}`);
