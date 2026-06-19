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
  | "CREATE_QUOTE"
  | "UPDATE_QUOTE"
  | "SEND_QUOTE"
  | "ACCEPT_QUOTE"
  | "CONVERT_QUOTE_TO_ORDER"
  | "CREATE_ORDER"
  | "UPDATE_ORDER"
  | "UPDATE_ORDER_STATUS"
  | "CREATE_INVOICE"
  | "UPDATE_INVOICE"
  | "RECORD_PAYMENT";

export type QueryIntent =
  | "QUERY_LEADS"
  | "QUERY_CUSTOMERS"
  | "QUERY_TASKS"
  | "QUERY_ORDERS"
  | "QUERY_QUOTES";

export type ParsedIntent = {
  intent:
    | "CHAT"
    | "HELP"
    | QueryIntent
    | WriteIntent
    | "SENSITIVE"
    | "UNKNOWN";
  confidence: number;
  parameters: {
    keyword?: string;
    exactName?: string;
    contactName?: string;
    followUpContent?: string;
    limit?: number;
    dateScope?: "TODAY" | "OVERDUE" | "UPCOMING" | "ALL";
    statusScope?: "UNFINISHED" | "COMPLETED" | "ALL";
    fields?: string[];
    confirmationToken?: string;
    email?: string;
    phone?: string;
    country?: string;
    requirement?: string;
  };
  replyText?: string;
};

// ── Confirmation token pattern (for C-level operations) ───────────
const CONFIRM_PATTERN = /^确认(?:执行)?\s+(.+)$/;

export function parseFeishuIntent(text: string): ParsedIntent {
  const trimmed = text.trim();

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

  // ════════════════════════════════════════════════════════════════
  // WRITE INTENTS — order matters (most specific first)
  // ════════════════════════════════════════════════════════════════

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
  if ( ( trimmed.includes("更新线索") || trimmed.includes("修改线索") ) && !trimmed.includes("查询") ) {
    const params = extractWriteParams(trimmed);
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
  // QUERY INTENTS (must come AFTER write intents so write keywords win)
  // ════════════════════════════════════════════════════════════════

  if (trimmed.includes("线索")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_LEADS", confidence: 0.9, parameters: params };
  }

  // Check 订单 and 报价 before 客户 so specific intents win over generic
  if (trimmed.includes("订单")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_ORDERS", confidence: 0.9, parameters: params };
  }

  if (trimmed.includes("报价")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_QUOTES", confidence: 0.9, parameters: params };
  }

  if (trimmed.includes("客户")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_CUSTOMERS", confidence: 0.9, parameters: params };
  }

  if (trimmed.includes("任务") || trimmed.includes("待办")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_TASKS", confidence: 0.9, parameters: params };
  }

  // Unknown
  return { intent: "UNKNOWN", confidence: 0.3, parameters: {} };
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

function extractWriteParams(text: string, isFollowup = false): ParsedIntent["parameters"] {
  const params: ParsedIntent["parameters"] = {};

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
  const contactMatch = text.match(/(?:^|[，,：:])\s*联系人\s*(.+?)(?:[，,：:]|$)/);
  if (contactMatch) {
    params.contactName = contactMatch[1].trim();
  }

  // Extract email after "邮箱"
  const emailMatch = text.match(/邮箱\s*(.+?)(?:[，,：:]|$)/);
  if (emailMatch) {
    params.email = emailMatch[1].trim();
  }

  // Extract phone after "电话"
  const phoneMatch = text.match(/电话\s*(.+?)(?:[，,：:]|$)/);
  if (phoneMatch) {
    params.phone = phoneMatch[1].trim();
  }

  // Extract country — look for country-like segment after company, before contact
  // Common pattern: "添加线索，公司名，美国，联系人XXX"
  // Or check for known country patterns
  const countryMatch = text.match(
    /(?:添加|新建|创建)(?:线索|客户)\s*[，,：:]\s*.+?[，,]\s*([一-龥]{2,4}|[A-Za-z\s]{2,30})[，,]\s*联系人/,
  );
  if (countryMatch) {
    params.country = countryMatch[1].trim();
  }

  // Extract requirement after "需求" or "需求是"
  const reqMatch = text.match(/需求(?:是|=)\s*(.+?)(?:[，,：:]|$)/);
  if (reqMatch) {
    params.requirement = reqMatch[1].trim();
  }

  // ── Extract company name: first segment after "添加线索，" ──────
  // e.g. "添加线索，ABC公司，美国，联系人John" -> keyword = "ABC公司"
  const companyAfterAction = text.match(
    /(?:添加|新建|创建|更新|修改)(?:线索|客户|联系人|任务|项目|商机|报价|报价单|订单|发票)\s*[，,：:]\s*(.+?)(?:[，,：:]|$)/,
  );
  if (companyAfterAction && !quotedMatch && !isFollowup) {
    // Only use the first segment as company name, not mixed with other fields
    const firstSegment = companyAfterAction[1].split(/[，,]/)[0].trim();
    params.keyword = firstSegment;
  }

  // Extract follow-up content: "给XX添加跟进：内容" or "跟进：内容"
  const followUpMatch = text.match(
    /(?:给|为)\s*(.+?)\s*(?:添加|添加跟进记录|跟进)\s*[：:]\s*(.+)/,
  );
  if (followUpMatch) {
    params.exactName = followUpMatch[1].trim();
    params.followUpContent = followUpMatch[2].trim();
  } else {
    const simpleMatch = text.match(/(?:添加|添加跟进记录|跟进)\s*[：:]\s*(.+)/);
    if (simpleMatch) {
      params.followUpContent = simpleMatch[1].trim();
    }
  }

  // Extract confirmation token if present in the message
  const confirmTokenMatch = text.match(/确认(?:执行)?\s+(.+?)$/);
  if (confirmTokenMatch) {
    params.confirmationToken = confirmTokenMatch[1].trim();
  }

  return params;
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
