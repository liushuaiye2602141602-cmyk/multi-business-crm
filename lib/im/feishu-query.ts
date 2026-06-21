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
  REVISED: "已修订", ACCEPTED: "已接受", CONVERTED: "已转订单", REJECTED: "已拒绝", EXPIRED: "已过期",
};

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING_CONFIRMATION: "待确认", CONFIRMED: "已确认", IN_PRODUCTION: "生产中",
  READY_TO_SHIP: "待发货", SHIPPED: "已发货", COMPLETED: "已完成", CANCELLED: "已取消",
};

export async function executeReadOnlyQuery(parsed: { intent: string; parameters: Record<string, unknown> }, context?: { senderId?: string; chatId?: string; messageId?: string }): Promise<string> {
  const tenantId = getLocalWorkspaceId();
  const limit = (parsed.parameters.limit as number) || 10;
  const fields = (parsed.parameters.fields as string[]) || [];
  const keyword = (parsed.parameters.keyword as string) || (parsed.parameters.exactName as string);

  try {
    switch (parsed.intent) {
      case "QUERY_LEAD_DETAIL":
      case "QUERY_CUSTOMER_DETAIL":
      case "QUERY_CONTACT_DETAIL":
      case "QUERY_CUSTOMER_CONTACTS":
      case "QUERY_TASK_DETAIL":
      case "QUERY_QUOTE_DETAIL":
      case "QUERY_ORDER_DETAIL": {
        if (parsed.intent === "QUERY_TASK_DETAIL") {
          const taskId = (parsed.parameters as any).id || (parsed.parameters as any).taskReference?.id || (parsed.parameters as any).entityQuery?.entityReference?.id;
          if (taskId && context?.senderId && context.chatId) {
            const { rememberTaskContextById } = await import("@/lib/services/task-project-flow-service");
            await rememberTaskContextById(taskId, context);
          }
        } else if (parsed.intent === "QUERY_QUOTE_DETAIL") {
          const { resolveQuoteReferenceForQuery } = await import("@/lib/services/quote-order-flow-service");
          const quoteRef = resolveQuoteReferenceForQuery(
            (parsed.parameters as any).quoteReference || (parsed.parameters as any).entityQuery?.entityReference,
            context,
          );
          if (!quoteRef.ref) return quoteRef.message || "请提供报价ID。";
          parsed = {
            ...parsed,
            parameters: {
              ...parsed.parameters,
              quoteReference: quoteRef.ref,
              id: quoteRef.ref.id as any,
              keyword: (quoteRef.ref.number || quoteRef.ref.name || quoteRef.ref.customerName || quoteRef.ref.companyName) as any,
              entityQuery: {
                ...(parsed.parameters as any).entityQuery,
                entityReference: {
                  ...(parsed.parameters as any).entityQuery?.entityReference,
                  ...quoteRef.ref,
                },
              },
            },
          };
          const quoteId = (parsed.parameters as any).id || (parsed.parameters as any).quoteReference?.id || (parsed.parameters as any).entityQuery?.entityReference?.id;
          if (quoteId && context?.senderId && context.chatId) {
            const { rememberQuoteContextById } = await import("@/lib/services/quote-order-flow-service");
            await rememberQuoteContextById(quoteId, context);
          }
        } else if (parsed.intent === "QUERY_ORDER_DETAIL") {
          const { resolveOrderReferenceForQuery } = await import("@/lib/services/quote-order-flow-service");
          const orderRef = resolveOrderReferenceForQuery(
            (parsed.parameters as any).orderReference || (parsed.parameters as any).entityQuery?.entityReference,
            context,
          );
          if (!orderRef.ref) return orderRef.message || "请提供订单ID。";
          parsed = {
            ...parsed,
            parameters: {
              ...parsed.parameters,
              orderReference: orderRef.ref,
              id: orderRef.ref.id as any,
              keyword: (orderRef.ref.number || orderRef.ref.name || orderRef.ref.customerName || orderRef.ref.companyName) as any,
              entityQuery: {
                ...(parsed.parameters as any).entityQuery,
                entityReference: {
                  ...(parsed.parameters as any).entityQuery?.entityReference,
                  ...orderRef.ref,
                },
              },
            },
          };
          const orderId = (parsed.parameters as any).id || (parsed.parameters as any).orderReference?.id || (parsed.parameters as any).entityQuery?.entityReference?.id;
          if (orderId && context?.senderId && context.chatId) {
            const { rememberOrderContextById } = await import("@/lib/services/quote-order-flow-service");
            await rememberOrderContextById(orderId, context);
          }
        }
        const { executeEntityDetailQuery } = await import("./feishu-entity-query");
        return await executeEntityDetailQuery(parsed as any);
      }
      case "QUERY_LEADS":
        return await queryLeads(tenantId, limit, keyword, fields);
      case "QUERY_CUSTOMERS":
        return await queryCustomers(tenantId, limit, keyword, fields);
      case "QUERY_TASKS":
        return await queryTasks(tenantId, parsed.parameters.dateScope as string, parsed.parameters.statusScope as string, fields);
      case "QUERY_PROJECTS":
        return await queryProjects(tenantId, limit, keyword, parsed.parameters);
      case "QUERY_ORDERS":
        return await queryOrders(tenantId, limit, keyword, fields, parsed.parameters.status as string | undefined);
      case "QUERY_QUOTE":
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
  } else if (dateScope === "TOMORROW") {
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    where.dueDate = { gte: tomorrowStart, lt: tomorrowEnd };
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

  const taskRows = await prisma.task.findMany({
    where,
    orderBy: { dueDate: "asc" },
    take: 20,
  });
  const tasks = Array.from(new Map(taskRows.map((task) => [task.id, task])).values());

  if (tasks.length === 0) {
    const scopeLabel = dateScope === "TODAY" ? "今天" : dateScope === "TOMORROW" ? "明天" : dateScope === "OVERDUE" ? "逾期" : dateScope === "UPCOMING" ? "未来" : "";
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

async function queryProjects(tenantId: number, limit: number, keyword?: string, parameters: Record<string, unknown> = {}) {
  const where: Record<string, any> = {};
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { customer: { company: { contains: keyword, mode: "insensitive" } } },
      { lead: { company: { contains: keyword, mode: "insensitive" } } },
    ];
  }
  if (parameters.stage) where.status = parameters.stage;
  if (parameters.minAmount) where.amount = { gte: parameters.minAmount as number };
  if (parameters.dateScope === "THIS_MONTH") {
    const now = new Date();
    where.endDate = {
      gte: new Date(now.getFullYear(), now.getMonth(), 1),
      lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { customer: true, lead: true, tasks: true },
  });

  if (projects.length === 0) return keyword ? `未找到匹配“${keyword}”的商机项目。` : "暂无商机项目。";

  const stageMap: Record<string, string> = {
    REQUIREMENT_CONFIRMING: "需求确认",
    QUOTING: "报价中",
    SAMPLE_TESTING: "样品确认",
    WAITING_FEEDBACK: "方案沟通",
    NEGOTIATING: "谈判中",
    WON: "已赢单",
    LOST: "已丢单",
    PAUSED: "暂停",
  };

  const includeTasks = parameters.includeTasks === true;
  return projects.map((project, index) => {
    const unfinishedTasks = project.tasks.filter((task) => task.status === "PENDING" || task.status === "IN_PROGRESS");
    return [
      `${index + 1}. 项目：${project.name}`,
      `   项目ID：${project.id}`,
      `   关联客户：${project.customer?.company || "暂无"}`,
      project.lead ? `   来源线索：${project.lead.company}` : undefined,
      `   阶段：${stageMap[project.status] || project.status}`,
      `   预计金额：${project.amount ?? "未填写"} ${project.currency}`,
      `   预计成交时间：${project.endDate ? project.endDate.toLocaleDateString("zh-CN") : "未填写"}`,
      `   下一步动作：${project.remark || "未填写"}`,
      `   相关任务数：${project.tasks.length}`,
      includeTasks ? `   未完成任务：${unfinishedTasks.length ? unfinishedTasks.map((task) => `${task.title}（${TASK_STATUS_MAP[task.status] || task.status}）`).join("；") : "暂无"}` : undefined,
      `   最近更新：${project.updatedAt.toLocaleString("zh-CN", { hour12: false })}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

async function queryOrders(tenantId: number, limit: number, keyword?: string, _fields?: string[], status?: string) {
  const where: Record<string, unknown> = { tenantId };
  if (status) where.orderStatus = status;
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: "insensitive" } },
      { orderTitle: { contains: keyword, mode: "insensitive" } },
      { customer: { company: { contains: keyword, mode: "insensitive" } } },
      { quote: { quoteNo: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { customer: true, quote: true, items: true },
  });

  if (orders.length === 0) return keyword ? `未找到包含"${keyword}"的订单。` : "暂无订单。";

  return orders.map((o, i) => [
    `${i + 1}. ${o.orderNo} - ${o.orderTitle || "无标题"} [${ORDER_STATUS_MAP[o.orderStatus] || o.orderStatus}]`,
    `   客户：${o.customer?.company || "暂未关联"}`,
    `   来源报价：${o.quote?.quoteNo || "无"}`,
    `   金额：${o.currency} ${o.totalAmount || 0}`,
    `   明细：${o.items.length}项`,
  ].join("\n")).join("\n\n");
}

async function queryQuotes(tenantId: number, limit: number, keyword?: string, _fields?: string[]) {
  const where: Record<string, unknown> = { tenantId };
  if (keyword) {
    where.OR = [
      { quoteNo: { contains: keyword, mode: "insensitive" } },
      { quoteTitle: { contains: keyword, mode: "insensitive" } },
      { customer: { company: { contains: keyword, mode: "insensitive" } } },
      { project: { name: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { customer: true, project: true, items: true, orders: true },
  });

  if (quotes.length === 0) return keyword ? `未找到包含"${keyword}"的报价。` : "暂无报价。";

  return quotes.map((q, i) => [
    `${i + 1}. ${q.quoteNo} - ${q.quoteTitle || "无标题"} [${QUOTE_STATUS_MAP[q.status] || q.status}]`,
    `   客户：${q.customer?.company || "暂未关联"}`,
    `   项目：${q.project?.name || "未关联"}`,
    `   金额：${q.currency} ${q.totalPrice || 0}`,
    `   明细：${q.items.length}项`,
    `   已转订单：${q.orders.length ? q.orders.map((order) => order.orderNo).join("、") : "否"}`,
  ].join("\n")).join("\n\n");
}
