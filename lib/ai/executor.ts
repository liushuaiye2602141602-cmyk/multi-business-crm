import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import type { IntentResult } from "./intent";

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function executeIntent(result: IntentResult): Promise<ExecutionResult> {
  switch (result.intent) {
    case "create_lead":
      return executeCreateLead(result.args);
    case "create_customer":
      return executeCreateCustomer(result.args);
    case "create_order":
      return executeCreateOrder(result.args);
    case "add_followup":
      return executeAddFollowup(result.args);
    case "query_leads":
      return executeQueryLeads(result.args);
    case "query_customers":
      return executeQueryCustomers(result.args);
    case "query_orders":
      return executeQueryOrders(result.args);
    case "query_tasks":
      return executeQueryTasks(result.args);
    case "help":
      return executeHelp();
    default:
      return {
        success: false,
        message: "抱歉，我没有理解您的意思。您可以尝试：\n- 添加线索：xxx公司，美国，john@xxx.com\n- 查询订单进度\n- 查看今日任务\n\n输入「帮助」查看更多功能。",
      };
  }
}

async function executeCreateLead(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const contactName = args.contactName as string;
  if (!company || !contactName) {
    return { success: false, message: "创建线索需要公司名称和联系人姓名。示例：添加线索，ABC公司，John，美国" };
  }
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线，请先在系统中创建业务线。" };
  }
  try {
    const lead = await prisma.lead.create({
      data: {
        company,
        contactName,
        country: (args.country as string) || null,
        email: (args.email as string) || null,
        phone: (args.phone as string) || null,
        whatsapp: (args.whatsapp as string) || null,
        requirement: (args.requirement as string) || null,
        interestProducts: (args.interestProducts as string) || null,
        remark: (args.remark as string) || null,
        source: "MANUAL_OUTREACH",
        status: "NEW",
        temperature: "WARM",
        grade: "C",
        businessLineId: businessLine.id,
      },
    });
    await createActivityLog({
      action: "IM 创建",
      entityType: "线索",
      entityId: lead.id,
      entityName: lead.company,
      description: `通过 IM 创建线索: ${lead.company}`,
    });
    return {
      success: true,
      message: `✅ 线索已创建\n公司：${lead.company}\n联系人：${lead.contactName}\n国家：${lead.country || "未填写"}\nID：${lead.id}`,
      data: lead,
    };
  } catch (error) {
    return { success: false, message: `创建线索失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeCreateCustomer(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const contactName = args.contactName as string;
  if (!company || !contactName) {
    return { success: false, message: "创建客户需要公司名称和联系人姓名。示例：添加客户，XYZ集团，Tom" };
  }
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线，请先在系统中创建业务线。" };
  }
  try {
    const customer = await prisma.customer.create({
      data: {
        company,
        contactName,
        country: (args.country as string) || null,
        email: (args.email as string) || null,
        phone: (args.phone as string) || null,
        whatsapp: (args.whatsapp as string) || null,
        website: (args.website as string) || null,
        industry: (args.industry as string) || null,
        remark: (args.remark as string) || null,
        customerType: "UNKNOWN",
        customerStatus: "POTENTIAL",
        leadGrade: "C",
        businessLineId: businessLine.id,
      },
    });
    await createActivityLog({
      action: "IM 创建",
      entityType: "客户",
      entityId: customer.id,
      entityName: customer.company,
      description: `通过 IM 创建客户: ${customer.company}`,
    });
    return {
      success: true,
      message: `✅ 客户已创建\n公司：${customer.company}\n联系人：${customer.contactName}\n国家：${customer.country || "未填写"}\nID：${customer.id}`,
      data: customer,
    };
  } catch (error) {
    return { success: false, message: `创建客户失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeCreateOrder(args: Record<string, unknown>): Promise<ExecutionResult> {
  const customerName = args.customerName as string;
  if (!customerName) {
    return { success: false, message: "创建订单需要客户名称。示例：帮ABC公司建个订单，产品XX，数量100" };
  }
  const customer = await prisma.customer.findFirst({
    where: { company: { contains: customerName, mode: "insensitive" } },
  });
  if (!customer) {
    return { success: false, message: `未找到客户「${customerName}」，请确认客户名称或先创建客户。` };
  }
  try {
    const orderCount = await prisma.order.count();
    const orderNo = `ORD-${String(orderCount + 1).padStart(6, "0")}`;
    const items = (args.items as Array<{ itemName: string; quantity?: number; unitPrice?: number }>) || [];
    const currency = (args.currency as string) || "USD";
    const order = await prisma.order.create({
      data: {
        orderNo,
        orderTitle: (args.orderTitle as string) || `${customer.company} 订单`,
        customerId: customer.id,
        orderStatus: "DRAFT",
        currency: currency as any,
        notes: (args.notes as string) || null,
        totalAmount: items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || null,
        items: {
          create: items.map((item, index) => ({
            itemName: item.itemName,
            quantity: item.quantity || null,
            unitPrice: item.unitPrice || null,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0) || null,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });
    await createActivityLog({
      action: "IM 创建",
      entityType: "订单",
      entityId: order.id,
      entityName: order.orderNo,
      description: `通过 IM 创建订单: ${order.orderNo} (客户: ${customer.company})`,
    });
    const itemText = items.length > 0
      ? `\n明细：${items.map(i => `${i.itemName}${i.quantity ? ` x${i.quantity}` : ""}`).join("、")}`
      : "";
    return {
      success: true,
      message: `✅ 订单已创建\n单号：${order.orderNo}\n客户：${customer.company}\n状态：草稿${itemText}`,
      data: order,
    };
  } catch (error) {
    return { success: false, message: `创建订单失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeAddFollowup(args: Record<string, unknown>): Promise<ExecutionResult> {
  const targetName = args.targetName as string;
  const content = args.content as string;
  if (!targetName || !content) {
    return { success: false, message: "添加跟进需要客户名称和跟进内容。示例：给ABC加跟进：今天电话沟通了价格" };
  }
  const customer = await prisma.customer.findFirst({
    where: { company: { contains: targetName, mode: "insensitive" } },
  });
  const lead = !customer
    ? await prisma.lead.findFirst({ where: { company: { contains: targetName, mode: "insensitive" } } })
    : null;
  if (!customer && !lead) {
    return { success: false, message: `未找到「${targetName}」对应的客户或线索。` };
  }
  try {
    const followUp = await prisma.followUp.create({
      data: {
        content,
        method: (args.method as any) || "OTHER",
        nextAction: (args.nextAction as string) || null,
        customerId: customer?.id || null,
        leadId: lead?.id || null,
      },
    });
    await createActivityLog({
      action: "IM 创建",
      entityType: "跟进",
      entityId: followUp.id,
      entityName: targetName,
      description: `通过 IM 添加跟进: ${targetName} - ${content.slice(0, 50)}`,
    });
    return {
      success: true,
      message: `✅ 跟进记录已添加\n对象：${customer ? "客户" : "线索"} ${targetName}\n内容：${content}`,
      data: followUp,
    };
  } catch (error) {
    return { success: false, message: `添加跟进失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryLeads(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = {};
  if (args.status) where.status = args.status;
  try {
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, company: true, contactName: true, country: true, status: true, temperature: true, createdAt: true },
    });
    const total = await prisma.lead.count({ where });
    if (leads.length === 0) {
      return { success: true, message: "📋 暂无线索记录。" };
    }
    const lines = leads.map((l, i) => `${i + 1}. ${l.company} (${l.contactName}) - ${l.country || "未知"} [${l.status}]`);
    return {
      success: true,
      message: `📋 线索列表（共 ${total} 条，显示前 ${leads.length} 条）\n\n${lines.join("\n")}`,
      data: leads,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryCustomers(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = {};
  if (args.company) where.company = { contains: args.company as string, mode: "insensitive" };
  if (args.status) where.customerStatus = args.status;
  try {
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, company: true, contactName: true, country: true, customerStatus: true, leadGrade: true },
    });
    const total = await prisma.customer.count({ where });
    if (customers.length === 0) {
      return { success: true, message: "📋 暂无客户记录。" };
    }
    const lines = customers.map((c, i) => `${i + 1}. ${c.company} (${c.contactName}) - ${c.country || "未知"} [${c.customerStatus}] 等级:${c.leadGrade}`);
    return {
      success: true,
      message: `📋 客户列表（共 ${total} 条，显示前 ${customers.length} 条）\n\n${lines.join("\n")}`,
      data: customers,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryOrders(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = {};
  if (args.status) where.orderStatus = args.status;
  if (args.customerName) {
    const customer = await prisma.customer.findFirst({
      where: { company: { contains: args.customerName as string, mode: "insensitive" } },
    });
    if (customer) {
      where.customerId = customer.id;
    } else {
      return { success: true, message: `未找到客户「${args.customerName}」。` };
    }
  }
  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: { select: { company: true } },
        items: { select: { itemName: true, quantity: true } },
      },
    });
    const total = await prisma.order.count({ where });
    if (orders.length === 0) {
      return { success: true, message: "📋 暂无订单记录。" };
    }
    const statusMap: Record<string, string> = {
      DRAFT: "草稿", CONFIRMED: "已确认", PRODUCTION: "生产中",
      READY_TO_SHIP: "待发货", SHIPPED: "已发货", COMPLETED: "已完成", CANCELLED: "已取消",
    };
    const lines = orders.map(
      (o, i) => `${i + 1}. ${o.orderNo} - ${o.customer.company} [${statusMap[o.orderStatus] || o.orderStatus}] ${o.totalAmount ? `${o.currency} ${o.totalAmount}` : ""}`
    );
    return {
      success: true,
      message: `📋 订单列表（共 ${total} 条，显示前 ${orders.length} 条）\n\n${lines.join("\n")}`,
      data: orders,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryTasks(args: Record<string, unknown>): Promise<ExecutionResult> {
  const status = (args.status as string) || undefined;
  try {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ["PENDING", "IN_PROGRESS"] };
    }
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      take: 10,
      include: {
        lead: { select: { company: true } },
        customer: { select: { company: true } },
        project: { select: { name: true } },
      },
    });
    if (tasks.length === 0) {
      return { success: true, message: "📋 当前没有待办任务。" };
    }
    const priorityMap: Record<string, string> = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", URGENT: "🔴" };
    const lines = tasks.map((t) => {
      const related = t.lead?.company || t.customer?.company || t.project?.name || "";
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "";
      return `${priorityMap[t.priority] || "⚪"} ${t.title}${related ? ` (${related})` : ""}${due ? ` 截止:${due}` : ""}`;
    });
    return {
      success: true,
      message: `📋 待办任务（${tasks.length} 条）\n\n${lines.join("\n")}`,
      data: tasks,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

function executeHelp(): ExecutionResult {
  return {
    success: true,
    message: `🤖 外贸 CRM AI 助手

我可以帮您完成以下操作：

📝 创建类：
• "添加线索，ABC公司，美国，john@abc.com"
• "添加客户，XYZ集团，英国"
• "建个订单，客户ABC，产品XX，数量100"
• "给ABC加跟进：今天电话沟通了价格"

🔍 查询类：
• "查看线索列表"
• "ABC公司的订单进度怎么样"
• "我今天有什么任务"
• "本月新增了多少客户"

输入任何问题，我会尽力帮助您！`,
  };
}
