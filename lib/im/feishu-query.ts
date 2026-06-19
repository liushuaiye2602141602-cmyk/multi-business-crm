import prisma from "@/lib/prisma";
import { getLocalWorkspaceId } from "@/lib/local-context";

// Chinese enum mappings
const LEAD_STATUS_MAP: Record<string, string> = {
  NEW: "新线索", CONTACTED: "已联系", REQUIREMENT_CONFIRMING: "需求确认中",
  QUOTING: "报价中", NEGOTIATING: "谈判中", QUALIFIED: "已确认有效",
  CONVERTED: "已转客户", WON: "已成交", LOST: "已丢失", DORMANT: "休眠",
};

const TASK_STATUS_MAP: Record<string, string> = {
  PENDING: "待处理", IN_PROGRESS: "进行中", COMPLETED: "已完成", CANCELLED: "已取消",
};

const TASK_PRIORITY_MAP: Record<string, string> = {
  LOW: "低", MEDIUM: "中", HIGH: "高", URGENT: "紧急",
};

const CUSTOMER_STAGE_MAP: Record<string, string> = {
  POTENTIAL: "潜在客户", INTENT: "意向客户",
  FIRST_DEAL: "初次成交", REPEAT_DEAL: "多次成交", VIP: "VIP客户",
};

const QUOTE_STATUS_MAP: Record<string, string> = {
  DRAFT: "草稿", SENT: "已发送", WAITING_FEEDBACK: "等待反馈",
  REVISED: "已修订", ACCEPTED: "已接受", REJECTED: "已拒绝", EXPIRED: "已过期",
};

const ORDER_STATUS_MAP: Record<string, string> = {
  DRAFT: "草稿", CONFIRMED: "已确认", PRODUCTION: "生产中",
  READY_TO_SHIP: "待发货", SHIPPED: "已发货", COMPLETED: "已完成", CANCELLED: "已取消",
};

export async function executeReadOnlyQuery(parsed: { intent: string; parameters: Record<string, unknown> }): Promise<string> {
  const tenantId = getLocalWorkspaceId();
  const limit = (parsed.parameters.limit as number) || 10;
  const fields = (parsed.parameters.fields as string[]) || [];
  const keyword = (parsed.parameters.keyword as string) || (parsed.parameters.exactName as string);

  try {
    switch (parsed.intent) {
      case "QUERY_LEADS":
        return await queryLeads(tenantId, limit, keyword, fields);
      case "QUERY_CUSTOMERS":
        return await queryCustomers(tenantId, limit, keyword, fields);
      case "QUERY_TASKS":
        return await queryTasks(tenantId, parsed.parameters.dateScope as string, parsed.parameters.statusScope as string, fields);
      case "QUERY_ORDERS":
        return await queryOrders(tenantId, limit, keyword, fields);
      case "QUERY_QUOTES":
        return await queryQuotes(tenantId, limit, keyword, fields);
      default:
        return "暂不支持该查询类型。";
    }
  } catch (error) {
    console.error("❌ 查询执行失败:", error);
    return "查询执行出错，请稍后重试。";
  }
}

async function queryLeads(tenantId: number, limit: number, keyword?: string, fields?: string[]) {
  const where: Record<string, unknown> = { tenantId };
  if (keyword) {
    where.OR = [
      { company: { contains: keyword, mode: "insensitive" } },
      { contactName: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (leads.length === 0) {
    return keyword ? `未找到包含"${keyword}"的线索。` : "暂无线索。";
  }

  const useFields = fields && fields.length > 0;
  return leads.map((l, i) => {
    const lines = [`${i + 1}. 公司：${l.company}`];
    if (!useFields || fields!.some(f => f.includes("联系人"))) lines.push(`   联系人：${l.contactName || "暂无"}`);
    if (!useFields || fields!.some(f => f.includes("状态"))) lines.push(`   状态：${LEAD_STATUS_MAP[l.status] || l.status}`);
    if (useFields && fields!.some(f => f.includes("电话"))) lines.push(`   电话：${l.phone || "暂无"}`);
    if (useFields && fields!.some(f => f.includes("邮箱"))) lines.push(`   邮箱：${l.email || "暂无"}`);
    if (useFields && fields!.some(f => f.includes("跟进"))) lines.push(`   下次跟进：${l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString("zh-CN") : "暂无"}`);
    return lines.join("\n");
  }).join("\n\n");
}

async function queryCustomers(tenantId: number, limit: number, keyword?: string, fields?: string[]) {
  const where: Record<string, unknown> = { tenantId };
  if (keyword) {
    where.OR = [
      { company: { contains: keyword, mode: "insensitive" } },
      { contactName: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { contacts: { where: { isPrimary: true }, take: 1 } },
  });

  if (customers.length === 0) {
    return keyword ? `未找到包含"${keyword}"的客户。` : "暂无客户。";
  }

  const useFields = fields && fields.length > 0;
  return customers.map((c, i) => {
    const primaryContact = c.contacts?.[0];
    const lines = [`${i + 1}. 公司：${c.company}`];
    if (!useFields || fields!.some(f => f.includes("联系人") || f.includes("主联系人"))) {
      lines.push(`   主联系人：${primaryContact?.name || c.contactName || "暂无"}`);
    }
    if (!useFields || fields!.some(f => f.includes("阶段"))) lines.push(`   阶段：${CUSTOMER_STAGE_MAP[c.lifecycleStage] || c.lifecycleStage}`);
    if (useFields && fields!.some(f => f.includes("国家"))) lines.push(`   国家：${c.country || "暂无"}`);
    if (useFields && fields!.some(f => f.includes("邮箱"))) lines.push(`   邮箱：${c.email || "暂无"}`);
    return lines.join("\n");
  }).join("\n\n");
}

async function queryTasks(tenantId: number, dateScope?: string, statusScope?: string, fields?: string[]) {
  const where: Record<string, unknown> = { tenantId };

  // Status filter
  if (statusScope === "UNFINISHED") {
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
  } else if (statusScope === "COMPLETED") {
    where.status = "COMPLETED";
  }

  // Date filter - IMPORTANT: "today" tasks should NOT include overdue
  const now = new Date();
  if (dateScope === "TODAY") {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    where.dueDate = { gte: todayStart, lt: todayEnd };
    // Ensure only unfinished tasks for today
    if (!statusScope || statusScope === "ALL") {
      where.status = { in: ["PENDING", "IN_PROGRESS"] };
    }
  } else if (dateScope === "OVERDUE") {
    where.dueDate = { lt: now };
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
  } else if (dateScope === "UPCOMING") {
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    where.dueDate = { gte: now, lte: nextWeek };
  } else {
    // ALL scope: default to unfinished only
    if (!statusScope || statusScope === "ALL") {
      where.status = { in: ["PENDING", "IN_PROGRESS"] };
    }
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { dueDate: "asc" },
    take: 20,
  });

  if (tasks.length === 0) {
    const scopeLabel = dateScope === "TODAY" ? "今天" : dateScope === "OVERDUE" ? "逾期" : dateScope === "UPCOMING" ? "未来" : "";
    return `暂无${scopeLabel}任务。`;
  }

  const useFields = fields && fields.length > 0;
  return tasks.map((t, i) => {
    const lines = [`${i + 1}. ${t.title}`];
    if (!useFields || fields!.some(f => f.includes("优先级"))) lines.push(`   优先级：${TASK_PRIORITY_MAP[t.priority] || t.priority}`);
    if (!useFields || fields!.some(f => f.includes("状态"))) lines.push(`   状态：${TASK_STATUS_MAP[t.status] || t.status}`);
    if (!useFields || fields!.some(f => f.includes("截止"))) lines.push(`   截止：${t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "暂无"}`);
    return lines.join("\n");
  }).join("\n\n");
}

async function queryOrders(tenantId: number, limit: number, keyword?: string, _fields?: string[]) {
  const where: Record<string, unknown> = { tenantId };
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: "insensitive" } },
      { orderTitle: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (orders.length === 0) return keyword ? `未找到包含"${keyword}"的订单。` : "暂无订单。";

  return orders.map((o, i) => `${i + 1}. ${o.orderNo} - ${o.orderTitle || "无标题"} [${ORDER_STATUS_MAP[o.orderStatus] || o.orderStatus}] ${o.currency} ${o.totalAmount || 0}`).join("\n");
}

async function queryQuotes(tenantId: number, limit: number, keyword?: string, _fields?: string[]) {
  const where: Record<string, unknown> = { tenantId };
  if (keyword) {
    where.OR = [
      { quoteNo: { contains: keyword, mode: "insensitive" } },
      { quoteTitle: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (quotes.length === 0) return keyword ? `未找到包含"${keyword}"的报价。` : "暂无报价。";

  return quotes.map((q, i) => `${i + 1}. ${q.quoteNo} - ${q.quoteTitle || "无标题"} [${QUOTE_STATUS_MAP[q.status] || q.status}] ${q.currency} ${q.totalPrice || 0}`).join("\n");
}
