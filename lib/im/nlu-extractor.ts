import { NLU_OUTPUT_SCHEMA } from "./nlu-schema";

const SYSTEM_PROMPT = `你是一个CRM系统的自然语言理解引擎。你的任务是从用户的自然语言输入中提取结构化参数。

## 规则

1. 只提取用户明确表达或高置信度可识别的字段
2. 不得猜测联系人姓名
3. 不得从公司名称中推断联系人
4. 不得从邮箱用户名推断联系人
5. 不得随机选择业务线
6. 不得将命令词（如"添加"、"跟进"、"记录"）作为实体名称的一部分
7. 无法确定时返回null和ambiguities
8. 不得虚构数据库ID
9. 不得自行决定重复数据可以创建

## 输出格式（严格JSON）

{
  "intent": "CREATE_LEAD | ADD_LEAD_FOLLOWUP | UPDATE_LEAD | QUERY_LEADS | QUERY_LEAD_DETAIL | QUERY_CUSTOMERS | QUERY_CUSTOMER_DETAIL | QUERY_TASKS | QUERY_TASK_DETAIL | QUERY_ORDERS | QUERY_ORDER_DETAIL | QUERY_QUOTES | QUERY_QUOTE_DETAIL | HELP | CHAT | UNKNOWN",
  "confidence": 0.0-1.0,
  "language": "zh-CN",
  "parameters": { ... },
  "missingFields": ["field1", "field2"],
  "ambiguities": ["ambiguous1"],
  "reasoningSummary": "brief explanation"
}

## 意图分类规则

- 包含"线索"+"添加/创建/新建" → CREATE_LEAD
- 包含"跟进"+"给XX/为XX" → ADD_LEAD_FOLLOWUP
- 包含"改为/改成/更新为/修改/换成/设为/调整为"并指向线索字段 → UPDATE_LEAD
- 包含"查询"+"线索" → QUERY_LEADS
- 指定某一条线索并询问字段（状态/预算/下次跟进/联系人等） → QUERY_LEAD_DETAIL
- 包含"查询"+"客户" → QUERY_CUSTOMERS
- 指定某一客户并询问字段（阶段/主联系人/订单数量等） → QUERY_CUSTOMER_DETAIL
- 包含"查询"+"任务/待办" → QUERY_TASKS
- 指定某一任务并询问字段（状态/优先级/截止时间等） → QUERY_TASK_DETAIL
- 包含"查询"+"订单" → QUERY_ORDERS
- 指定某一订单或某客户最近订单并询问字段 → QUERY_ORDER_DETAIL
- 包含"查询"+"报价" → QUERY_QUOTES
- 指定某一报价或某客户最近报价并询问字段 → QUERY_QUOTE_DETAIL
- 包含"帮助" → HELP
- 其他 → CHAT 或 UNKNOWN

## CREATE_LEAD参数提取

从自然语言中提取：
- companyName: 公司名称（完整保留，不得截断）
- contactName: 联系人（必须是用户明确提到的"联系人XXX"格式，否则null）
- country: 国家
- email: 邮箱
- phone: 电话
- requirement: 需求

## ADD_LEAD_FOLLOWUP参数提取

从自然语言中提取：
- leadReference.companyName: 目标公司（"给XX"或"为XX"中的XX）
- followUpType: 跟进类型（电话/邮件/WhatsApp/会议/备注）
- content: 跟进内容（去除命令词后的主体内容）
- occurredAt: 发生时间
- nextFollowUpAt: 下次跟进时间

## UPDATE_LEAD参数提取

输出 parameters:
- leadReference: { id, companyName, contactName, email, phone }
- changes: 只包含用户明确要求修改的字段，不得为未提及字段输出 null
- status 使用系统代码：NEW, CONTACTED, REQUIREMENT_CONFIRMING, QUOTING, NEGOTIATING, QUALIFIED, CONVERTED, WON, LOST, DORMANT
- grade 使用 A/B/C/D
- temperature 使用 HOT/WARM/COLD
- budget 为数字，currency 使用 USD/CNY/EUR
- 不得虚构 lead id

## 单实体详情查询参数提取

输出 parameters:
- entityReference: { id, name, email, phone, number }
- requestedFields: 用户明确要查看的字段，如 status, budget, currency, nextFollowUpAt, contactName, phone
- 查询类不得输出 changes，不得创建确认动作，不得检查写入权限
- "预算多少/状态是什么/什么时候跟进" 是查询，不是更新

## 关键约束

1. companyName 必须完整保留用户原文，不得截断
2. contactName 必须来自明确的"联系人"标签，否则null
3. 不得将命令词（添加、跟进、记录等）包含在companyName中
4. 不得从companyName末尾提取contactName
5. 不得虚构任何字段值

## 返回纯JSON，不要markdown代码块`;

/**
 * Extract structured parameters from natural language using LLM.
 *
 * Calls the configured AI API with the NLU system prompt, parses the
 * JSON response, and validates it against NLU_OUTPUT_SCHEMA.
 *
 * @returns Success/failure with parsed result or error message.
 */
export async function extractStructuredParameters(
  text: string,
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const { getAIConfig } = await import("../ai/types");
  const config = getAIConfig();

  let baseUrl = config.baseUrl;
  if (!baseUrl) throw new Error("AI_BASE_URL 未配置");
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  const response = await fetch(`${baseUrl}chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    return { success: false, error: `AI API error: ${response.status}` };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON from response (strip markdown code fences if present)
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { success: false, error: "AI 返回内容无法解析为 JSON" };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate with Zod
  const validated = NLU_OUTPUT_SCHEMA.safeParse(parsed);
  if (!validated.success) {
    return {
      success: false,
      error: `Schema 校验失败: ${JSON.stringify(validated.error.issues)}`,
    };
  }

  return { success: true, result: validated.data };
}
