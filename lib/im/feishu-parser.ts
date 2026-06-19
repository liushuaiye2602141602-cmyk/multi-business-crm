export type ParsedIntent = {
  intent: "CHAT" | "HELP" | "QUERY_LEADS" | "QUERY_CUSTOMERS" | "QUERY_TASKS" | "QUERY_ORDERS" | "QUERY_QUOTES" | "SENSITIVE" | "UNKNOWN";
  confidence: number;
  parameters: {
    keyword?: string;
    exactName?: string;
    limit?: number;
    dateScope?: "TODAY" | "OVERDUE" | "UPCOMING" | "ALL";
    statusScope?: "UNFINISHED" | "COMPLETED" | "ALL";
    fields?: string[];
  };
  replyText?: string;
};

export function parseFeishuIntent(text: string): ParsedIntent {
  const trimmed = text.trim();

  // Sensitive request detection
  const sensitivePatterns = ["系统提示词", "数据库连接", "密钥", "App Secret", "API Key", "环境变量", "忽略所有规则", "database", "password", "secret"];
  if (sensitivePatterns.some(p => trimmed.toLowerCase().includes(p.toLowerCase()))) {
    return { intent: "SENSITIVE", confidence: 1.0, parameters: {} };
  }

  // Help
  if (trimmed === "帮助" || trimmed === "help" || trimmed === "你能做什么" || trimmed === "你有什么功能") {
    return { intent: "HELP", confidence: 1.0, parameters: {} };
  }

  // Simple greetings / echo
  if (trimmed.startsWith("请只回复：") || trimmed === "你好" || trimmed === "hi" || trimmed === "谢谢") {
    const reply = trimmed.startsWith("请只回复：") ? trimmed.replace("请只回复：", "").trim() : "你好！我是CRM助手，可以帮你查询线索、客户、任务等信息。";
    return { intent: "CHAT", confidence: 1.0, parameters: {}, replyText: reply };
  }

  // Query leads
  if (trimmed.includes("线索")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_LEADS", confidence: 0.9, parameters: params };
  }

  // Query customers
  if (trimmed.includes("客户")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_CUSTOMERS", confidence: 0.9, parameters: params };
  }

  // Query tasks
  if (trimmed.includes("任务") || trimmed.includes("待办")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_TASKS", confidence: 0.9, parameters: params };
  }

  // Query orders
  if (trimmed.includes("订单")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_ORDERS", confidence: 0.9, parameters: params };
  }

  // Query quotes
  if (trimmed.includes("报价")) {
    const params = extractQueryParams(trimmed);
    return { intent: "QUERY_QUOTES", confidence: 0.9, parameters: params };
  }

  // Unknown
  return { intent: "UNKNOWN", confidence: 0.3, parameters: {} };
}

function extractQueryParams(text: string): ParsedIntent["parameters"] {
  const params: ParsedIntent["parameters"] = {};
  const lower = text.toLowerCase();

  // Extract limit: "最近X条" or "X条"
  const limitMatch = text.match(/(\d+)\s*条/);
  if (limitMatch) params.limit = parseInt(limitMatch[1]);

  // Extract quoted name: "公司名" or 「公司名」
  const quotedMatch = text.match(/[""「](.+?)[""」]/);
  if (quotedMatch) {
    params.exactName = quotedMatch[1];
  }

  // Extract keyword (company name after "查询线索" or similar)
  const keywordMatch = text.match(/(?:查询|查找|搜索|找)(?:线索|客户|任务|订单|报价)\s*[：:]?\s*(?:最近\s*\d+\s*条\s*)?(?:只显示\S+\s*)?[""「]?(.+?)[""」]?\s*$/);
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
    params.fields = fieldsMatch[1].split(/[、，,和]/).map(f => f.trim()).filter(Boolean);
  }

  return params;
}

export function getHelpText(): string {
  return `🤖 CRM助手功能：

📋 查询类：
• 查询线索 — 支持公司名、数量、状态筛选
• 查询客户 — 支持公司名、阶段筛选
• 查询任务 — 支持今天/逾期/全部筛选
• 查询订单 — 支持订单号、状态筛选
• 查询报价 — 支持报价号、状态筛选

💡 使用示例：
• 查询最近3条线索
• 查询线索"ABC公司"
• 查询今天未完成任务
• 查询逾期任务

⚠️ 当前为只读模式，写入操作请在CRM网页中完成。`;
}
