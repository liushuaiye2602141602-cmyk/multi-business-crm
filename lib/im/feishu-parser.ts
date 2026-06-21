import { z } from "zod";

export type WriteIntent =
  | "CREATE_LEAD"
  | "UPDATE_LEAD"
  | "ADD_LEAD_FOLLOWUP"
  | "CONVERT_LEAD_TO_CUSTOMER"
  | "CREATE_CUSTOMER"
  | "UPDATE_CUSTOMER"
  | "CLAIM_CUSTOMER"
  | "RELEASE_CUSTOMER"
  | "CREATE_CONTACT"
  | "UPDATE_CONTACT"
  | "SET_PRIMARY_CONTACT"
  | "ADD_CUSTOMER_FOLLOWUP"
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "COMPLETE_TASK"
  | "CREATE_PROJECT"
  | "UPDATE_PROJECT"
  | "LINK_TASK_TO_ENTITY"
  | "LINK_PROJECT_TO_CUSTOMER"
  | "LINK_PROJECT_TO_LEAD"
  | "CREATE_QUOTE"
  | "UPDATE_QUOTE"
  | "SEND_QUOTE"
  | "ACCEPT_QUOTE"
  | "CONVERT_QUOTE_TO_ORDER"
  | "QUOTE_TO_ORDER"
  | "CREATE_ORDER"
  | "UPDATE_ORDER"
  | "UPDATE_ORDER_STATUS"
  | "CREATE_INVOICE"
  | "UPDATE_INVOICE"
  | "RECORD_PAYMENT";

import { cleanEntityName as cleanDomainEntityName, normalizeCreateLeadParameters, normalizeCustomerChangesForParser } from "./feishu-domain-dto";

export type QueryIntent =
  | "QUERY_LEADS"
  | "QUERY_CUSTOMERS"
  | "QUERY_TASKS"
  | "QUERY_ORDERS"
  | "QUERY_QUOTE"
  | "QUERY_QUOTES"
  | "QUERY_LEAD_DETAIL"
  | "QUERY_CUSTOMER_DETAIL"
  | "QUERY_CONTACT_DETAIL"
  | "QUERY_CUSTOMER_CONTACTS"
  | "QUERY_TASK_DETAIL"
  | "QUERY_PROJECTS"
  | "QUERY_PROJECT_DETAIL"
  | "QUERY_QUOTE_DETAIL"
  | "QUERY_ORDER_DETAIL";

export type ParsedIntent = {
  intent:
    | "CHAT"
    | "HELP"
    | QueryIntent
    | WriteIntent
    | "COMPOUND_QUERY_AND_UPDATE"
    | "SENSITIVE"
    | "UNKNOWN";
  confidence: number;
  parameters: {
    keyword?: string;
    exactName?: string;
    contactName?: string;
    followUpContent?: string;
    limit?: number;
    dateScope?: "TODAY" | "TOMORROW" | "OVERDUE" | "UPCOMING" | "THIS_MONTH" | "ALL";
    statusScope?: "UNFINISHED" | "COMPLETED" | "ALL";
    priority?: string;
    status?: string;
    stage?: string;
    minAmount?: number;
    fields?: string[];
    confirmationToken?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    id?: string;
    customerId?: number;
    contactId?: number;
    businessLineId?: number;
    businessLineName?: string;
    title?: string;
    department?: string;
    notes?: string;
    isPrimary?: boolean;
    changes?: Record<string, unknown>;
    country?: string;
    requirement?: string;
    missingFields?: string[];
    updateLead?: {
      leadReference: {
        id?: string | null;
        companyName?: string | null;
        contactName?: string | null;
        email?: string | null;
        phone?: string | null;
      };
      changes: {
        companyName?: string | null;
        contactName?: string | null;
        country?: string | null;
        phone?: string | null;
        email?: string | null;
        whatsapp?: string | null;
        requirement?: string | null;
        productInterest?: string | null;
        budget?: number | null;
        currency?: string | null;
        expectedCloseAt?: string | null;
        nextFollowUpAt?: string | null;
        notes?: string | null;
        status?: string | null;
        grade?: string | null;
        temperature?: string | null;
      };
    };
    updateLeadPlan?: {
      originalMessageId?: string;
      leadId: number;
      changes: Record<string, unknown>;
      beforeValues: Record<string, unknown>;
      changedFields: string[];
    };
    customerFlowPlan?: Record<string, unknown>;
    leadReference?: Record<string, unknown>;
    customerReference?: Record<string, unknown>;
    contactReference?: Record<string, unknown>;
    customerInput?: Record<string, unknown>;
    customerChanges?: Record<string, unknown>;
    contactInput?: Record<string, unknown>;
    contactChanges?: Record<string, unknown>;
    task?: Record<string, unknown>;
    taskReference?: Record<string, unknown>;
    project?: Record<string, unknown>;
    projectReference?: Record<string, unknown>;
    quote?: Record<string, unknown>;
    quoteReference?: Record<string, unknown>;
    order?: Record<string, unknown>;
    orderReference?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
    quoteOrderPlan?: Record<string, unknown>;
    relatedEntity?: Record<string, unknown>;
    taskProjectPlan?: Record<string, unknown>;
    ambiguities?: string[];
    includeTasks?: boolean;
    entityQuery?: {
      entityReference: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        number?: string | null;
      };
      requestedFields: string[];
      missingFields?: string[];
      ambiguities?: string[];
      relation?: "latest" | "list" | "unfinished" | null;
    };
    actions?: Array<{
      intent: string;
      confidence?: number;
      parameters?: Record<string, any>;
      requiresConfirmation?: boolean;
      blockedReason?: string;
    }>;
  };
  entityHint?: {
    company?: string;
    contact?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
  replyText?: string;
};

export const ParserOutputSchema = z.object({
  intent: z.string(),
  entityHint: z.object({
    company: z.string().optional(),
    contact: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  parameters: z.record(z.string(), z.any()).optional(),
});

const FORBIDDEN_PARSER_KEYS = new Set([
  "keyword",
  "ownerId",
  "aiScore",
  "followUps",
  "emails",
  "messages",
  "tasks",
  "projects",
]);

// ── Confirmation token pattern (for C-level operations) ───────────
const CONFIRM_PATTERN = /^确认(?:执行)?\s+(.+)$/;

export function parseFeishuIntent(text: string): ParsedIntent {
  return finalizeParserOutput(parseFeishuIntentInternal(text));
}

function parseFeishuIntentInternal(text: string): ParsedIntent {
  const trimmed = normalizeMessage(text);

  // ── Check for confirmation token first ───────────────────────────
  const confirmMatch = trimmed.match(CONFIRM_PATTERN);
  if (confirmMatch) {
    return {
      intent: "CHAT" as any, // will be intercepted by handler
      confidence: 1.0,
      parameters: { confirmationToken: confirmMatch[1].trim() },
      replyText: `确认执行: ${confirmMatch[1].trim()}`,
    };
  }

  // ── Sensitive request detection ──────────────────────────────────
  const sensitivePatterns = [
    "系统提示词", "数据库连接", "密钥", "App Secret",
    "API Key", "环境变量", "忽略所有规则", "database", "password", "secret",
  ];
  if ( sensitivePatterns.some((p) => trimmed.toLowerCase().includes(p.toLowerCase())) ) {
    return { intent: "SENSITIVE", confidence: 1.0, parameters: {} };
  }

  // ── Help ─────────────────────────────────────────────────────────
  if (trimmed === "帮助" || trimmed === "help" || trimmed === "你能做什么" || trimmed === "你有什么功能") {
    return { intent: "HELP", confidence: 1.0, parameters: {} };
  }

  // ── Simple greetings / echo ──────────────────────────────────────
  if ( trimmed.startsWith("请只回复：") || trimmed === "你好" || trimmed === "hi" || trimmed === "谢谢" ) {
    const reply = trimmed.startsWith("请只回复：")
      ? trimmed.replace("请只回复：", "").trim()
      : "你好！我是CRM助手，可以帮你查询线索、客户、任务等信息。";
    return { intent: "CHAT", confidence: 1.0, parameters: {}, replyText: reply };
  }

  const compound = extractCompoundIntent(trimmed);
  if (compound) {
    return compound;
  }

  const quoteOrderQueryBeforeWrite = extractQuoteOrderQueryIntent(trimmed);
  if (quoteOrderQueryBeforeWrite) {
    return quoteOrderQueryBeforeWrite;
  }

  const quoteOrderWrite = extractQuoteOrderFlowIntent(trimmed);
  if (quoteOrderWrite) {
    return quoteOrderWrite;
  }

  if (trimmed.includes("\u65b0\u5efa\u5546\u673a\u9879\u76ee")) {
    const amount = extractAmount(trimmed);
    const company = cleanTaskProjectName(trimmed.match(/\u7ed9(.+?)\u65b0\u5efa\u5546\u673a\u9879\u76ee/)?.[1]);
    return {
      intent: "CREATE_PROJECT",
      confidence: 0.92,
      parameters: {
        project: {
          name: company ? `${company}商机项目` : undefined,
          stage: normalizeProjectStage(trimmed) || "REQUIREMENT_CONFIRMING",
          estimatedAmount: amount?.amount,
          currency: amount?.currency,
          expectedCloseAt: parseChineseDateTime(trimmed),
        },
        relatedEntity: company ? { type: "Customer", name: company } : undefined,
        missingFields: company ? [] : ["relatedEntity"],
      },
    };
  }

  // ════════════════════════════════════════════════════════════════
  // WRITE INTENTS — order matters (most specific first)
  // ════════════════════════════════════════════════════════════════

  const taskProjectQueryBeforeDetail = extractTaskProjectQueryIntent(trimmed);
  if (taskProjectQueryBeforeDetail) {
    return taskProjectQueryBeforeDetail;
  }

  const taskProjectWrite = extractTaskProjectFlowIntent(trimmed);
  if (taskProjectWrite) {
    return taskProjectWrite;
  }

  const customerFlowWrite = extractCustomerFlowWriteIntent(trimmed);
  if (customerFlowWrite) {
    return customerFlowWrite;
  }

  // C-level: Lead → Customer conversion
  if ( trimmed.includes("线索转客户") || trimmed.includes("转化客户") || trimmed.includes("将线索转为客户") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CONVERT_LEAD_TO_CUSTOMER", confidence: 0.95, parameters: params };
  }

  // C-level: Quote → Order conversion
  if ( trimmed.includes("报价转订单") || trimmed.includes("报价转为订单") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CONVERT_QUOTE_TO_ORDER", confidence: 0.95, parameters: params };
  }

  // C-level: Send quote
  if ( ( trimmed.includes("发送报价") || trimmed.includes("发出报价") || trimmed.includes("发出报价单") ) && !trimmed.includes("更新") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "SEND_QUOTE", confidence: 0.95, parameters: params };
  }

  // C-level: Accept quote
  if ( trimmed.includes("接受报价") || trimmed.includes("同意报价") || trimmed.includes("确认报价") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "ACCEPT_QUOTE", confidence: 0.95, parameters: params };
  }

  // C-level: Record payment
  if ( trimmed.includes("记录付款") || trimmed.includes("收款") || trimmed.includes("记录收款") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "RECORD_PAYMENT", confidence: 0.95, parameters: params };
  }

  // C-level: Update order status (confirmation flow)
  if ( trimmed.includes("确认订单") || ( trimmed.includes("更新订单状态") && !trimmed.includes("创建") ) ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_ORDER_STATUS", confidence: 0.95, parameters: params };
  }

  // C-level: Claim customer from pool
  if ( trimmed.includes("认领客户") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CLAIM_CUSTOMER", confidence: 0.95, parameters: params };
  }

  // C-level: Release customer to pool
  if ( ( trimmed.includes("退回公海") || trimmed.includes("释放公海") || trimmed.includes("退回") ) && trimmed.includes("公海") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "RELEASE_CUSTOMER", confidence: 0.95, parameters: params };
  }

  // B-level: Complete task
  if ( ( trimmed.includes("完成任务") || trimmed === "完成" ) && !trimmed.includes("查询") && !trimmed.includes("查看") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "COMPLETE_TASK", confidence: 0.9, parameters: params };
  }

  // Write: Create Lead
  if ( trimmed.includes("添加线索") || trimmed.includes("新建线索") || trimmed.includes("创建线索") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_LEAD", confidence: 0.95, parameters: params };
  }

  // Write: Update Lead
  if (isUpdateLeadText(trimmed)) {
    const params = extractUpdateLeadParams(trimmed);
    return { intent: "UPDATE_LEAD", confidence: 0.9, parameters: params };
  }

  // Write: Add Lead Followup
  if ( ( trimmed.includes("添加跟进") || trimmed.includes("添加跟进记录") || trimmed.includes("跟进") ) && !trimmed.includes("查询") && !trimmed.includes("查看") ) {
    const params = extractWriteParams(trimmed, true);
    return { intent: "ADD_LEAD_FOLLOWUP", confidence: 0.9, parameters: params };
  }

  // Write: Create Customer
  if ( trimmed.includes("创建客户") || trimmed.includes("新建客户") || trimmed.includes("添加客户") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_CUSTOMER", confidence: 0.95, parameters: params };
  }

  // Write: Update Customer
  if ( trimmed.includes("更新客户") || trimmed.includes("修改客户") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_CUSTOMER", confidence: 0.9, parameters: params };
  }

  // Write: Add Customer Followup
  if ( trimmed.includes("给") && trimmed.includes("添加跟进") && !trimmed.includes("线索") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "ADD_CUSTOMER_FOLLOWUP", confidence: 0.85, parameters: params };
  }

  // Write: Create Contact
  if ( trimmed.includes("创建联系人") || trimmed.includes("新建联系人") || trimmed.includes("添加联系人") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_CONTACT", confidence: 0.95, parameters: params };
  }

  // Write: Update Contact
  if ( trimmed.includes("更新联系人") || trimmed.includes("修改联系人") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_CONTACT", confidence: 0.9, parameters: params };
  }

  // Write: Set Primary Contact
  if ( trimmed.includes("设置主联系人") || trimmed.includes("指定主联系人") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "SET_PRIMARY_CONTACT", confidence: 0.9, parameters: params };
  }

  // Write: Create Task
  if ( trimmed.includes("创建任务") || trimmed.includes("新建任务") || trimmed.includes("添加任务") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_TASK", confidence: 0.95, parameters: params };
  }

  // Write: Update Task
  if ( trimmed.includes("更新任务") || trimmed.includes("修改任务") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_TASK", confidence: 0.9, parameters: params };
  }

  // Write: Create Project / Opportunity
  if ( trimmed.includes("创建项目") || trimmed.includes("新建项目") || trimmed.includes("创建商机") || trimmed.includes("新建商机") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_PROJECT", confidence: 0.95, parameters: params };
  }

  // Write: Update Project / Opportunity
  if ( trimmed.includes("更新项目") || trimmed.includes("修改项目") || trimmed.includes("更新商机") || trimmed.includes("修改商机") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_PROJECT", confidence: 0.9, parameters: params };
  }

  // Write: Create Quote
  if ( trimmed.includes("创建报价") || trimmed.includes("新建报价") || trimmed.includes("创建报价单") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_QUOTE", confidence: 0.95, parameters: params };
  }

  // Write: Update Quote
  if ( trimmed.includes("更新报价") || trimmed.includes("修改报价") || trimmed.includes("更新报价单") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_QUOTE", confidence: 0.9, parameters: params };
  }

  // Write: Create Order
  if ( trimmed.includes("创建订单") || trimmed.includes("新建订单") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_ORDER", confidence: 0.95, parameters: params };
  }

  // Write: Update Order
  if ( trimmed.includes("更新订单") || trimmed.includes("修改订单") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_ORDER", confidence: 0.9, parameters: params };
  }

  // Write: Create Invoice
  if ( trimmed.includes("创建发票") || trimmed.includes("新建发票") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "CREATE_INVOICE", confidence: 0.95, parameters: params };
  }

  // Write: Update Invoice
  if ( trimmed.includes("更新发票") || trimmed.includes("修改发票") ) {
    const params = extractWriteParams(trimmed);
    return { intent: "UPDATE_INVOICE", confidence: 0.9, parameters: params };
  }

  // ════════════════════════════════════════════════════════════════
  // BROAD WRITE DETECTION — catch natural language writes
  // that don't match specific patterns above but are clearly writes
  // ════════════════════════════════════════════════════════════════

  const detailQueryBeforeBroadWrite = extractEntityDetailQuery(trimmed);
  if (detailQueryBeforeBroadWrite) {
    return detailQueryBeforeBroadWrite;
  }

  const isLikelyWrite = detectWriteLikelihood(trimmed);
  if (isLikelyWrite) {
    const broadIntent = classifyLikelyWriteIntent(trimmed);
    if (broadIntent === "ADD_LEAD_FOLLOWUP") {
      return { intent: "ADD_LEAD_FOLLOWUP", confidence: 0.8, parameters: extractWriteParams(trimmed, true) };
    }
    if (broadIntent === "CREATE_LEAD") {
      return { intent: "CREATE_LEAD", confidence: 0.8, parameters: extractWriteParams(trimmed) };
    }
    return { intent: "UNKNOWN", confidence: 0.3, parameters: {} };
  }

  // ════════════════════════════════════════════════════════════════
  // QUERY INTENTS — require explicit query verbs
  // ════════════════════════════════════════════════════════════════

  const hasQueryVerb = /查询|查一下|找一下|显示|列出|看看|最近有哪些|告诉我|帮我查/.test(trimmed);

  const taskProjectQuery = extractTaskProjectQueryIntent(trimmed);
  if (taskProjectQuery) {
    return taskProjectQuery;
  }

  const detailQuery = extractEntityDetailQuery(trimmed);
  if (detailQuery) {
    return detailQuery;
  }

  if (hasQueryVerb && trimmed.includes("线索")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_LEADS", confidence: 0.9, parameters: params };
  }

  if (hasQueryVerb && trimmed.includes("订单")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_ORDERS", confidence: 0.9, parameters: params };
  }

  if (hasQueryVerb && trimmed.includes("报价")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_QUOTES", confidence: 0.9, parameters: params };
  }

  if (hasQueryVerb && trimmed.includes("客户")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_CUSTOMERS", confidence: 0.9, parameters: params };
  }

  if (hasQueryVerb && (trimmed.includes("任务") || trimmed.includes("待办"))) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_TASKS", confidence: 0.9, parameters: params };
  }

  // Unknown
  return { intent: "UNKNOWN", confidence: 0.3, parameters: {} };
}

function extractQuoteOrderFlowIntent(text: string): ParsedIntent | null {
  const sendQuote = parseSendQuoteIntent(text);
  if (sendQuote) return sendQuote;
  const quoteToOrder = parseQuoteToOrderIntent(text);
  if (quoteToOrder) return quoteToOrder;
  const acceptQuote = parseAcceptQuoteIntent(text);
  if (acceptQuote) return acceptQuote;
  const updateQuote = parseUpdateQuoteIntent(text);
  if (updateQuote) return updateQuote;
  const createQuote = parseCreateQuoteIntent(text);
  if (createQuote) return createQuote;
  const updateOrder = parseUpdateOrderIntent(text);
  if (updateOrder) return updateOrder;
  const implicitUpdateOrderStatus = parseImplicitUpdateOrderStatusIntent(text);
  if (implicitUpdateOrderStatus) return implicitUpdateOrderStatus;
  const createOrder = parseCreateOrderIntent(text);
  if (createOrder) return createOrder;
  return null;
}

function extractQuoteOrderQueryIntent(text: string): ParsedIntent | null {
  if (!/(查询|查看|看看|看一下|列出)/.test(text)) return null;
  const quoteReference: any = extractQuoteReference(text);
  if (isQuoteEntityText(text)) {
    if (quoteReference.id || quoteReference.number || quoteReference.useLastQuote || /详情|明细|数量|单价|完整|状态|金额|最新|最近/.test(text)) {
      return {
        intent: "QUERY_QUOTE_DETAIL",
        confidence: 0.92,
        parameters: {
          quoteReference,
          id: quoteReference.id,
          keyword: quoteReference.number || quoteReference.name,
          entityQuery: {
            entityReference: { id: quoteReference.id, number: quoteReference.number, name: quoteReference.customerName || quoteReference.name },
            requestedFields: ["quoteNumber", "customer", "status", "currency", "subtotal", "discount", "tax", "total", "validUntil", "items", "createdAt"],
            relation: quoteReference.name === "latest" ? "latest" : null,
          },
        },
      };
    }
    return { intent: "QUERY_QUOTES", confidence: 0.9, parameters: { keyword: extractCustomerName(text), quoteReference } };
  }
  const orderReference: any = extractOrderReference(text);
  if (/(订单|Order|(?:O|ORD)-[A-Za-z0-9-]+)/i.test(text)) {
    if (orderReference.id || orderReference.number || orderReference.useLastOrder || /详情|明细|完整|状态|金额|最新|最近/.test(text)) {
      return {
        intent: "QUERY_ORDER_DETAIL",
        confidence: 0.92,
        parameters: {
          orderReference,
          id: orderReference.id,
          keyword: orderReference.number || orderReference.name,
          entityQuery: {
            entityReference: { id: orderReference.id, number: orderReference.number, name: orderReference.name },
            requestedFields: ["orderNumber", "customer", "status", "currency", "total", "deliveryDate", "items", "createdAt"],
            relation: orderReference.name === "latest" ? "latest" : null,
          },
        },
      };
    }
    return { intent: "QUERY_ORDERS", confidence: 0.9, parameters: { keyword: extractCustomerName(text), orderReference, status: normalizeOrderStatus(text) } };
  }
  return null;
}

function parseCreateQuoteIntent(text: string): ParsedIntent | null {
  if (!isQuoteEntityText(text)) return null;
  if (!/(创建|新建|做一份|做一个|报价包含|每个|单价|给客户|为客户)/.test(text)) return null;
  if (/(发送|发出|接受|同意|转成|转为|改|修改|更新|标记)/.test(text)) return null;
  const customerName = extractCustomerName(text);
  const quote = extractCommercialTerms(text);
  const items = extractLineItems(text);
  const missingFields = collectMissingItemFields(items);
  const ambiguities = collectCurrencyAmbiguities(items, quote.currency as string | undefined);
  return {
    intent: "CREATE_QUOTE",
    confidence: 0.94,
    parameters: {
      customerReference: customerName ? { companyName: customerName } : undefined,
      projectReference: extractProjectReference(text),
      contactReference: extractContactReference(text),
      quote,
      items,
      missingFields,
      ambiguities,
    },
  };
}

function parseUpdateQuoteIntent(text: string): ParsedIntent | null {
  if (!isQuoteEntityText(text)) return null;
  if (!/(改|修改|更新|增加|删除|延长|有效期|折扣|运费|付款|交付|单价|价格)/.test(text)) return null;
  if (/(创建|新建|做一份|做一个)/.test(text)) return null;
  if (/(发送|发出|接受|同意|转成|转为)/.test(text)) return null;
  const changes: Record<string, unknown> = {};
  const validUntil = extractDate(text);
  if (/有效期|延长|截止/.test(text) && validUntil) changes.validUntil = validUntil;
  const discount = text.match(/(?:折扣改为|折扣|优惠|减免)(\d+(?:\.\d+)?)\s*%?/);
  if (discount) changes.discountValue = Number(discount[1]);
  const shipping = extractShippingFee(text);
  if (shipping !== undefined) changes.shippingFee = shipping;
  const unitPrice = text.match(/(?:单价|价格)(?:改为|调整为|为|到)?\s*(\d+(?:\.\d+)?)\s*(?:美元|欧元|人民币|元|USD|EUR|CNY)?/i);
  if (unitPrice) changes.unitPrice = Number(unitPrice[1]);
  const paymentTerms = text.match(/付款(?:条件|条款)?(?:改为|为)(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (paymentTerms) changes.paymentTerms = paymentTerms;
  return { intent: "UPDATE_QUOTE", confidence: 0.92, parameters: { quoteReference: extractQuoteReference(text), changes } };
}

function parseSendQuoteIntent(text: string): ParsedIntent | null {
  if (!isQuoteEntityText(text)) return null;
  if (!/(发送|发出|标记为已发送|已发送)/.test(text)) return null;
  return { intent: "SEND_QUOTE", confidence: 0.95, parameters: { quoteReference: extractQuoteReference(text) } };
}

function parseAcceptQuoteIntent(text: string): ParsedIntent | null {
  if (!isQuoteEntityText(text)) return null;
  if (!/(接受|同意|确认接受|客户接受|已接受)/.test(text)) return null;
  return { intent: "ACCEPT_QUOTE", confidence: 0.95, parameters: { quoteReference: extractQuoteReference(text) } };
}

function parseQuoteToOrderIntent(text: string): ParsedIntent | null {
  if (!isQuoteEntityText(text)) return null;
  if (!/(转成订单|转为订单|转订单|生成订单|创建订单|转换刚才那个报价)/.test(text)) return null;
  const quoteReference = extractQuoteReference(text);
  if (!quoteReference.id && !quoteReference.number && /已接受|接受|刚才|刚刚|那个|这个|上一个|最新/.test(text)) {
    quoteReference.useLastAcceptedQuote = true;
    delete quoteReference.useLastQuote;
  }
  return { intent: "CONVERT_QUOTE_TO_ORDER", confidence: 0.95, parameters: { quoteReference } };
}

function parseCreateOrderIntent(text: string): ParsedIntent | null {
  if (!/(订单|(?:O|ORD)-[A-Za-z0-9-]+)/i.test(text)) return null;
  if (!/(创建|新建|直接创建)/.test(text)) return null;
  if (/(改|修改|更新|状态|确认订单|生产中|发货|完成|取消)/.test(text)) return null;
  const customerName = extractCustomerName(text);
  const order: Record<string, unknown> = { ...extractCommercialTerms(text), deliveryDate: extractDate(text) || undefined };
  const items = extractLineItems(text);
  return {
    intent: "CREATE_ORDER",
    confidence: 0.94,
    parameters: {
      customerReference: customerName ? { companyName: customerName } : undefined,
      projectReference: extractProjectReference(text),
      contactReference: extractContactReference(text),
      order,
      items,
      missingFields: collectMissingItemFields(items),
      ambiguities: collectCurrencyAmbiguities(items, order.currency as string | undefined),
    },
  };
}

function parseUpdateOrderIntent(text: string): ParsedIntent | null {
  if (!/(订单|(?:O|ORD)-[A-Za-z0-9-]+)/i.test(text)) return null;
  if (!/(改|修改|更新|状态|确认|生产中|发货|完成|取消|备注|交货日期|付款)/.test(text)) return null;
  if (/(创建|新建|直接创建)/.test(text)) return null;
  const changes: Record<string, unknown> = {};
  const status = normalizeOrderStatus(text);
  if (status) changes.status = status;
  const deliveryDate = /交货|交付/.test(text) ? extractDate(text) : null;
  if (deliveryDate) changes.deliveryDate = deliveryDate;
  const paymentTerms = text.match(/付款(?:条件|条款)?(?:改为|为)(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (paymentTerms) changes.paymentTerms = paymentTerms;
  const note = text.match(/(?:备注|生产备注)(?:为|：|:)(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (note) changes.productionNotes = note;
  const orderReference: Record<string, unknown> = extractOrderReference(text);
  if (!orderReference.id && !orderReference.number && !orderReference.name && !orderReference.customerName) {
    orderReference.useLastOrder = true;
  }
  return { intent: "UPDATE_ORDER", confidence: 0.92, parameters: { orderReference, changes } };
}

function parseImplicitUpdateOrderStatusIntent(text: string): ParsedIntent | null {
  if (!/(改为|改成|更新为|标记为|设为|调整为)/.test(text)) return null;
  const status = normalizeOrderStatus(text);
  if (!status) return null;
  return {
    intent: "UPDATE_ORDER",
    confidence: 0.88,
    parameters: {
      orderReference: { useLastOrder: true },
      changes: { status },
    },
  };
}

function extractQuoteReference(text: string): Record<string, unknown> {
  const normalized = text.normalize("NFKC");
  const id = normalized.match(/(?:报价\s*ID|Quote\s*ID)\s*[:：]?\s*(\d+)/i)?.[1];
  const number = normalized.match(/Q[A-Z]?-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
  if (id) return { id };
  if (number) return { number };
  if (/刚才的?报价|刚才那个报价|这个报价|上一个报价|刚创建的?报价|最新报价/.test(text)) return { useLastQuote: true };
  const customer = extractCustomerName(text);
  return customer ? { customerName: customer, name: /最新/.test(text) ? "latest" : undefined } : {};
}

function isQuoteEntityText(text: string): boolean {
  if (/Q[A-Z]?-[A-Za-z0-9-]+|Quote\s*ID|报价\s*ID/i.test(text)) return true;
  if (/刚才的?报价|刚才那个报价|这个报价|上一个报价|刚创建的?报价|最新报价/.test(text)) return true;
  if (/报价中/.test(text) && /(项目|商机)/.test(text)) return false;
  if (/报价中/.test(text) && !/(创建报价|新建报价|报价单|发送报价|接受报价|报价转|报价编号|报价Q-|查询报价|查看报价|报价包含)/.test(text)) return false;
  if (/想要报价|希望.*报价|需要.*报价/.test(text) && !/(创建|新建|做一份|做一个|报价包含|每个|单价)/.test(text)) return false;
  return /(创建报价|新建报价|报价单|发送报价|接受报价|报价转|报价编号|查询报价|查看报价|报价包含|做一份报价|做一个报价|为客户.+报价|给客户.+报价)/.test(text);
}

function extractOrderReference(text: string): Record<string, unknown> {
  const normalized = text.normalize("NFKC");
  const id = normalized.match(/(?:订单\s*ID|Order\s*ID)\s*[:：]?\s*(\d+)/i)?.[1];
  const number = normalized.match(/(?:O|ORD)-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
  if (id) return { id };
  if (number) return { number };
  if (/刚才的订单|这个订单|上一个订单|刚创建的订单/.test(text)) return { useLastOrder: true };
  if (/最近|最新/.test(text)) {
    const name = cleanQuoteOrderName(text.replace(/查询|查看|看看|看一下|最近|最新|的?订单|订单/g, ""));
    return { name: name || "latest" };
  }
  return {};
}

function extractCustomerName(text: string): string | undefined {
  const patterns = [
    /给客户(.+?)(?:创建|做|报|报价|直接|新建|：|,|，)/,
    /为客户(.+?)(?:创建|做|报|报价|直接|新建|：|,|，)/,
    /客户([A-Za-z0-9_\-\u4e00-\u9fa5]+)(?:创建|做|报|报价|接受|确认|的|，|。|$)/,
    /，客户([A-Za-z0-9_\-\u4e00-\u9fa5]+)(?:，|。|$)/,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return cleanQuoteOrderName(value);
  }
  return undefined;
}

function extractProjectReference(text: string): Record<string, unknown> | undefined {
  const id = text.match(/项目\s*ID\s*(\d+)/i)?.[1];
  if (id) return { id };
  if (/刚才的项目|这个项目|刚创建的项目/.test(text)) return { useLastProject: true };
  return undefined;
}

function extractContactReference(text: string): Record<string, unknown> | undefined {
  const name = text.match(/联系人(?:改为|为|是)?([A-Za-z\u4e00-\u9fa5 ]+?)(?:，|。|$)/)?.[1]?.trim();
  return name ? { contactName: name } : undefined;
}

function extractCommercialTerms(text: string): Record<string, unknown> {
  const currency = extractCurrency(text);
  const shippingFee = extractShippingFee(text);
  const taxRate = text.match(/(?:税率|VAT)\s*(\d+(?:\.\d+)?)%/i)?.[1];
  const discountMatch = text.match(/(?:折扣|优惠|减免|打)(\d+(?:\.\d+)?)(?:%|折|美元|欧元|元)?/);
  const validDays = text.match(/有效期\s*(\d+)\s*天/)?.[1];
  return {
    currency,
    shippingFee,
    taxRate: taxRate ? Number(taxRate) : undefined,
    discountType: discountMatch?.[0]?.includes("%") || discountMatch?.[0]?.includes("折") ? "PERCENTAGE" : discountMatch ? "AMOUNT" : undefined,
    discountValue: discountMatch ? Number(discountMatch[1]) : undefined,
    validDays: validDays ? Number(validDays) : undefined,
    validUntil: /有效到|截止到/.test(text) ? extractDate(text) : undefined,
  };
}

function extractLineItems(text: string): Array<Record<string, unknown>> {
  const sharedQuantityItems = extractSharedQuantityLineItems(text);
  if (sharedQuantityItems.length > 0) return sharedQuantityItems;

  const normalized = text.replace(/；/g, ";");
  const segments = normalized.split(/;|。/).flatMap((part) => part.split(/报价包含两个产品：|报价包含|：/).slice(-1));
  const items: Array<Record<string, unknown>> = [];
  for (const segment of segments) {
    const match = segment.match(/([A-Za-z0-9\u4e00-\u9fa5_\-]+?(?:袋|封袋|产品|版费|食品四边封袋|四边封袋))\s*(\d+(?:\.\d+)?)\s*(个|pcs|kg|套|箱)?[^，,;。]*?(?:每个|单价)\s*(\d+(?:\.\d+)?)\s*(美元|欧元|人民币|元|USD|EUR|CNY)?/i);
    if (match) {
      items.push({
        productName: cleanQuoteOrderName(match[1]),
        quantity: Number(match[2]),
        unit: normalizeUnit(match[3]),
        unitPrice: Number(match[4]),
        currency: normalizeCurrencyWord(match[5]),
      });
      continue;
    }
    const loose = segment.match(/([A-Za-z0-9\u4e00-\u9fa5_\-]+?(?:袋|封袋|产品|版费|食品四边封袋|四边封袋))(?:(\d+(?:\.\d+)?)\s*(个|pcs|kg|套|箱))?/i);
    if (loose) {
      const price = segment.match(/(?:每个|单价)\s*(\d+(?:\.\d+)?)\s*(美元|欧元|人民币|元|USD|EUR|CNY)?/i);
      items.push({
        productName: cleanQuoteOrderName(loose[1]),
        quantity: loose[2] ? Number(loose[2]) : undefined,
        unit: normalizeUnit(loose[3]),
        unitPrice: price ? Number(price[1]) : undefined,
        currency: normalizeCurrencyWord(price?.[2]) || extractCurrency(segment),
      });
    }
  }
  if (items.length === 0 && /\d+(?:\.\d+)?/.test(text)) {
    const product = text.match(/(?:报价|订单)[：:]?(.+?)(?:\d+(?:\.\d+)?\s*(?:个|pcs|kg|套|箱)|，|,)/)?.[1]?.trim();
    const quantity = text.match(/(\d+(?:\.\d+)?)\s*(个|pcs|kg|套|箱)/i);
    const price = text.match(/(?:每个|单价)\s*(\d+(?:\.\d+)?)\s*(美元|欧元|人民币|元|USD|EUR|CNY)?/i);
    if (product || quantity || price) {
      items.push({
        productName: cleanQuoteOrderName(product || "报价项目"),
        quantity: quantity ? Number(quantity[1]) : undefined,
        unit: normalizeUnit(quantity?.[2]),
        unitPrice: price ? Number(price[1]) : undefined,
        currency: normalizeCurrencyWord(price?.[2]) || extractCurrency(text),
      });
    }
  }
  return items;
}

function extractSharedQuantityLineItems(text: string): Array<Record<string, unknown>> {
  const normalized = text.normalize("NFKC");
  const quantityMatch = normalized.match(/(?:各|每(?:个|款|种|规格)?|each|per)\s*(\d+(?:\.\d+)?)\s*(个|pcs|pieces?|units?)/i);
  if (!quantityMatch || quantityMatch.index === undefined) return [];

  const prefix = normalized.slice(0, quantityMatch.index);
  const specMatches = Array.from(prefix.matchAll(/(\d+(?:\.\d+)?)\s*(kg|公斤|千克|g|克|lb|lbs|oz)/gi));
  if (specMatches.length < 2) return [];

  const lastSpec = specMatches[specMatches.length - 1];
  const suffixStart = (lastSpec.index || 0) + lastSpec[0].length;
  const rawSuffix = prefix.slice(suffixStart);
  const productSuffix = cleanQuoteOrderName(rawSuffix.replace(/^(?:和|及|与|,|，|、|\/|and|\+|\s)+/i, ""));
  if (!productSuffix) return [];

  const price = normalized.match(/(?:单价|每个|unit\s*price|price)\s*(\d+(?:\.\d+)?)\s*(美元|美金|人民币|元|欧元|USD|EUR|CNY|RMB)?/i);
  const quantity = Number(quantityMatch[1]);
  const unit = normalizeUnit(quantityMatch[2]);
  const unitPrice = price ? Number(price[1]) : undefined;
  const currency = normalizeCurrencyWord(price?.[2]) || extractCurrency(normalized);

  return specMatches.map((spec) => ({
    productName: cleanQuoteOrderName(`${spec[1]}${spec[2]} ${productSuffix}`),
    quantity,
    unit,
    unitPrice,
    currency,
  }));
}

function collectMissingItemFields(items: Array<Record<string, unknown>>): string[] {
  const missing = new Set<string>();
  if (items.length === 0) missing.add("items");
  for (const item of items) {
    if (!item.productName) missing.add("productName");
    if (!item.quantity) missing.add("quantity");
    if (!item.unitPrice) missing.add("unitPrice");
    if (!item.currency) missing.add("currency");
  }
  return Array.from(missing);
}

function collectCurrencyAmbiguities(items: Array<Record<string, unknown>>, headerCurrency?: string): string[] {
  const currencies = new Set(items.map((item) => item.currency).filter(Boolean) as string[]);
  if (headerCurrency) currencies.add(headerCurrency);
  return currencies.size > 1 ? ["报价明细包含不同币种，请统一币种。"] : [];
}

function extractCurrency(text: string): string | undefined {
  if (/美元|美金|USD/i.test(text)) return "USD";
  if (/欧元|EUR/i.test(text)) return "EUR";
  if (/人民币|RMB|CNY/.test(text)) return "CNY";
  if (/美元|USD/i.test(text)) return "USD";
  if (/欧元|EUR/i.test(text)) return "EUR";
  if (/人民币|RMB|CNY/.test(text)) return "CNY";
  return undefined;
}

function normalizeCurrencyWord(value?: string): string | undefined {
  if (!value) return undefined;
  if (/美元|美金|USD/i.test(value)) return "USD";
  if (/欧元|EUR/i.test(value)) return "EUR";
  if (/人民币|RMB|CNY|元/.test(value)) return "CNY";
  if (/美元|USD/i.test(value)) return "USD";
  if (/欧元|EUR/i.test(value)) return "EUR";
  if (/人民币|RMB|CNY|元/.test(value)) return "CNY";
  return undefined;
}

function extractShippingFee(text: string): number | undefined {
  const value = text.match(/运费\s*(\d+(?:\.\d+)?)/)?.[1];
  return value ? Number(value) : undefined;
}

function extractDate(text: string): string | undefined {
  const now = new Date();
  const monthDay = text.match(/(\d{1,2})月(\d{1,2})日?/);
  if (monthDay) {
    return new Date(now.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2]), 9).toISOString();
  }
  const days = text.match(/(\d+)\s*天/)?.[1];
  if (days) {
    const date = new Date(now);
    date.setDate(date.getDate() + Number(days));
    return date.toISOString();
  }
  return undefined;
}

function normalizeOrderStatus(text: string): string | undefined {
  if (/待确认|待客户确认/.test(text)) return "PENDING_CONFIRMATION";
  if (/生产中|开始生产/.test(text)) return "IN_PRODUCTION";
  if (/已确认|确认订单|状态改为确认/.test(text)) return "CONFIRMED";
  if (/待发货/.test(text)) return "READY_TO_SHIP";
  if (/已发货|发货/.test(text)) return "SHIPPED";
  if (/已完成|完成/.test(text)) return "COMPLETED";
  if (/取消/.test(text)) return "CANCELLED";
  return undefined;
}

function normalizeUnit(value?: string): string {
  if (!value) return "pcs";
  if (/^(个|pcs|pieces?|units?)$/i.test(value)) return "pcs";
  if (value === "个") return "pcs";
  return value;
}

function cleanQuoteOrderName(value: string): string {
  return value
    .replace(/^(给|为|客户|报价|订单|创建|新建|做一份|做一个)+/g, "")
    .replace(/[，。！？；：:、]+$/g, "")
    .trim();
}

export function normalizeMessage(text: string): string {
  return text
    .replace(/@_user_\d+/g, "")
    .replace(/\[([^\]]+)\]\(mailto:\1\)/gi, "$1")
    .trim();
}

function extractTaskProjectFlowIntent(text: string): ParsedIntent | null {
  const updateTask = parseUpdateTaskIntent(text);
  if (updateTask) return updateTask;
  const completeTask = parseCompleteTaskIntent(text);
  if (completeTask) return completeTask;
  const createProject = parseCreateProjectIntent(text);
  if (createProject) return createProject;
  const updateProject = parseUpdateProjectIntent(text);
  if (updateProject) return updateProject;
  const createTask = parseCreateTaskIntent(text);
  if (createTask) return createTask;
  return null;
}

function extractExplicitTaskId(text: string): string | undefined {
  const normalized = text.normalize("NFKC");
  return normalized.match(/(?:任务\s*ID|Task\s*ID)\s*[:：#]?\s*(\d+)/i)?.[1]
    || normalized.match(/task\s*#\s*(\d+)/i)?.[1]
    || normalized.match(/任务\s*编号\s*[:：]?\s*(\d+)/)?.[1]
    || normalized.match(/完成\s*(\d+)\s*号\s*任务/)?.[1]
    || normalized.match(/ID\s*为\s*(\d+)\s*的?\s*任务/)?.[1];
}

function extractTaskProjectQueryIntent(text: string): ParsedIntent | null {
  const hasQuery = /(查询|查看|看看|看一下|列出|有哪些|有几个)/.test(text);
  if (!hasQuery) return null;

  if (/(项目|商机)/.test(text)) {
    const id = text.match(/项目ID\s*(\d+)/i)?.[1];
    const customerProjectQuery = text.match(/(?:查询|查看|看看|看一下)?(.+?)的项目(?:、项目阶段)?(?:和|及|与)?.*任务/);
    const includeTasks = /任务|待办/.test(text);
    if (id || /完整信息|详情|状态|阶段|金额|概率|下一步/.test(text)) {
      return {
        intent: id ? "QUERY_PROJECT_DETAIL" : "QUERY_PROJECTS",
        confidence: 0.9,
        parameters: {
          id,
          keyword: id ? undefined : cleanTaskProjectName(customerProjectQuery?.[1] || text.replace(/查询|查看|看看|看一下|列出|有哪些|有几个|的?商机项目|项目|完整信息|详情/g, "")),
          projectReference: id ? { id } : undefined,
          includeTasks,
          stage: normalizeProjectStage(text),
          minAmount: extractAmount(text)?.amount,
          dateScope: /本月/.test(text) ? "THIS_MONTH" as any : undefined,
        },
      };
    }
    return {
      intent: "QUERY_PROJECTS",
      confidence: 0.9,
      parameters: {
        keyword: cleanTaskProjectName(customerProjectQuery?.[1] || text.replace(/查询|查看|看看|看一下|列出|有哪些|有几个|的?商机项目|项目/g, "")),
        includeTasks,
        stage: normalizeProjectStage(text),
        minAmount: extractAmount(text)?.amount,
        dateScope: /本月/.test(text) ? "THIS_MONTH" as any : undefined,
      },
    };
  }

  if (/(任务|待办)/.test(text)) {
    const id = extractExplicitTaskId(text);
    if (id || /完整信息|详情|截止时间|优先级|状态/.test(text) && !/今天|明天|逾期|本周|未来|所有|哪些/.test(text)) {
      return {
        intent: "QUERY_TASK_DETAIL",
        confidence: 0.9,
        parameters: {
          id,
          taskReference: id ? { id } : undefined,
          entityQuery: {
            entityReference: {
              id,
              name: id ? undefined : text.match(/任务[“"「](.+?)[”"」]/)?.[1],
            },
            requestedFields: [
              ...(/截止时间|截止|到期/.test(text) ? ["dueAt"] : []),
              ...(/优先级/.test(text) ? ["priority"] : []),
              ...(/状态/.test(text) ? ["status"] : []),
            ],
            missingFields: [],
            ambiguities: [],
            relation: null,
          },
        },
      };
    }
    return {
      intent: "QUERY_TASKS",
      confidence: 0.9,
      parameters: {
        dateScope: /今天/.test(text) ? "TODAY" : /明天/.test(text) ? "TOMORROW" as any : /逾期/.test(text) ? "OVERDUE" : /未来7天|一周/.test(text) ? "UPCOMING" : "ALL",
        statusScope: /已完成/.test(text) ? "COMPLETED" : /未完成/.test(text) ? "UNFINISHED" : "ALL",
        priority: normalizeTaskPriority(text),
        keyword: cleanTaskProjectName(text.replace(/查询|查看|看看|看一下|列出|今天|明天|本周|未来7天|逾期|已完成|未完成|高优先级|紧急|所有|关联的?任务|任务|待办/g, "")),
      },
    };
  }

  return null;
}

function parseCreateTaskIntent(text: string): ParsedIntent | null {
  if (/(新增|创建|添加|新建).*线索/.test(text) || /联系人/.test(text)) return null;
  if (/(添加跟进|新增跟进|记录.*跟进|跟进[：:])/.test(text) && !/(任务|提醒|安排)/.test(text)) return null;
  if (/(刚|已经|已).{0,30}(打电话|联系|发邮件|沟通)/.test(text)) return null;
  const isTaskText = /(提醒我|安排我|建一个任务|创建.*任务|新建.*任务|跟进任务|打电话给|联系线索|联系客户|联系.+|发报价)/.test(text);
  if (!isTaskText || /(查询|查看|看看|完成任务|改为|延期|修改)/.test(text)) return null;

  const dueAt = parseChineseDateTime(text);
  let relatedEntity = extractRelatedEntity(text);
  const quotedTitle = text.match(/任务[：:]\s*(.+?)(?:，|。|$)/)?.[1]?.trim();
  let title = quotedTitle || "";
  const contactTarget = text.match(/联系([A-Za-z0-9_\-\u4e00-\u9fa5]+)(?:，|。|$)/)?.[1]?.trim();
  if (!relatedEntity && contactTarget) {
    relatedEntity = { type: "Customer", name: cleanTaskProjectName(contactTarget) };
  }
  if (!title) {
    if (/这个项目|该项目|刚才的项目|刚创建的项目|上一个项目/.test(text)) {
      const action = text.match(/(?:创建|新建|建)(?:一个|一条)?(?:明天|今天|后天|下周[一二三四五六日天]|上午|下午|\d+点)*\s*(?:的)?(.+?)(?:的)?(?:高优先级|低优先级|紧急|普通)?任务/)?.[1]
        || text.match(/(?:明天|今天|后天|下周[一二三四五六日天]|上午|下午|\d+点)*\s*(.+?)(?:的)?(?:高优先级|低优先级|紧急|普通)?任务/)?.[1];
      title = cleanTaskProjectName(action || "跟进");
      relatedEntity = { type: "Project", useLastProject: true };
    }
    if (/打电话/.test(text)) title = `打电话给${extractNameAfter(text, /打电话给/) || relatedEntity?.name || ""}`.trim();
    else if (/发报价/.test(text)) title = `给${relatedEntity?.name || extractNameAfter(text, /给/) || ""}发报价`.trim();
    else if (/联系/.test(text)) title = `联系${relatedEntity?.name || extractNameAfter(text, /联系/) || ""}`.trim();
    else if (/跟进/.test(text)) title = `跟进${relatedEntity?.name || ""}`.trim();
  }
  title = cleanTaskProjectName(title);

  return {
    intent: "CREATE_TASK",
    confidence: 0.92,
    parameters: {
      task: {
        title: title || undefined,
        description: quotedTitle && title !== quotedTitle ? quotedTitle : undefined,
        priority: normalizeTaskPriority(text) || "MEDIUM",
        dueAt,
        status: "PENDING",
      },
      relatedEntity,
      missingFields: [
        ...(title ? [] : ["title"]),
        ...(dueAt ? [] : ["dueAt"]),
      ],
    },
  };
}

function parseUpdateTaskIntent(text: string): ParsedIntent | null {
  const linkMatch = text.normalize("NFKC").match(/把任务\s*ID\s*[:：]?\s*(\d+)\s*关联到项目\s*ID\s*[:：]?\s*(\d+)/i);
  if (linkMatch) {
    return {
      intent: "UPDATE_TASK",
      confidence: 0.95,
      parameters: {
        taskReference: { id: linkMatch[1] },
        changes: { relatedEntity: { type: "Project", id: linkMatch[2] } },
      },
    };
  }

  if (!/(任务|待办)/.test(text) || /(完成任务|做完|已经做完|标记为已完成)/.test(text)) return null;
  if (!/(延期|改为|改到|修改|补充备注|状态改为|标题为|关联到)/.test(text)) return null;

  const id = extractExplicitTaskId(text);
  const recentTarget = text.match(/刚才联系(.+?)的任务/)?.[1]?.trim();
  const useLastTask = !!recentTarget || /(刚才的任务|这个任务|上一个任务|刚创建的任务|刚延期的任务)/.test(text);
  const titleRef = recentTarget ? `联系${recentTarget}` : text.match(/任务[“"「]?(.+?)[”"」]?(?:延期|改|补充|状态|关联|$)/)?.[1]?.trim();
  const changes: Record<string, unknown> = {};
  const dueAt = parseChineseDateTime(text);
  if (dueAt) changes.dueAt = dueAt;
  const priority = normalizeTaskPriority(text);
  if (priority) changes.priority = priority;
  const status = normalizeTaskStatus(text);
  if (status) changes.status = status;
  const newTitle = text.match(/标题(?:改为|为)\s*(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (newTitle) changes.title = cleanTaskProjectName(newTitle);
  const description = text.match(/备注[：:]?\s*(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (description) changes.description = description;

  return {
    intent: "UPDATE_TASK",
    confidence: 0.9,
    parameters: {
      taskReference: id ? { id } : useLastTask ? { useLastTask: true } : { title: titleRef ? cleanTaskProjectName(titleRef) : undefined },
      changes,
      missingFields: [id || titleRef || useLastTask ? "" : "task"].filter(Boolean),
    },
  };
}

function parseCompleteTaskIntent(text: string): ParsedIntent | null {
  if (/(查询|查看|看看|看一下|列出)/.test(text)) return null;
  const id = extractExplicitTaskId(text);
  if (!/(完成任务|完成\s*\d+\s*号任务|标记为已完成|已经做完|做完了)/.test(text) && !(id && /完成|已完成/.test(text))) return null;
  const useLastTask = /(刚才的任务|这个任务|上一个任务|刚创建的任务|刚延期的任务)/.test(text);
  const title = text.match(/(?:完成|把)(.+?)(?:的任务|任务|标记|已经|做完)/)?.[1]?.trim();
  return {
    intent: "COMPLETE_TASK",
    confidence: 0.92,
    parameters: {
      taskReference: id ? { id } : useLastTask ? { useLastTask: true } : { title: title ? cleanTaskProjectName(title) : undefined },
      changes: { status: "COMPLETED", completedAt: new Date().toISOString() },
    },
  };
}

function parseCreateProjectIntent(text: string): ParsedIntent | null {
  if (!/(创建|新建|建).*?(项目|商机)|给.+新建.*?(项目|商机)|为线索.+创建商机|为客户.+创建/.test(text) || /(查询|查看|更新|改为|标记)/.test(text)) return null;
  const relatedEntity = extractRelatedEntity(text);
  const amount = extractAmount(text);
  const stage = normalizeProjectStage(text) || "REQUIREMENT_CONFIRMING";
  const quotedName = text.match(/项目[：:]\s*(.+?)(?:，|。|$)/)?.[1]?.trim();
  let name = quotedName || text.match(/(?:创建|新建|建).*?一个?(.+?(?:项目|商机))/)?.[1]?.trim() || "";
  if (!name) name = text.match(/给(.+?)新建.*?(?:项目|商机)/)?.[1]?.trim() || "";
  if (!name && relatedEntity?.name) name = `${relatedEntity.name}项目`;
  name = cleanTaskProjectTitle(name.replace(/^为?(客户|线索)?/, ""));

  return {
    intent: "CREATE_PROJECT",
    confidence: 0.92,
    parameters: {
      project: {
        name: name || undefined,
        description: undefined,
        stage,
        estimatedAmount: amount?.amount,
        currency: amount?.currency,
        expectedCloseAt: /月底/.test(text) ? endOfCurrentMonthIso() : parseChineseDateTime(text),
      },
      relatedEntity,
      missingFields: [
        ...(name ? [] : ["name"]),
        ...(relatedEntity?.name || relatedEntity?.id ? [] : ["relatedEntity"]),
      ],
    },
  };
}

function parseUpdateProjectIntent(text: string): ParsedIntent | null {
  if (!/(项目|商机)/.test(text) || !/(改为|改到|更新|标记|丢单|赢单|阶段|金额|概率|下一步|预计)/.test(text)) return null;
  const useLastProject = /(刚才创建的项目|刚创建的项目|刚才的项目|这个项目|上一个项目|刚查询的项目)/.test(text);
  if (!useLastProject && /(创建|新建|建).*(项目|商机)/.test(text)) return null;
  if (/(查询|查看|看看)/.test(text)) return null;
  const id = text.match(/项目ID\s*(\d+)/i)?.[1];
  const projectWithCustomer = text.match(/把(.+?)的(.+?(?:项目|商机))(?:阶段|预计|成交|下一步|金额|$)/);
  const customerName = projectWithCustomer?.[1]?.trim();
  const name = useLastProject ? undefined : (projectWithCustomer?.[2]?.trim() || text.match(/把(.+?)(?:项目|商机).*?(?:改为|改到|更新|标记)/)?.[1]?.trim());
  const amount = extractAmount(text);
  const changes: Record<string, unknown> = {};
  const stage = normalizeProjectStage(text);
  if (stage) changes.stage = stage;
  if (amount) {
    changes.estimatedAmount = amount.amount;
    changes.currency = amount.currency;
  }
  const probability = text.match(/(\d{1,3})\s*%/)?.[1];
  if (probability) changes.probability = Number(probability);
  const nextAction = text.match(/下一步动作为\s*(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (nextAction) changes.nextAction = nextAction;
  if (/月底/.test(text)) changes.expectedCloseAt = endOfCurrentMonthIso();
  const due = parseChineseDateTime(text);
  if (due && /预计成交|成交时间/.test(text)) changes.expectedCloseAt = due;
  const lossReason = text.match(/原因是\s*(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (lossReason) changes.lossReason = lossReason;

  return {
    intent: "UPDATE_PROJECT",
    confidence: 0.9,
    parameters: {
      projectReference: useLastProject ? { id, useLastProject: true } : { id, customerName: customerName ? cleanTaskProjectName(customerName) : undefined, name: name ? cleanTaskProjectTitle(name) : undefined },
      changes,
      missingFields: [id || name || useLastProject ? "" : "project"].filter(Boolean),
    },
  };
}

function extractRelatedEntity(text: string): Record<string, unknown> | undefined {
  const projectId = text.match(/项目ID\s*(\d+)/i)?.[1];
  if (projectId) return { type: "Project", id: projectId };
  const quotedProject = text.match(/项目[“"「](.+?)[”"」]/)?.[1];
  if (quotedProject) return { type: "Project", name: quotedProject };
  const projectName = text.match(/为项目(.+?)创建/)?.[1]?.trim();
  if (projectName) return { type: "Project", name: cleanTaskProjectName(projectName) };
  const leadName = text.match(/(?:线索)(.+?)(?:创建|联系|关联|，|。|$)/)?.[1]?.trim();
  if (leadName) return { type: "Lead", name: cleanTaskProjectName(leadName) };
  const customerName = text.match(/(?:客户)(.+?)(?:创建|新建|安排|联系|，|。|$)/)?.[1]?.trim();
  if (customerName) return { type: "Customer", name: cleanTaskProjectName(customerName) };
  const relatedCustomer = text.match(/关联客户(.+?)(?:，|。|$)/)?.[1]?.trim();
  if (relatedCustomer) return { type: "Customer", name: cleanTaskProjectName(relatedCustomer) };
  return undefined;
}

function extractNameAfter(text: string, marker: RegExp): string | undefined {
  const index = text.search(marker);
  if (index < 0) return undefined;
  const rest = text.slice(index).replace(marker, "");
  return cleanTaskProjectName(rest.split(/[，。]/)[0] || "");
}

function cleanTaskProjectName(value: string | undefined): string {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[“”"「」]/g, "")
    .replace(/^(客户|线索|项目|商机|任务|一个|一条|的|为)+/, "")
    .replace(/(创建|新建|建一个|跟进任务|项目|商机|任务|关联的|完整信息|详情)$/g, "")
    .replace(/[，。！？；：:]+$/g, "")
    .trim();
}

function cleanTaskProjectTitle(value: string | undefined): string {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[“”「」]/g, "")
    .replace(/^(客户|线索|任务|一个|一条|的|为)+/, "")
    .replace(/(创建|新建|建一个|跟进任务|关联的|完整信息|详情)$/g, "")
    .replace(/[，。！？；：]+$/g, "")
    .trim();
}

function normalizeTaskPriority(text: string): string | undefined {
  if (/紧急|马上|最优先/.test(text)) return "URGENT";
  if (/高优先级|重要|优先级高/.test(text)) return "HIGH";
  if (/低优先级|不急/.test(text)) return "LOW";
  if (/一般|普通|中优先级/.test(text)) return "MEDIUM";
  return undefined;
}

function normalizeTaskStatus(text: string): string | undefined {
  if (/进行中/.test(text)) return "IN_PROGRESS";
  if (/已完成|完成/.test(text)) return "COMPLETED";
  if (/已取消|取消/.test(text)) return "CANCELLED";
  if (/待处理|未开始/.test(text)) return "PENDING";
  return undefined;
}

function normalizeProjectStage(text: string): string | undefined {
  if (/需求确认|需求已明确/.test(text)) return "REQUIREMENT_CONFIRMING";
  if (/报价中|已报价/.test(text)) return "QUOTING";
  if (/样品确认|等样品/.test(text)) return "SAMPLE_TESTING";
  if (/方案沟通|讨论方案/.test(text)) return "WAITING_FEEDBACK";
  if (/谈判|谈价格/.test(text)) return "NEGOTIATING";
  if (/赢单|已成交/.test(text)) return "WON";
  if (/丢单|已丢单|客户拒绝/.test(text)) return "LOST";
  if (/暂停|暂时不推/.test(text)) return "PAUSED";
  return undefined;
}

function extractAmount(text: string): { amount: number; currency: string } | undefined {
  if (!/(金额|预算|预计|美元|美金|人民币|欧元|EUR|USD|CNY)/i.test(text)) return undefined;
  const matches = [...text.matchAll(/(?:EUR|USD|CNY)?\s*(\d+(?:\.\d+)?)\s*(万)?\s*(美元|美金|人民币|元|欧元|EUR|USD|CNY)?/gi)]
    .filter((m) => m[3] || /金额|预算|预计/.test(text.slice(Math.max(0, m.index! - 8), m.index! + m[0].length + 8)));
  const match = matches[matches.length - 1];
  if (!match) return undefined;
  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return undefined;
  const amount = match[2] ? raw * 10000 : raw;
  const currencyText = (match[3] || text.match(/\b(EUR|USD|CNY)\b/i)?.[1] || "").toUpperCase();
  const currency = /美元|美金|USD/.test(currencyText) ? "USD" : /欧元|EUR/.test(currencyText) ? "EUR" : /人民币|CNY|元/.test(currencyText) ? "CNY" : "USD";
  return { amount, currency };
}

function parseChineseDateTime(text: string): string | undefined {
  const now = new Date();
  let date: Date | undefined;
  if (/后天/.test(text)) date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  else if (/明天/.test(text)) date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  else if (/今天/.test(text)) date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (/三天后/.test(text)) date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
  else if (/一周后/.test(text)) date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  else {
    const nextWeek = text.match(/下周([一二三四五六日天])/);
    if (nextWeek) {
      const target = "一二三四五六日天".indexOf(nextWeek[1]) % 7 || 7;
      const current = now.getDay() || 7;
      const delta = 7 - current + target;
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
    }
  }
  if (!date) {
    const md = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (md) date = new Date(now.getFullYear(), Number(md[1]) - 1, Number(md[2]));
  }
  if (!date) return undefined;
  let hour = /下午|晚上/.test(text) ? 15 : /上午/.test(text) ? 9 : 9;
  const explicitHour = text.match(/(\d{1,2})点/);
  if (explicitHour) {
    hour = Number(explicitHour[1]);
    if (/下午|晚上/.test(text) && hour < 12) hour += 12;
  }
  date.setHours(hour, 0, 0, 0);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

function endOfCurrentMonthIso(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 18, 0, 0, 0);
  const yyyy = end.getFullYear();
  const mm = String(end.getMonth() + 1).padStart(2, "0");
  const dd = String(end.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} 18:00`;
}

export function detectWriteLikelihood(text: string): boolean {
  // Broad patterns that indicate a write intent even without matching specific keywords
  const writePatterns = [
    /帮我新增/,
    /帮我录入/,
    /帮我创建/,
    /帮我添加/,
    /新增.*线索/,
    /添加.*线索/,
    /创建.*线索/,
    /录入.*询盘/,
    /录入.*新询盘/,
    /新.*客户/,
    /新.*线索/,
    /新.*询盘/,
    /有个客户/,
    /来了.*询盘/,
    /公司想采购/,
    /客户想采购/,
    /我刚联系了/,
    /我刚给.+打了电话/,
    /我给.+发了邮件/,
    /我通过.+联系了/,
    /记录一下/,
    /记录跟进/,
    /添加跟进/,
    /新增跟进/,
    /我刚.*联系/,
    /客户回复了/,
    /明天再联系/,
    /下次跟进/,
    /改为/,
    /改成/,
    /更新为/,
    /换成/,
    /设为/,
    /调整为/,
    /更新一下/,
    /已经联系上了/,
    /已经不考虑了/,
    /录入/,
  ];
  return writePatterns.some(p => p.test(text));
}

function classifyLikelyWriteIntent(text: string): WriteIntent | "UNKNOWN" {
  const createSignals = [
    "新增",
    "新建",
    "创建",
    "录入",
    "新询盘",
    "新客户",
    "客户线索",
    "公司叫",
  ];
  const leadSignals = ["线索", "询盘", "客户"];
  const followUpSignals = [
    "我刚给",
    "我刚联系",
    "刚联系",
    "打了电话",
    "发了邮件",
    "记录一下",
    "记录跟进",
    "添加跟进",
    "新增跟进",
    "再联系",
    "客户回复",
  ];

  if (createSignals.some((signal) => text.includes(signal)) && leadSignals.some((signal) => text.includes(signal))) {
    return "CREATE_LEAD";
  }

  if (followUpSignals.some((signal) => text.includes(signal))) {
    return "ADD_LEAD_FOLLOWUP";
  }

  if (isUpdateLeadText(text)) {
    return "UPDATE_LEAD";
  }

  return "UNKNOWN";
}

function extractCompoundIntent(text: string): ParsedIntent | null {
  const connectors = /(?:然后|并且|同时|顺便|另外|之后|接着|\band\b|\bthen\b|\balso\b)/i;
  if (!connectors.test(text)) return null;

  const parts = text.split(connectors).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const actions: NonNullable<ParsedIntent["parameters"]["actions"]> = [];
  let priorEntityName: string | null = null;

  for (const part of parts) {
    const deleteAction = parseBlockedDeleteAction(part);
    if (deleteAction) {
      actions.push(deleteAction);
      continue;
    }

    const action = parseFeishuIntent(part);
    if (action.intent === "UNKNOWN" && /(?:删除|删掉|移除)/.test(part)) {
      actions.push({
        intent: "DELETE",
        confidence: 0.9,
        parameters: {},
        blockedReason: "删除操作永久禁止，请在CRM网页中按权限流程处理。",
      });
      continue;
    }

    if (action.intent === "UNKNOWN") continue;

    const actionParams = { ...action.parameters };
    if (actionParams.entityQuery?.entityReference?.name) {
      priorEntityName = actionParams.entityQuery.entityReference.name;
    }
    if (
      actionParams.updateLead
      && priorEntityName
      && (
        !actionParams.updateLead.leadReference.companyName
        || ["把", "将"].includes(String(actionParams.updateLead.leadReference.companyName))
      )
    ) {
      actionParams.updateLead = {
        ...actionParams.updateLead,
        leadReference: {
          ...actionParams.updateLead.leadReference,
          companyName: priorEntityName,
        },
      };
    }

    actions.push({
      intent: action.intent,
      confidence: action.confidence,
      parameters: actionParams as Record<string, any>,
      requiresConfirmation: isCompoundWriteIntent(action.intent),
    });
  }

  const hasRead = actions.some((action) => action.intent.startsWith("QUERY_"));
  const hasWriteOrBlocked = actions.some((action) => isCompoundWriteIntent(action.intent) || action.blockedReason);
  if (!hasRead || !hasWriteOrBlocked) return null;

  return {
    intent: "COMPOUND_QUERY_AND_UPDATE",
    confidence: 0.9,
    parameters: { actions },
  };
}

function parseBlockedDeleteAction(text: string): NonNullable<ParsedIntent["parameters"]["actions"]>[number] | null {
  if (!/(?:删除|删掉|移除)/.test(text)) return null;
  return {
    intent: "DELETE",
    confidence: 0.9,
    parameters: {},
    blockedReason: "删除操作永久禁止，请在CRM网页中按权限流程处理。",
  };
}

function isCompoundWriteIntent(intent: string): boolean {
  return [
    "CREATE_LEAD",
    "UPDATE_LEAD",
    "ADD_LEAD_FOLLOWUP",
    "CONVERT_LEAD_TO_CUSTOMER",
    "CREATE_CUSTOMER",
    "UPDATE_CUSTOMER",
    "CREATE_CONTACT",
    "UPDATE_CONTACT",
    "SET_PRIMARY_CONTACT",
    "ADD_CUSTOMER_FOLLOWUP",
    "CREATE_TASK",
    "UPDATE_TASK",
    "COMPLETE_TASK",
    "CREATE_PROJECT",
    "UPDATE_PROJECT",
    "CREATE_QUOTE",
    "UPDATE_QUOTE",
    "SEND_QUOTE",
    "ACCEPT_QUOTE",
    "CONVERT_QUOTE_TO_ORDER",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "UPDATE_ORDER_STATUS",
    "CREATE_INVOICE",
    "UPDATE_INVOICE",
    "RECORD_PAYMENT",
  ].includes(intent);
}

function extractCustomerFlowWriteIntent(text: string): ParsedIntent | null {
  const normalized = normalizeMessage(text);

  if (/^(?:把|将)?(?:刚才|刚创建|刚刚|这个|该|当前|上一个)?(?:的)?(?:线索)?转(?:成|为)?客户[。.!！]?$/.test(normalized)) {
    return {
      intent: "CONVERT_LEAD_TO_CUSTOMER",
      confidence: 0.95,
      parameters: {
        leadReference: { useLastLead: true },
      },
    };
  }

  const exactConvert = normalized.match(/^把线索(.+?)转成客户[。.!！]?$/);
  if (exactConvert) {
    const companyName = cleanDomainEntityName(exactConvert[1]);
    return {
      intent: "CONVERT_LEAD_TO_CUSTOMER",
      confidence: 0.98,
      parameters: {
        leadReference: { companyName },
        keyword: companyName || undefined,
        exactName: companyName || undefined,
      },
    };
  }

  const exactCreateCustomer = normalized.match(/(?:创建一个正式客户|创建正式客户|创建客户).*?公司叫([^，。]+).*?主联系人([^，。]+).*?(美国|中国|加拿大)?(?:，|,).*?邮箱\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}).*?电话\s*([+]?\d[\d\s().-]{5,})/);
  if (exactCreateCustomer) {
    const company = cleanDomainEntityName(exactCreateCustomer[1]);
    const contactName = cleanupExtractedValue(exactCreateCustomer[2]);
    const country = exactCreateCustomer[3] || extractCountry(normalized);
    const email = cleanTrailingPunctuation(exactCreateCustomer[4]);
    const phone = cleanTrailingPunctuation(exactCreateCustomer[5]);
    return {
      intent: "CREATE_CUSTOMER",
      confidence: 0.98,
      parameters: {
        customerInput: {
          company,
          country,
          email,
          phone,
          businessLineName: extractAfterLabel(normalized, "业务线"),
          primaryContact: { name: contactName, email, phone },
        },
        keyword: company || undefined,
        contactName: contactName || undefined,
        email,
        phone,
        country: country || undefined,
      },
    };
  }

  const exactCreateContact = normalized.match(/^给客户(.+?)新增一个(?:采购|财务|销售)?联系人([^，。]+).*?邮箱\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}).*?电话\s*([+]?\d[\d\s().-]{5,}).*?职位是([^，。]+)[。.!！]?$/);
  if (exactCreateContact) {
    const companyName = cleanDomainEntityName(exactCreateContact[1]);
    const name = cleanupExtractedValue(exactCreateContact[2]);
    const email = cleanTrailingPunctuation(exactCreateContact[3]);
    const phone = cleanTrailingPunctuation(exactCreateContact[4]);
    const title = cleanupExtractedValue(exactCreateContact[5]);
    return {
      intent: "CREATE_CONTACT",
      confidence: 0.98,
      parameters: {
        customerReference: { companyName },
        contactInput: { name, email, phone, title, department: normalized.includes("采购联系人") ? "采购" : null, isPrimary: false },
        exactName: companyName || undefined,
        contactName: name || undefined,
        email,
        phone,
      },
    };
  }

  const exactSetPrimary = normalized.match(/^把(.+?)的(.+?)设为主联系人[。.!！]?$/);
  if (exactSetPrimary) {
    const companyName = cleanDomainEntityName(exactSetPrimary[1]);
    const contactName = cleanupExtractedValue(exactSetPrimary[2]);
    return {
      intent: "SET_PRIMARY_CONTACT",
      confidence: 0.98,
      parameters: {
        customerReference: { companyName },
        contactReference: { contactName },
        exactName: companyName || undefined,
        contactName: contactName || undefined,
      },
    };
  }

  const exactUpdateCustomer = normalized.match(/^把客户(.+?)的等级改为([A-DＡ-Ｄ])级，电话改为([+]?\d[\d\s().-]{5,})，(今天|明天|下周[一二三四五六日天])再跟进[。.!！]?$/);
  if (exactUpdateCustomer) {
    const companyName = cleanDomainEntityName(exactUpdateCustomer[1]);
    const changes = normalizeCustomerChangesForParser({
      grade: exactUpdateCustomer[2],
      phone: cleanTrailingPunctuation(exactUpdateCustomer[3]),
      nextFollowUpAt: exactUpdateCustomer[4],
    });
    return {
      intent: "UPDATE_CUSTOMER",
      confidence: 0.98,
      parameters: {
        customerReference: { companyName },
        customerChanges: changes,
        keyword: companyName || undefined,
      },
    };
  }

  if (/(转成客户|转为客户|转客户|转换为客户|变成正式客户)/.test(normalized)) {
    const companyName = extractCompanyNameForWrite(normalized, ["转成客户", "转为客户", "转客户", "转换为客户", "变成正式客户", "已经确认合作"]);
    return {
      intent: "CONVERT_LEAD_TO_CUSTOMER",
      confidence: 0.96,
      parameters: {
        leadReference: {
          id: extractId(normalized, "线索"),
          companyName,
          contactName: extractAfterLabel(normalized, "联系人"),
          email: extractEmail(normalized),
          phone: extractPhone(normalized),
        },
        ...(companyName ? { keyword: companyName, exactName: companyName } : {}),
      },
    };
  }

  if (/(设为主联系人|设置为主联系人|主联系人改为|主联系人换成)/.test(normalized)) {
    const customerName = extractCompanyNameForWrite(normalized, ["的", "主联系人"]);
    const contactName = extractAfterAny(normalized, ["设为主联系人", "设置为主联系人", "主联系人改为", "主联系人换成"]);
    return {
      intent: "SET_PRIMARY_CONTACT",
      confidence: 0.93,
      parameters: {
        customerReference: { companyName: customerName },
        contactReference: { id: extractId(normalized, "联系人"), contactName },
        exactName: customerName || undefined,
        contactName: contactName || undefined,
      },
    };
  }

  if (/(新增联系人|添加联系人|再添加.*联系人|加一个.*联系人|创建联系人)/.test(normalized)) {
    const customerName = extractCompanyNameForWrite(normalized, ["新增联系人", "添加联系人", "再添加", "加一个", "创建联系人"]);
    const contactName = extractAfterLabel(normalized, "联系人") || extractAfterAny(normalized, ["新增联系人", "添加联系人", "联系人"]);
    const contact = extractContactInput(normalized, contactName || undefined);
    return {
      intent: "CREATE_CONTACT",
      confidence: 0.94,
      parameters: {
        customerReference: { companyName: customerName },
        contactInput: contact,
        exactName: customerName || undefined,
        contactName: (contact.name as string) || undefined,
        email: (contact.email as string) || undefined,
        phone: (contact.phone as string) || undefined,
        whatsapp: (contact.whatsapp as string) || undefined,
        isPrimary: !!contact.isPrimary,
      },
    };
  }

  if (/(创建客户|新增客户|录入.*客户|添加正式客户)/.test(normalized) && !/(新询盘|询盘|线索)/.test(normalized)) {
    const company = extractCompanyNameForCreateCustomer(normalized);
    const contactName = extractAfterLabel(normalized, "主联系人") || extractAfterLabel(normalized, "联系人");
    const email = extractEmail(normalized);
    const phone = extractPhone(normalized);
    const country = extractCountry(normalized);
    return {
      intent: "CREATE_CUSTOMER",
      confidence: 0.94,
      parameters: {
        customerInput: {
          company,
          country,
          email,
          phone,
          businessLineName: extractAfterLabel(normalized, "业务线"),
          primaryContact: { name: contactName, email, phone },
        },
        keyword: company || undefined,
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        country: country || undefined,
      },
    };
  }

  if (
    (/(客户|公司).*(改为|改成|更新为|调整为|换成)|下周[一二三四五六日天].*客户.*跟进/.test(normalized))
    && !normalized.includes("线索")
    && !normalized.includes("客户需求")
  ) {
    const customerName = extractCompanyNameForWrite(normalized, ["的", "电话", "邮箱", "阶段", "等级", "下周", "备注", "需求", "地址", "网站"]);
    const changes = extractCustomerChanges(normalized);
    if (customerName && Object.keys(changes).length > 0) {
      return {
        intent: "UPDATE_CUSTOMER",
        confidence: 0.9,
        parameters: {
          customerReference: { companyName: customerName },
          customerChanges: changes,
          keyword: customerName,
        },
      };
    }
  }

  if (
    (/联系人.*(改为|改成|更新为|换成)|联系人ID\s*\d+/.test(normalized))
    && !/的联系人(?:姓名)?(?:改为|改成|更新为|换成)/.test(normalized)
  ) {
    const customerName = normalized.includes("的联系人") ? extractCompanyNameForWrite(normalized, ["的联系人"]) : null;
    const contactName = extractContactNameForUpdate(normalized);
    const changes = extractContactChanges(normalized);
    if (Object.keys(changes).length > 0) {
      return {
        intent: "UPDATE_CONTACT",
        confidence: 0.9,
        parameters: {
          customerReference: customerName ? { companyName: customerName } : undefined,
          contactReference: { id: extractId(normalized, "联系人"), contactName },
          contactChanges: changes,
          contactName: contactName || undefined,
        },
      };
    }
  }

  return null;
}

function extractId(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}\\s*ID\\s*[:：]?\\s*(\\d+)`, "i"));
  return match?.[1] || null;
}

function extractEmail(text: string): string | null {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? cleanTrailingPunctuation(match[0]) : null;
}

function extractPhone(text: string): string | null {
  const labeled = text.match(/(?:电话|手机|WhatsApp|whatsapp)(?:改为|改成|更新为|换成|是|为|:|：)?\s*([+]?\d[\d\s().-]{5,})/i);
  if (labeled) return cleanTrailingPunctuation(labeled[1].trim());
  const match = text.match(/[+]\d[\d\s().-]{5,}/);
  return match ? cleanTrailingPunctuation(match[0].trim()) : null;
}

function extractAfterLabel(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}(?:姓名|名称)?(?:改为|改成|更新为|换成|是|为|叫|:|：)?\\s*([^，。；,]+)`, "i"));
  return cleanupExtractedValue(match?.[1]);
}

function extractAfterAny(text: string, markers: string[]): string | null {
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx >= 0) return cleanupExtractedValue(text.slice(idx + marker.length).split(/[，。；,]/)[0]);
  }
  return null;
}

function cleanupExtractedValue(value: string | null | undefined): string | null {
  const cleaned = String(value || "")
    .replace(/^(为|成|是|叫|客户|公司|联系人)/, "")
    .replace(/(，|。|；|,|;).*$/, "")
    .trim();
  return cleaned || null;
}

function extractCompanyNameForWrite(text: string, markers: string[]): string | null {
  if (extractEmail(text) || extractId(text, "线索") || extractId(text, "客户")) return null;
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx > 0) return cleanupCompanyName(text.slice(0, idx));
  }
  const match = text.match(/(?:把|将|给|为)?(.+?)(?:客户|公司)?(?:的|新增|添加|电话|邮箱|阶段|等级|下周|转)/);
  return cleanupCompanyName(match?.[1] || "");
}

function cleanupCompanyName(value: string): string | null {
  const cleaned = value
    .replace(/^(把|将|给|为|查询|查看|告诉我|创建客户|新增客户|录入一个客户|添加正式客户)/, "")
    .replace(/(线索ID|客户ID)\s*\d+/i, "")
    .replace(/(所在的线索|对应的线索|已经确认合作)$/, "")
    .replace(/(客户|公司|线索)$/, "")
    .trim();
  return cleaned || null;
}

function extractCompanyNameForCreateCustomer(text: string): string | null {
  const companyLabel = text.match(/(?:公司叫|客户叫|公司名称|客户名称)\s*([^，。；,]+)/);
  if (companyLabel) return cleanupExtractedValue(companyLabel[1]);
  const match = text.match(/(?:创建客户|新增客户|添加正式客户|录入一个客户)\s*([^，。；,]+)/);
  return cleanupCompanyName(match?.[1] || "");
}

function extractCountry(text: string): string | null {
  for (const country of ["美国", "中国", "加拿大", "英国", "德国", "法国", "澳大利亚", "日本", "韩国", "印度"]) {
    if (text.includes(country)) return country;
  }
  return extractAfterLabel(text, "国家");
}

function extractContactInput(text: string, fallbackName?: string): Record<string, unknown> {
  return {
    name: fallbackName || extractAfterLabel(text, "联系人"),
    title: extractAfterLabel(text, "职位"),
    department: extractAfterLabel(text, "部门"),
    email: extractEmail(text),
    phone: extractPhone(text),
    whatsapp: /WhatsApp|whatsapp/i.test(text) ? extractPhone(text) : null,
    notes: extractAfterLabel(text, "备注"),
    isPrimary: /主联系人/.test(text),
  };
}

function extractCustomerChanges(text: string): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const phone = extractPhone(text);
  const email = extractEmail(text);
  if (/电话|手机/.test(text) && phone) changes.phone = phone;
  if (/邮箱|email/i.test(text) && email) changes.email = email;
  const stage = extractFieldChange(text, ["阶段", "状态"]);
  if (stage) changes.stage = stage;
  const grade = extractFieldChange(text, ["等级", "级别"]);
  if (grade) changes.grade = grade;
  const notes = extractFieldChange(text, ["备注"]);
  if (notes) changes.notes = notes;
  const requirement = extractFieldChange(text, ["客户需求", "需求"]);
  if (requirement) changes.requirement = requirement;
  const website = extractFieldChange(text, ["网站"]);
  if (website) changes.website = website;
  const address = extractFieldChange(text, ["地址"]);
  if (address) changes.address = address;
  const country = extractFieldChange(text, ["国家", "地区"]);
  if (country) changes.country = country;
  if (/下周[一二三四五六日天]|明天|今天/.test(text)) changes.notes = `${changes.notes || ""} ${text.match(/(今天|明天|下周[一二三四五六日天]).*跟进/)?.[0] || ""}`.trim();
  return changes;
}

function extractContactNameForUpdate(text: string): string | null {
  if (extractId(text, "联系人")) return null;
  const match = text.match(/联系人\s*([^的，。；,]+)|把\s*([^的，。；,]+)\s*的/);
  return cleanupExtractedValue(match?.[1] || match?.[2]);
}

function extractContactChanges(text: string): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const phone = extractPhone(text);
  const email = extractEmail(text);
  if (/电话|手机/.test(text) && phone) changes.phone = phone;
  if (/邮箱|email/i.test(text) && email) changes.email = email;
  if (/WhatsApp|whatsapp/i.test(text) && phone) changes.whatsapp = phone;
  const title = extractFieldChange(text, ["职位", "职务"]);
  if (title) changes.title = title;
  const department = extractFieldChange(text, ["部门"]);
  if (department) changes.department = department;
  const name = extractFieldChange(text, ["姓名", "名字"]);
  if (name) changes.name = name;
  const notes = extractFieldChange(text, ["备注"]);
  if (notes) changes.notes = notes;
  return changes;
}

function extractFieldChange(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}(?:改为|改成|更新为|调整为|换成|设为|为|是)\\s*([^，。；,]+)`, "i"));
    if (match) return cleanupExtractedValue(match[1]);
  }
  return null;
}

function extractEntityDetailQuery(text: string): ParsedIntent | null {
  if (isUpdateLeadText(text)) return null;

  const normalized = normalizeMessage(text).replace(/[。！？!]+$/g, "");
  if (/什么意思|是什么意思/.test(normalized)) return null;
  const querySignals = /查询|查一下|查看|看看|看一下|告诉我|是什么|多少|什么时候|当前|目前|当前情况|目前情况|有哪些|几个/.test(normalized);
  if (!querySignals) return null;
  if (/最近\s*\d+\s*条|列出|显示.*(?:列表|全部)/.test(normalized)) return null;

  if (/(?:客户想要|客户要|客户希望).*(?:报价|订单)/.test(normalized) && !/(?:查询|查一下|查看|看看|看一下|告诉我)/.test(normalized)) {
    return null;
  }

  if (/所有联系人|全部联系人|有几个联系人|多少个联系人|主联系人是谁/.test(normalized)) {
    const params = buildEntityQueryParams(normalized, "customer");
    return { intent: "QUERY_CUSTOMER_CONTACTS", confidence: 0.95, parameters: params };
  }

  if (/联系人ID|查询联系人|查看联系人/.test(normalized)) {
    const params = buildContactQueryParams(normalized);
    return { intent: "QUERY_CONTACT_DETAIL", confidence: 0.95, parameters: params };
  }

  const inferredKind = inferEntityQueryKind(normalized);

  if (inferredKind === "task" && !/查询(?:今天|今日)?.*未完成任务$/.test(normalized)) {
    const params = buildEntityQueryParams(normalized, "task");
    return { intent: "QUERY_TASK_DETAIL", confidence: 0.95, parameters: params };
  }

  if (inferredKind === "customer") {
    const params = buildEntityQueryParams(normalized, "customer");
    return { intent: "QUERY_CUSTOMER_DETAIL", confidence: 0.95, parameters: params };
  }

  if (inferredKind === "quote") {
    const params = buildEntityQueryParams(normalized, "quote");
    return { intent: "QUERY_QUOTE_DETAIL", confidence: 0.95, parameters: params };
  }

  if (inferredKind === "order") {
    const params = buildEntityQueryParams(normalized, "order");
    return { intent: "QUERY_ORDER_DETAIL", confidence: 0.95, parameters: params };
  }

  if (inferredKind === "lead") {
    const params = buildEntityQueryParams(normalized, "lead");
    if (params.entityQuery?.entityReference.name || params.entityQuery?.entityReference.id || params.entityQuery?.entityReference.email || params.entityQuery?.entityReference.phone) {
      return { intent: "QUERY_LEAD_DETAIL", confidence: 0.95, parameters: params };
    }
  }

  return null;
}

function inferEntityQueryKind(text: string): EntityQueryKind | null {
  if (text.includes("线索")) return "lead";
  if (/(?:客户阶段|主联系人|订单数量|历史成交额|应收金额|几个订单|几个报价)/.test(text)) return "customer";
  if (/(?:客户需求|线索状态|线索温度|线索等级|意向产品|预算|预计成交|下次跟进|下次联系|跟进到哪一步)/.test(text)) return "lead";
  if (text.includes("任务") || text.includes("待办")) return "task";
  if (text.includes("报价")) return "quote";
  if (text.includes("订单")) return "order";
  if (text.includes("客户") && !/(?:客户需求|客户想|客户要|客户希望)/.test(text)) return "customer";
  if (/(?:状态|阶段|进度|金额|联系人|电话|邮箱|需求|完整信息|当前情况|目前情况)/.test(text)) return "lead";
  if (/^(?:查询|查一下|查看|看看|看一下|告诉我)/.test(text)) return "lead";
  return null;
}

type EntityQueryKind = "lead" | "customer" | "task" | "quote" | "order";

function buildEntityQueryParams(text: string, kind: EntityQueryKind): ParsedIntent["parameters"] {
  const requestedFields = extractRequestedFields(text, kind);
  const entityReference = extractEntityReference(text, kind);
  const relation = text.includes("最近") ? "latest" : text.includes("有哪些") ? "list" : text.includes("未完成") ? "unfinished" : null;

  return {
    entityQuery: {
      entityReference,
      requestedFields,
      missingFields: requestedFields.length ? [] : ["requestedFields"],
      ambiguities: [],
      relation,
    },
  };
}

function buildContactQueryParams(text: string): ParsedIntent["parameters"] {
  const id = extractId(text, "联系人");
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const contactName = id || email || phone ? null : extractAfterLabel(text, "联系人") || extractContactNameForUpdate(text);
  return {
    entityQuery: {
      entityReference: {
        id,
        name: contactName,
        email,
        phone,
      },
      requestedFields: extractRequestedFields(text, "customer"),
      missingFields: [],
      ambiguities: [],
      relation: null,
    },
  };
}

function extractEntityReference(text: string, kind: EntityQueryKind): NonNullable<ParsedIntent["parameters"]["entityQuery"]>["entityReference"] {
  const ref: NonNullable<ParsedIntent["parameters"]["entityQuery"]>["entityReference"] = {};

  const idLabel = kind === "lead" ? "线索" : kind === "customer" ? "客户" : kind === "task" ? "任务" : kind === "quote" ? "报价" : "订单";
  const idMatch = text.match(new RegExp(`${idLabel}\\s*ID\\s*[:：]?\\s*([A-Za-z0-9_-]+)`, "i"));
  if (idMatch) ref.id = idMatch[1];

  const emailMatch = text.match(/邮箱(?:为|是)?\s*([^\s，,。的]+@[^\s，,。的]+)/);
  if (emailMatch) ref.email = cleanTrailingPunctuation(emailMatch[1]);

  const phoneMatch = text.match(/电话(?:为|是)?\s*([+＋]?[0-9][0-9\s().-]{5,})/);
  if (phoneMatch) ref.phone = cleanTrailingPunctuation(phoneMatch[1]).replace(/^＋/, "+");

  const numberPattern = kind === "quote"
    ? /(?:报价(?:编号|号)?\s*)?([A-Z]*Q[-_A-Za-z0-9]+|QT[-_A-Za-z0-9]+)/i
    : kind === "order"
      ? /(?:订单(?:编号|号)?\s*)?([A-Z]*O[-_A-Za-z0-9]+|ORD[-_A-Za-z0-9]+)/i
      : null;
  if (numberPattern) {
    const numberMatch = text.match(numberPattern);
    if (numberMatch) ref.number = numberMatch[1];
  }

  if (!ref.id && !ref.email && !ref.phone && !ref.number) {
    ref.name = extractEntityName(text, kind);
  }

  return ref;
}

function extractEntityName(text: string, kind: EntityQueryKind): string | null {
  const cleaned = text
    .replace(/^帮我/, "")
    .replace(/^(查询|查一下|查看|看看|看一下|告诉我)/, "")
    .trim();

  const quoted = cleaned.match(/[“"「](.+?)[”"」]/);
  if (quoted) return quoted[1].trim();

  if (kind === "task") {
    const taskName = cleaned.match(/任务[“"「]?(.+?)[”"」]?(?:的|是什么|$)/);
    return taskName?.[1]?.replace(/^ID\s*\S+/i, "").trim() || null;
  }

  if (kind === "customer") {
    const customerName = cleaned.match(/^(.+?)(?:客户|公司)?(?:的|有哪些|目前|当前|现在|阶段|电话|邮箱|国家|联系人|订单|报价|完整信息|$)/);
    return cleanEntityName(customerName?.[1] || "");
  }

  if (kind === "quote" || kind === "order") {
    const byCompany = cleaned.match(/看看(.+?)最近/) || cleaned.match(/^(.+?)(?:有哪些|的.+)/);
    return cleanEntityName(byCompany?.[1] || "");
  }

  const leadName =
    cleaned.match(/(?:线索)?(.+?)(?:当前|目前|现在|的|预算|状态|下次|联系人|电话|邮箱|完整信息|跟进到哪一步|$)/)
    || cleaned.match(/^(.+?)$/);
  return cleanEntityName(leadName?.[1] || "");
}

function cleanEntityName(value: string): string | null {
  const cleaned = value
    .replace(/^(线索|客户|任务|报价|订单)\s*/, "")
    .replace(/(?:的)?(?:完整信息|相关信息|当前状态|目前状态|状态|预算|联系人|电话|邮箱|客户需求|需求|下次跟进时间|下次跟进|下次联系时间|下次联系)$/g, "")
    .trim();
  return cleaned || null;
}

function extractRequestedFields(text: string, kind: EntityQueryKind): string[] {
  const fields = new Set<string>();

  const add = (...items: string[]) => items.forEach((item) => fields.add(item));

  if (/完整信息|全部信息|详细信息|当前情况|目前情况/.test(text)) {
    if (kind === "lead") add("companyName", "contactName", "country", "phone", "email", "status", "grade", "temperature", "requirement", "budget", "currency", "nextFollowUpAt", "latestFollowUp");
    else if (kind === "customer") add("companyName", "primaryContact", "contacts", "country", "phone", "email", "stage", "grade", "status", "nextFollowUpAt", "quoteCount", "orderCount");
    else if (kind === "task") add("title", "status", "priority", "dueAt", "relatedEntity", "description");
    else if (kind === "quote") add("quoteNumber", "customer", "status", "currency", "total", "validUntil", "items", "createdAt");
    else add("orderNumber", "customer", "status", "currency", "total", "paidAmount", "outstandingAmount", "deliveryDate", "items", "createdAt");
    return Array.from(fields);
  }

  if (/公司|公司名称/.test(text)) add("companyName");
  if (/联系人/.test(text)) add(kind === "customer" && /主联系人/.test(text) ? "primaryContact" : "contactName");
  if (/主联系人/.test(text)) add("primaryContact");
  if (/有哪些联系人|联系人列表/.test(text)) add("contacts");
  if (/国家|地区/.test(text)) add("country");
  if (/电话/.test(text)) add("phone");
  if (/邮箱/.test(text)) add("email");
  if (/WhatsApp/i.test(text)) add("whatsapp");
  if (/来源/.test(text)) add("source");
  if (/状态|阶段|进度|跟进到哪一步/.test(text)) add(kind === "customer" && /阶段/.test(text) ? "stage" : "status");
  if (/等级/.test(text)) add("grade");
  if (/温度|意向度/.test(text)) add("temperature");
  if (/需求|客户需求/.test(text)) add("requirement");
  if (/意向产品|产品/.test(text)) add("productInterest");
  if (/预算|金额/.test(text)) add("budget", "currency");
  if (/预计成交/.test(text)) add("expectedCloseAt");
  if (/下次跟进|下次联系/.test(text)) add("nextFollowUpAt");
  if (/最近跟进/.test(text)) add("latestFollowUp");
  if (/跟进次数/.test(text)) add("followUpCount");
  if (/任务数量|几个任务/.test(text)) add("taskCount");
  if (/报价数量|几个报价|报价/.test(text)) add(kind === "quote" ? "total" : "quoteCount");
  if (/订单数量|几个订单|订单/.test(text)) add(kind === "order" ? "total" : "orderCount");
  if (/转客户|已转客户/.test(text)) add("convertedCustomer");
  if (/截止|截止时间/.test(text)) add("dueAt");
  if (/优先级/.test(text)) add("priority");
  if (/完成时间/.test(text)) add("completedAt");
  if (/关联/.test(text)) add("relatedEntity");
  if (/描述/.test(text)) add("description");
  if (/报价编号|报价号/.test(text)) add("quoteNumber");
  if (/订单编号|订单号/.test(text)) add("orderNumber");
  if (/产品|数量|单价|总金额/.test(text) && kind === "quote") add("items", "total");
  if (/交货日期|交付日期/.test(text)) add("deliveryDate");
  if (/已付款/.test(text)) add("paidAmount");
  if (/未付款|欠款|未付/.test(text)) add("outstandingAmount");

  if (fields.size === 0) {
    if (kind === "lead") add("status", "budget", "currency", "contactName", "nextFollowUpAt");
    else if (kind === "customer") add("stage", "primaryContact", "phone", "email");
    else if (kind === "task") add("status", "priority", "dueAt");
    else if (kind === "quote") add("status", "currency", "total");
    else add("status", "currency", "total");
  }

  return Array.from(fields);
}

function isUpdateLeadText(text: string): boolean {
  if (text.includes("查询") || text.includes("查看")) return false;
  return (
    /(?:把|将)?[^，。]+的.+(?:改为|改成|更新为)/.test(text)
    || /[^，。]+(?:电话|邮箱|联系人|预算|需求|状态|等级|温度).*(?:改为|改成|更新为|换成|设为|调整为)/.test(text)
    || /更新一下.+(?:改为|改成|更新为|换成|设为|调整为)/.test(text)
    || /.+改成[ABCDＡＢＣＤ]级?(?:热|温|冷|高意向|中意向|低意向)?意向?客户?/.test(text)
    || /.+已经联系上了/.test(text)
    || /.+已经不考虑了/.test(text)
    || /下周[一二三四五六日天]跟进[^，。]+/.test(text)
    || /后天跟进[^，。]+/.test(text)
    || /明天跟进[^，。]+/.test(text)
    || /今天跟进[^，。]+/.test(text)
    || text.includes("更新线索")
    || text.includes("修改线索")
  );
}

function extractQueryParams(text: string): ParsedIntent["parameters"] {
  const params: ParsedIntent["parameters"] = {};

  // Extract limit: "最近X条" or "X条"
  const limitMatch = text.match(/(\d+)\s*条/);
  if (limitMatch) params.limit = parseInt(limitMatch[1]);

  // Extract quoted name: "公司名" or 「公司名」
  const quotedMatch = text.match(/[""「](.+?)[""」]/);
  if (quotedMatch) {
    params.exactName = quotedMatch[1];
  }

  // Extract keyword (company name after "查询线索" or similar)
  const keywordMatch = text.match(
    /(?:查询|查找|搜索|找)(?:线索|客户|任务|订单|报价)\s*[：:]?\s*(?:最近\s*\d+\s*条\s*)?(?:只显示\S+\s*)?[""「]?(.+?)[""」]?\s*$/,
  );
  if (keywordMatch && !quotedMatch) {
    params.keyword = keywordMatch[1].trim();
  }

  // Date scope
  if (text.includes("今天") || text.includes("今日")) params.dateScope = "TODAY";
  else if (text.includes("逾期") || text.includes("过期")) params.dateScope = "OVERDUE";
  else if (text.includes("未来") || text.includes("明天")) params.dateScope = "UPCOMING";
  else params.dateScope = "ALL";

  // Status scope
  if (text.includes("未完成") || text.includes("待处理")) params.statusScope = "UNFINISHED";
  else if (text.includes("已完成") || text.includes("完成")) params.statusScope = "COMPLETED";
  else params.statusScope = "ALL";

  // Fields extraction: "只显示X、Y和Z"
  const fieldsMatch = text.match(/(?:只显示|显示|包含)\s*(.+?)(?:$|。|！|\n)/);
  if (fieldsMatch) {
    params.fields = fieldsMatch[1].split(/[、，,和]/).map((f) => f.trim()).filter(Boolean);
  }

  return params;
}

// ══════════════════════════════════════════════════════════════════
// LLM enrichment for write intents
// ══════════════════════════════════════════════════════════════════

/**
 * Intent types that benefit from LLM structured extraction.
 * For these intents, the keyword-based parameters are replaced with
 * LLM-extracted + Zod-validated parameters when AI is available.
 */
const LLM_ENRICHABLE_INTENTS: ReadonlySet<string> = new Set([
  "CREATE_LEAD",
  "ADD_LEAD_FOLLOWUP",
  "UPDATE_LEAD",
]);

/**
 * Shadow mode: when enabled, runs LLM extraction in parallel but uses
 * the original rule-based result. Logs the LLM result for comparison.
 */
function isShadowMode(): boolean {
  return process.env.FEISHU_NL_SHADOW_MODE === "true";
}

/**
 * Write confirmation mode: when enabled, all write intents go through
 * the confirmation flow regardless of risk level.
 */
export function isWriteConfirmationMode(): boolean {
  return process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE === "true"
    || process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE === "all";
}

/**
 * Enrich a parsed intent with LLM-structured extraction for write intents.
 *
 * - If AI is available and the intent is enrichable, calls LLM extraction
 * - Returns UNKNOWN on extraction failure so fallback cannot create business intents
 * - In shadow mode, logs LLM result but returns original
 * - Returns the original parsed result if the intent is not enrichable
 */
export async function enrichWithLLM(
  parsed: ParsedIntent,
  originalText: string,
): Promise<ParsedIntent> {
  if (!LLM_ENRICHABLE_INTENTS.has(parsed.intent)) {
    return parsed;
  }

  const shadowMode = isShadowMode();

  try {
    const { extractStructuredParameters } = await import("./nlu-extractor");
    const llmResult = await extractStructuredParameters(originalText);

    if (!llmResult.success || !llmResult.result) {
      console.log(`LLM extraction failed: ${llmResult.error}, returning UNKNOWN`);
      return { intent: "UNKNOWN", confidence: 0.1, parameters: {} };
    }

    if (shadowMode) {
      console.log("[SHADOW] LLM result:", JSON.stringify(llmResult.result));
      console.log("[SHADOW] Original result:", JSON.stringify(parsed.parameters));
      return mapNLUResultToParsedIntent(llmResult.result, parsed);
    }

    // Validate intent match: if LLM disagrees with keyword routing on
    // a high-confidence keyword match (>0.9), prefer keyword routing.
    if (parsed.confidence >= 0.9 && llmResult.result.intent !== parsed.intent) {
      console.log(
        `Intent mismatch: keyword=${parsed.intent}(${parsed.confidence}) vs llm=${llmResult.result.intent}(${llmResult.result.confidence}), using keyword`,
      );
    }

    return mapNLUResultToParsedIntent(llmResult.result, parsed);
  } catch (error) {
    console.log(`LLM enrichment error: ${error}, using original`);
    return parsed;
  }
}

/**
 * Map NLU_OUTPUT_SCHEMA result back to the existing ParsedIntent type.
 * This bridges the new LLM-based extraction with the existing handler
 * infrastructure that expects ParsedIntent.
 */
function mapNLUResultToParsedIntent(
  nluResult: any,
  original: ParsedIntent,
): ParsedIntent {
  const params: ParsedIntent["parameters"] = {};

  if (original.intent === "CREATE_LEAD") {
    const p = nluResult.parameters || {};
    params.contactName = p.contactName || undefined;
    params.country = p.country || undefined;
    params.email = p.email || undefined;
    params.phone = p.phone || undefined;
    params.requirement = p.requirement || undefined;
    params.missingFields = nluResult.missingFields || undefined;
  } else if (original.intent === "ADD_LEAD_FOLLOWUP") {
    const p = nluResult.parameters || {};
    const leadRef = p.leadReference || {};
    params.exactName =
      leadRef.companyName || p.exactName || undefined;
    params.contactName = leadRef.contactName || undefined;
    params.email = leadRef.email || undefined;
    params.phone = leadRef.phone || undefined;
    params.followUpContent = p.content || p.followUpContent || undefined;
    params.missingFields = nluResult.missingFields || undefined;
  } else {
    // For other intents, keep original params
    return original;
  }

  return {
    intent: original.intent,
    confidence: nluResult.confidence || original.confidence,
    entityHint: {
      ...original.entityHint,
      company: nluResult.parameters?.companyName || nluResult.parameters?.company || original.entityHint?.company,
      contact: nluResult.parameters?.contactName || original.entityHint?.contact,
      email: nluResult.parameters?.email || original.entityHint?.email,
      phone: nluResult.parameters?.phone || original.entityHint?.phone,
      country: nluResult.parameters?.country || original.entityHint?.country,
    },
    parameters: params,
    replyText: original.replyText,
  };
}

function extractUpdateLeadParams(text: string): ParsedIntent["parameters"] {
  const normalized = normalizeMessage(text);
  const leadReference: NonNullable<ParsedIntent["parameters"]["updateLead"]>["leadReference"] = {};
  const changes: NonNullable<ParsedIntent["parameters"]["updateLead"]>["changes"] = {};

  const idMatch = normalized.match(/(?:线索ID|ID|#)\s*[:：]?\s*(\d+)/i);
  if (idMatch) leadReference.id = idMatch[1];

  const emailRef = normalized.match(/邮箱\s*([^\s，,。]+@[^\s，,。]+)/);
  if (emailRef && !/(邮箱|email).*(?:改为|改成|更新为)/i.test(normalized)) leadReference.email = cleanTrailingPunctuation(emailRef[1]);

  const targetMatch =
    normalized.match(/(?:把|将)(.+?)的.+?(?:改为|改成|更新为)/)
    || normalized.match(/^(.+?)的.+?(?:改为|改成|更新为|换成|设为|调整为)/)
    || normalized.match(/^(.+?)(?:电话|邮箱|联系人|预算|需求|状态|等级|温度).*(?:改为|改成|更新为|换成|设为|调整为)/)
    || normalized.match(/^更新一下(.+?)[，,].+?(?:改为|改成|更新为|换成|设为|调整为)/)
    || normalized.match(/^(.+?)改成[ABCDＡＢＣＤ]级?/)
    || normalized.match(/^(.+?)已经联系上了/)
    || normalized.match(/^(.+?)已经不考虑了/)
    || normalized.match(/(?:今天|明天|下周[一二三四五六日天])跟进(.+?)(?:[。！!]|$)/);
  if (targetMatch && !leadReference.id) {
    leadReference.companyName = targetMatch[1].trim();
  }

  const statusMatch = normalized.match(/状态(?:改为|改成|更新为|设为|调整为)(.+?)(?:[，,。！!]|$)/);
  if (statusMatch) changes.status = normalizeUpdateStatus(statusMatch[1].trim());
  else if (normalized.includes("已经联系上了")) changes.status = "CONTACTED";
  else if (normalized.includes("已经不考虑了")) changes.status = "LOST";

  const budgetMatch = normalized.match(/预算(?:改为|改成|更新为|设为|调整为|大概)?\s*([0-9]+(?:\.[0-9]+)?)\s*(美元|美金|USD|人民币|元|CNY|欧元|EUR)?/i);
  if (budgetMatch) {
    changes.budget = Number(budgetMatch[1]);
    if (budgetMatch[2]) changes.currency = normalizeUpdateCurrency(budgetMatch[2].trim());
  }

  const contactMatch = normalized.match(/联系人(?:姓名)?(?:改为|改成|更新为|换成|设为|调整为)\s*(.+?)(?:[，,。！!]|$)/);
  if (contactMatch) changes.contactName = contactMatch[1].trim();

  const phoneMatch = normalized.match(/电话(?:改为|改成|更新为|换成|设为|调整为)\s*(.+?)(?:[，,。！!]|$)/);
  if (phoneMatch) changes.phone = phoneMatch[1].trim();

  const emailChangeMatch = normalized.match(/邮箱(?:改为|改成|更新为|换成|设为|调整为)\s*(.+?)(?:[，,。！!]|$)/);
  if (emailChangeMatch) changes.email = cleanTrailingPunctuation(emailChangeMatch[1].trim());

  const requirementMatch = normalized.match(/(?:客户需求|需求)(?:改为|改成|更新为|换成|设为|调整为)\s*(.+?)(?:[。！!]|$)/);
  if (requirementMatch) changes.requirement = requirementMatch[1].trim();

  const gradeMatch =
    normalized.match(/(?:等级|级别)(?:改为|改成|更新为|设为|调整为)\s*([ABCDＡＢＣＤ]级?|[一二三四]级?)(?:[，,。！!]|$)/i)
    || normalized.match(/改成\s*([ABCDＡＢＣＤ]级?)/i);
  if (gradeMatch) changes.grade = normalizeUpdateGrade(gradeMatch[1].trim());

  const temperatureMatch =
    normalized.match(/温度(?:改为|改成|更新为|设为|调整为)\s*(热|温|冷|高意向|中意向|低意向|HOT|WARM|COLD)(?:[，,。！!]|$)/i)
    || normalized.match(/([热温冷]|高意向|中意向|低意向)意向?客户?/);
  if (temperatureMatch) changes.temperature = normalizeUpdateTemperature(temperatureMatch[1].trim());

  const notesMatch = normalized.match(/备注(?:是|为|改为|改成)\s*(.+?)(?:[。！!]|$)/);
  if (notesMatch) changes.notes = notesMatch[1].trim();

  const nextFollowUpMatch = normalized.match(/(今天|明天|后天|下周[一二三四五六日天])(?:再联系|跟进)/);
  if (nextFollowUpMatch) changes.nextFollowUpAt = nextFollowUpMatch[1];

  if (leadReference.companyName) {
    leadReference.companyName = cleanDomainEntityName(leadReference.companyName) || leadReference.companyName;
  }

  return { updateLead: { leadReference, changes } };
}

function normalizeUpdateStatus(value: string): string {
  const map: Record<string, string> = {
    新线索: "NEW",
    新建: "NEW",
    已联系: "CONTACTED",
    需求确认中: "REQUIREMENT_CONFIRMING",
    报价中: "QUOTING",
    谈判中: "NEGOTIATING",
    已确认有效: "QUALIFIED",
    已转客户: "CONVERTED",
    已成交: "WON",
    已丢失: "LOST",
    已流失: "LOST",
    休眠: "DORMANT",
  };
  const raw = value.toUpperCase();
  return map[value] || raw;
}

function normalizeUpdateCurrency(value: string): string {
  const map: Record<string, string> = { 美元: "USD", 美金: "USD", 人民币: "CNY", 元: "CNY", 欧元: "EUR" };
  return map[value] || value.toUpperCase();
}

function normalizeUpdateGrade(value: string): string {
  return value.toUpperCase().replace("级", "").replace("Ａ", "A").replace("Ｂ", "B").replace("Ｃ", "C").replace("Ｄ", "D");
}

function normalizeUpdateTemperature(value: string): string {
  const map: Record<string, string> = { 热: "HOT", 高意向: "HOT", 温: "WARM", 中意向: "WARM", 冷: "COLD", 低意向: "COLD" };
  return map[value] || value.toUpperCase();
}

function extractWriteParams(text: string, isFollowup = false): ParsedIntent["parameters"] {
  const params: ParsedIntent["parameters"] = {};
  const normalized = normalizeMessage(text);

  // Extract quoted name
  const quotedMatch = text.match(/[""「](.+?)[""」]/);
  if (quotedMatch) {
    params.exactName = quotedMatch[1];
  }

  // ── Extract structured fields using delimiter-based parsing ─────
  // Handles: "添加线索，公司名，国家，联系人XXX，邮箱xxx@xxx.com，电话+1 xxx，需求是xxx"
  // Split by Chinese/English comma to get segments, then match labels.
  const segments = text.split(/[，,]/).map((s) => s.trim()).filter(Boolean);

  // Extract contact name — only match "联系人" preceded by a delimiter, not inside company name
  const contactMatch = normalized.match(/(?:^|[，,：:])\s*联系人\s*(.+?)(?:[，,：:]|$)/);
  if (contactMatch) {
    params.contactName = contactMatch[1].trim();
  }

  // Extract email after "邮箱"
  const emailMatch = normalized.match(/邮箱\s*(.+?)(?:[，,：:]|$)/);
  if (emailMatch) {
    params.email = cleanTrailingPunctuation(emailMatch[1].trim());
  }

  if (!isFollowup) {
    // Extract phone after an explicit phone label for entity creation.
    const phoneMatch = normalized.match(/电话\s*(.+?)(?:[，,：:]|$)/);
    if (phoneMatch) {
      params.phone = phoneMatch[1].trim();
    }
  }

  // Extract requirement after "需求" or "需求是"
  if (!isFollowup) {
    const reqMatch = normalized.match(/需求(?:是|=)\s*(.+?)(?:[，,。！!]|$)/);
    if (reqMatch) {
      params.requirement = reqMatch[1].trim();
    } else {
      const wantMatch = normalized.match(/(?:想|希望)(?:采购|购买|要)\s*(.+?)(?:[。！!]|$)/);
      if (wantMatch) params.requirement = wantMatch[1].trim();
    }
  }

  // ── Extract company name: first segment after "添加线索，" ──────
  const companyAfterAction = normalized.match(
    /(?:添加|新建|创建|更新|修改)(?:线索|客户|联系人|任务|项目|商机|报价|报价单|订单|发票)\s*[，,：:]\s*(.+)/,
  );
  if (companyAfterAction && !quotedMatch && !isFollowup) {
    const firstSegment = companyAfterAction[1].split(/[，,]/)[0].trim();
    params.keyword = firstSegment.replace(/^公司叫\s*/, "").trim();
  }

  // ── Extract country from comma-separated format ──
  if (!isFollowup && !params.country) {
    if (companyAfterAction) {
      const segments = companyAfterAction[1].split(/[，,]/).map(s => s.trim()).filter(Boolean);
      if (segments.length >= 2) {
        const countryCandidate = segments[1];
        if (!countryCandidate.includes("@") && !countryCandidate.includes("需求") &&
            countryCandidate.length <= 10 && !countryCandidate.match(/^\d/)) {
          params.country = countryCandidate;
        }
      }
    }
    if (!params.country) {
      if (normalized.includes("美国")) params.country = "美国";
      else if (normalized.includes("中国")) params.country = "中国";
      else if (normalized.includes("加拿大")) params.country = "加拿大";
      else if (normalized.includes("德国")) params.country = "德国";
      else if (normalized.includes("英国")) params.country = "英国";
    }
  }

  // ── Extract contact name from comma-separated format ──
  if (!params.contactName && companyAfterAction && !isFollowup) {
    const segments = companyAfterAction[1].split(/[，,]/).map(s => s.trim()).filter(Boolean);
    if (segments.length >= 3 && !segments[2].includes("@") && !segments[2].includes("需求")) {
      params.contactName = segments[2];
    }
  }

  if (!params.keyword && !isFollowup) {
    const companyNamed = normalized.match(/公司叫\s*(.+?)(?:[，,。！!]|$)/);
    const newCustomerNamed = normalized.match(/新客户叫\s*(.+?)(?:[，,。！!]|$)/);
    const inquiryNamed = normalized.match(/新询盘[：:]\s*(.+?)(?:[，,。！!]|$)/);
    const company = companyNamed?.[1] || newCustomerNamed?.[1] || inquiryNamed?.[1];
    if (company) params.keyword = company.trim();
  }

  // Extract follow-up content: "给XX添加跟进：内容" or "跟进：内容"
  if (isFollowup) {
    const followUpMatch = normalized.match(
      /(?:给|为)\s*(.+?)\s*(?:添加跟进记录|添加跟进|添加|跟进)\s*[：:]\s*(.+)/,
    );
    if (followUpMatch) {
      params.exactName = followUpMatch[1].trim();
      params.followUpContent = followUpMatch[2].trim();
    } else {
      const phoneFollowUpMatch = normalized.match(/我刚给(.+?)打了电话[，,]\s*(.+)/);
      const contactedMatch = normalized.match(/我刚联系了(.+?)[，,]\s*(.+)/);
      const simpleMatch = normalized.match(/(?:添加|添加跟进记录|跟进|记录一下)\s*[：:]?\s*(.+)/);
      if (phoneFollowUpMatch) {
        params.exactName = phoneFollowUpMatch[1].trim();
        params.followUpContent = phoneFollowUpMatch[2].trim();
      } else if (contactedMatch) {
        params.exactName = contactedMatch[1].trim();
        params.followUpContent = contactedMatch[2].trim();
      } else if (simpleMatch) {
        params.followUpContent = simpleMatch[1].trim();
      }
    }
  }

  // Extract confirmation token if present in the message
  const confirmTokenMatch = normalized.match(/确认(?:执行)?\s+(.+?)$/);
  if (confirmTokenMatch) {
    params.confirmationToken = confirmTokenMatch[1].trim();
  }

  if (!isFollowup) {
    if (!params.country && normalized.includes("加拿大")) {
      params.country = "加拿大";
    }
    if (!params.phone) {
      const parsedPhone = extractPhone(normalized);
      if (parsedPhone) params.phone = parsedPhone;
    }
    if (!params.requirement) {
      const needMatch = normalized.match(/(?:他们|客户|对方)?(?:需要|需求是|需求为)\s*(.+?)(?:[。!！]|$)/);
      if (needMatch) params.requirement = needMatch[1].trim();
    }
  }

  if (!params.contactName && !isFollowup) {
    params.contactName = undefined;
    params.missingFields = [...(params.missingFields || []), "contactName"];
  }

  return isFollowup ? params : normalizeCreateLeadParameters(params);
}

function finalizeParserOutput(parsed: ParsedIntent): ParsedIntent {
  const entityHint = buildEntityHint(parsed);
  const safeParameters = stripForbiddenParserKeys(parsed.parameters || {});
  const safeOutput = ParserOutputSchema.parse({
    intent: parsed.intent,
    entityHint,
    parameters: safeParameters,
  });
  const output = safeOutput as ParsedIntent;

  Object.defineProperty(output, "confidence", {
    value: parsed.confidence ?? 0.9,
    enumerable: false,
    configurable: true,
  });
  if (parsed.replyText) {
    Object.defineProperty(output, "replyText", {
      value: parsed.replyText,
      enumerable: false,
      configurable: true,
    });
  }

  return output;
}

function buildEntityHint(parsed: ParsedIntent): ParsedIntent["entityHint"] {
  const params: Record<string, any> = parsed.parameters || {};
  const existing = params.entityHint && typeof params.entityHint === "object" ? params.entityHint : {};
  const leadRef = params.leadReference && typeof params.leadReference === "object" ? params.leadReference : {};
  const customerRef = params.customerReference && typeof params.customerReference === "object" ? params.customerReference : {};
  const contactRef = params.contactReference && typeof params.contactReference === "object" ? params.contactReference : {};
  const updateLead = params.updateLead && typeof params.updateLead === "object" ? params.updateLead : {};
  const updateLeadRef = updateLead.leadReference && typeof updateLead.leadReference === "object" ? updateLead.leadReference : {};

  const company = firstString(
    existing.company,
    params.company,
    params.companyName,
    params.customerName,
    params.exactName,
    params.keyword,
    leadRef.companyName,
    leadRef.name,
    customerRef.companyName,
    customerRef.name,
    updateLeadRef.companyName,
  );
  const contact = firstString(
    existing.contact,
    params.contact,
    params.contactName,
    contactRef.contactName,
    contactRef.name,
    leadRef.contactName,
    updateLeadRef.contactName,
  );
  const email = firstString(existing.email, params.email, contactRef.email, leadRef.email, customerRef.email, updateLeadRef.email);
  const phone = firstString(existing.phone, params.phone, contactRef.phone, leadRef.phone, customerRef.phone, updateLeadRef.phone);
  const country = firstString(existing.country, params.country);
  const hint = { company, contact, email, phone, country };
  return Object.fromEntries(Object.entries(hint).filter(([, value]) => value)) as ParsedIntent["entityHint"];
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function stripForbiddenParserKeys(value: unknown): any {
  if (Array.isArray(value)) return value.map(stripForbiddenParserKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !FORBIDDEN_PARSER_KEYS.has(key))
      .map(([key, child]) => [key, stripForbiddenParserKeys(child)]),
  );
}

function cleanTrailingPunctuation(value: string): string {
  return value.replace(/[。.!！]+$/g, "").trim();
}

export function getHelpText(): string {
  const readOnly = process.env.FEISHU_READ_ONLY !== "false";
  const createLead = process.env.FEISHU_ALLOW_CREATE_LEAD === "true";
  const updateLead = process.env.FEISHU_ALLOW_UPDATE_LEAD === "true";
  const addFollowup = process.env.FEISHU_ALLOW_ADD_FOLLOWUP === "true";
  const createCustomer = process.env.FEISHU_ALLOW_CREATE_CUSTOMER === "true";
  const updateCustomer = process.env.FEISHU_ALLOW_UPDATE_CUSTOMER === "true";
  const createContact = process.env.FEISHU_ALLOW_CREATE_CONTACT === "true";
  const updateContact = process.env.FEISHU_ALLOW_UPDATE_CONTACT === "true";
  const setPrimaryContact = process.env.FEISHU_ALLOW_SET_PRIMARY_CONTACT === "true";
  const createTask = process.env.FEISHU_ALLOW_CREATE_TASK === "true";
  const updateTask = process.env.FEISHU_ALLOW_UPDATE_TASK === "true";
  const completeTask = process.env.FEISHU_ALLOW_COMPLETE_TASK === "true";
  const createProject = process.env.FEISHU_ALLOW_CREATE_PROJECT === "true";
  const updateProject = process.env.FEISHU_ALLOW_UPDATE_PROJECT === "true";
  const createQuote = process.env.FEISHU_ALLOW_CREATE_QUOTE === "true";
  const updateQuote = process.env.FEISHU_ALLOW_UPDATE_QUOTE === "true";
  const sendQuote = process.env.FEISHU_ALLOW_SEND_QUOTE === "true";
  const acceptQuote = process.env.FEISHU_ALLOW_ACCEPT_QUOTE === "true";
  const quoteToOrder = process.env.FEISHU_ALLOW_QUOTE_TO_ORDER === "true";
  const createOrder = process.env.FEISHU_ALLOW_CREATE_ORDER === "true";
  const updateOrder = process.env.FEISHU_ALLOW_UPDATE_ORDER === "true";
  const createInvoice = process.env.FEISHU_ALLOW_CREATE_INVOICE === "true";
  const updateInvoice = process.env.FEISHU_ALLOW_UPDATE_INVOICE === "true";
  const recordPayment = process.env.FEISHU_ALLOW_RECORD_PAYMENT === "true";
  const customerPool = process.env.FEISHU_ALLOW_CUSTOMER_POOL === "true";
  const convertLead = process.env.FEISHU_ALLOW_CONVERT_LEAD === "true";

  let writeSection = "";
  if (!readOnly) {
    const lines: string[] = [];

    // Lead operations
    const leadLines: string[] = [];
    if (createLead) leadLines.push("添加线索");
    if (updateLead) leadLines.push("更新线索");
    if (addFollowup) leadLines.push("添加跟进");
    if (convertLead) leadLines.push("线索转客户 [C]");
    if (leadLines.length > 0) {
      lines.push(`  线索：${leadLines.join("、")}`);
    }

    // Customer operations
    const custLines: string[] = [];
    if (createCustomer) custLines.push("创建客户");
    if (updateCustomer) custLines.push("更新客户");
    if (createContact) custLines.push("创建联系人");
    if (updateContact) custLines.push("更新联系人");
    if (setPrimaryContact) custLines.push("设置主联系人");
    if (customerPool) {
      custLines.push("认领客户 [C]");
      custLines.push("退回公海 [C]");
    }
    if (custLines.length > 0) {
      lines.push(`  客户：${custLines.join("、")}`);
    }

    // Task operations
    const taskLines: string[] = [];
    if (createTask) taskLines.push("创建任务");
    if (updateTask) taskLines.push("更新任务");
    if (completeTask) taskLines.push("完成任务 [B]");
    if (taskLines.length > 0) {
      lines.push(`  任务：${taskLines.join("、")}`);
    }

    // Project operations
    const projLines: string[] = [];
    if (createProject) projLines.push("创建项目/商机");
    if (updateProject) projLines.push("更新项目/商机");
    if (projLines.length > 0) {
      lines.push(`  项目：${projLines.join("、")}`);
    }

    // Quote operations
    const quoteLines: string[] = [];
    if (createQuote) quoteLines.push("创建报价");
    if (updateQuote) quoteLines.push("更新报价");
    if (sendQuote) quoteLines.push("发送报价 [C]");
    if (acceptQuote) quoteLines.push("接受报价 [C]");
    if (quoteToOrder) quoteLines.push("报价转订单 [C]");
    if (quoteLines.length > 0) {
      lines.push(`  报价：${quoteLines.join("、")}`);
    }

    // Order operations
    const orderLines: string[] = [];
    if (createOrder) orderLines.push("创建订单");
    if (updateOrder) orderLines.push("更新订单");
    if (orderLines.length > 0) {
      lines.push(`  订单：${orderLines.join("、")}`);
    }

    // Invoice & Payment
    const finLines: string[] = [];
    if (createInvoice) finLines.push("创建发票");
    if (updateInvoice) finLines.push("更新发票");
    if (recordPayment) finLines.push("记录付款 [C]");
    if (finLines.length > 0) {
      lines.push(`  财务：${finLines.join("、")}`);
    }

    if (lines.length > 0) {
      writeSection = `\n✏️ 写入类：\n[ A = 直接执行 | B = 需完整参数 | C = 需二次确认 ]\n${lines.join("\n")}`;
    }
  }

  return `🤖 CRM助手功能：

📋 查询类：
  • 查询线索 — 支持公司名、数量、状态筛选
  • 查询客户 — 支持公司名、阶段筛选
  • 查询任务 — 支持今天/逾期/全部筛选
  • 查询订单 — 支持订单号、状态筛选
  • 查询报价 — 支持报价号、状态筛选
${writeSection}
💡 使用示例：
  查询：
  • 查询最近3条线索
  • 查询线索"ABC公司"
  • 查询今天未完成任务

  写入：
  • 添加线索，ABC公司，联系人John
  • 给ABC公司添加跟进：今天电话沟通
  • 创建任务：明天跟进报价
  • 线索转客户"ABC公司" → 需二次确认 [C]

⚠️ 标注 [B] 的操作需要提供完整参数；标注 [C] 的操作需二次确认后执行。`;
}
