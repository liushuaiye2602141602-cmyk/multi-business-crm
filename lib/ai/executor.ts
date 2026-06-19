import { getLocalWorkspaceId } from "@/lib/local-context";
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
    case "update_order_status":
      return executeUpdateOrderStatus(result.args);
    case "update_customer_grade":
      return executeUpdateCustomerGrade(result.args);
    case "complete_task":
      return executeCompleteTask(result.args);
    case "create_quote":
      return executeCreateQuote(result.args);
    case "query_pool":
      return executeQueryPool(result.args);
    case "claim_customer":
      return executeClaimCustomer(result.args);
    case "return_to_pool":
      return executeReturnToPool(result.args);
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
        tenantId: getLocalWorkspaceId(),
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
        tenantId: getLocalWorkspaceId(),
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
        tenantId: getLocalWorkspaceId(),
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

async function executeUpdateOrderStatus(args: Record<string, unknown>): Promise<ExecutionResult> {
  const orderNo = args.orderNo as string;
  const status = args.status as string;
  if (!orderNo || !status) {
    return { success: false, message: "更新订单状态需要订单编号和新状态。示例：把 ORD-000001 标记为已发货" };
  }
  const validStatuses = ["DRAFT", "CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return { success: false, message: `无效的状态「${status}」，有效状态：${validStatuses.join(", ")}` };
  }
  try {
    const order = await prisma.order.findFirst({
      where: { orderNo: { equals: orderNo, mode: "insensitive" } },
      include: { customer: { select: { company: true } } },
    });
    if (!order) {
      return { success: false, message: `未找到订单「${orderNo}」。` };
    }
    const oldStatus = order.orderStatus;
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { orderStatus: status as any },
    });
    await createActivityLog({
      action: "IM 更新",
      entityType: "订单",
      entityId: order.id,
      entityName: order.orderNo,
      description: `通过 IM 更新订单状态: ${order.orderNo} ${oldStatus} → ${status}`,
    });
    return {
      success: true,
      message: `✅ 订单状态已更新\n单号：${order.orderNo}\n客户：${order.customer.company}\n状态：${oldStatus} → ${status}`,
      data: updatedOrder,
    };
  } catch (error) {
    return { success: false, message: `更新订单状态失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeUpdateCustomerGrade(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const grade = args.grade as string;
  if (!company || !grade) {
    return { success: false, message: "更新客户等级需要公司名称和新等级。示例：把ABC公司升级为A级" };
  }
  const validGrades = ["A", "B", "C", "D"];
  if (!validGrades.includes(grade)) {
    return { success: false, message: `无效的等级「${grade}」，有效等级：${validGrades.join(", ")}` };
  }
  try {
    const customer = await prisma.customer.findFirst({
      where: { company: { contains: company, mode: "insensitive" } },
    });
    if (!customer) {
      return { success: false, message: `未找到客户「${company}」。` };
    }
    const oldGrade = customer.leadGrade;
    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: { leadGrade: grade as any },
    });
    await createActivityLog({
      action: "IM 更新",
      entityType: "客户",
      entityId: customer.id,
      entityName: customer.company,
      description: `通过 IM 更新客户等级: ${customer.company} ${oldGrade} → ${grade}`,
    });
    return {
      success: true,
      message: `✅ 客户等级已更新\n公司：${customer.company}\n等级：${oldGrade} → ${grade}`,
      data: updatedCustomer,
    };
  } catch (error) {
    return { success: false, message: `更新客户等级失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeCompleteTask(args: Record<string, unknown>): Promise<ExecutionResult> {
  const taskTitle = args.taskTitle as string;
  if (!taskTitle) {
    return { success: false, message: "完成任务需要任务标题。示例：完成任务 回复客户报价" };
  }
  try {
    const task = await prisma.task.findFirst({
      where: {
        title: { contains: taskTitle, mode: "insensitive" },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });
    if (!task) {
      return { success: false, message: `未找到匹配「${taskTitle}」的待办任务。` };
    }
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await createActivityLog({
      action: "IM 完成",
      entityType: "任务",
      entityId: task.id,
      entityName: task.title,
      description: `通过 IM 标记任务完成: ${task.title}`,
    });
    return {
      success: true,
      message: `✅ 任务已完成\n标题：${task.title}`,
      data: updatedTask,
    };
  } catch (error) {
    return { success: false, message: `完成任务失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeCreateQuote(args: Record<string, unknown>): Promise<ExecutionResult> {
  const customerName = args.customerName as string;
  if (!customerName) {
    return { success: false, message: "创建报价单需要客户名称。示例：给ABC公司报价，产品XX，数量100，单价50" };
  }
  const customer = await prisma.customer.findFirst({
    where: { company: { contains: customerName, mode: "insensitive" } },
  });
  if (!customer) {
    return { success: false, message: `未找到客户「${customerName}」，请确认客户名称或先创建客户。` };
  }
  try {
    const quoteCount = await prisma.quote.count();
    const quoteNo = `QUOTE-${String(quoteCount + 1).padStart(6, "0")}`;
    const items = (args.items as Array<{ itemName: string; quantity?: number; unitPrice?: number; unit?: string }>) || [];
    const currency = (args.currency as string) || "USD";
    const validDays = (args.validDays as number) || 30;
    const totalPrice = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    const quote = await prisma.quote.create({
      data: {
        tenantId: getLocalWorkspaceId(),
        quoteNo,
        quoteTitle: `${customer.company} 报价`,
        customerId: customer.id,
        status: "DRAFT",
        currency: currency as any,
        totalPrice: totalPrice || null,
        validDays,
        remarks: (args.notes as string) || null,
        items: {
          create: items.map((item, index) => ({
            itemName: item.itemName,
            quantity: item.quantity || null,
            unitPrice: item.unitPrice || null,
            unit: item.unit || null,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0) || null,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });
    await createActivityLog({
      action: "IM 创建",
      entityType: "报价",
      entityId: quote.id,
      entityName: quote.quoteNo,
      description: `通过 IM 创建报价: ${quote.quoteNo} (客户: ${customer.company})`,
    });
    const itemText = items.length > 0
      ? `\n明细：${items.map(i => `${i.itemName}${i.quantity ? ` x${i.quantity}` : ""}${i.unitPrice ? ` @${i.unitPrice}` : ""}`).join("、")}`
      : "";
    return {
      success: true,
      message: `✅ 报价单已创建\n单号：${quote.quoteNo}\n客户：${customer.company}\n金额：${currency} ${totalPrice}\n有效期：${validDays}天${itemText}`,
      data: quote,
    };
  } catch (error) {
    return { success: false, message: `创建报价单失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

// ==================== 客户公海操作 ====================

async function executeQueryPool(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = { ownerId: null };
  if (args.country) where.country = { contains: args.country as string, mode: "insensitive" };
  try {
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, company: true, contactName: true, country: true, industry: true, leadGrade: true, customerStatus: true, poolEnteredAt: true },
    });
    const total = await prisma.customer.count({ where });
    if (customers.length === 0) {
      return { success: true, message: "📋 公海暂无客户。" };
    }
    const lines = customers.map((c, i) => `${i + 1}. ${c.company} (${c.contactName}) - ${c.country || "未知"} 行业:${c.industry || "-"} 等级:${c.leadGrade}`);
    return {
      success: true,
      message: `📋 公海客户列表（共 ${total} 条，显示前 ${customers.length} 条）\n\n${lines.join("\n")}`,
      data: customers,
    };
  } catch (error) {
    return { success: false, message: `查询公海失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeClaimCustomer(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const ownerName = args.ownerName as string;
  if (!company || !ownerName) {
    return { success: false, message: "认领客户需要公司名称和认领人姓名。示例：认领ABC公司，我是张三" };
  }
  try {
    const customer = await prisma.customer.findFirst({
      where: { company: { contains: company, mode: "insensitive" }, ownerId: null },
    });
    if (!customer) {
      return { success: false, message: `未找到公海中名为「${company}」的客户。` };
    }
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ownerId: 1, // 默认用户ID，待接入认证后替换
        ownerName,
        poolEnteredAt: null,
        poolReason: null,
      },
    });
    await createActivityLog({
      action: "IM 认领",
      entityType: "客户",
      entityId: customer.id,
      entityName: customer.company,
      description: `${ownerName} 通过 IM 从公海认领了客户: ${customer.company}`,
    });
    return {
      success: true,
      message: `✅ 客户已认领\n公司：${customer.company}\n认领人：${ownerName}`,
      data: customer,
    };
  } catch (error) {
    return { success: false, message: `认领客户失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeReturnToPool(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const reason = (args.reason as string) || "manual";
  if (!company) {
    return { success: false, message: "退回公海需要客户公司名称。示例：把ABC公司退回公海" };
  }
  try {
    const customer = await prisma.customer.findFirst({
      where: { company: { contains: company, mode: "insensitive" } },
    });
    if (!customer) {
      return { success: false, message: `未找到客户「${company}」。` };
    }
    if (!customer.ownerId) {
      return { success: true, message: `客户「${company}」已在公海中，无需退回。` };
    }
    const oldOwner = customer.ownerName;
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ownerId: null,
        ownerName: null,
        poolEnteredAt: new Date(),
        poolReason: reason,
      },
    });
    await createActivityLog({
      action: "IM 退回公海",
      entityType: "客户",
      entityId: customer.id,
      entityName: customer.company,
      description: `通过 IM 将客户 ${customer.company} 退回公海（原负责人: ${oldOwner || "未知"}），原因: ${reason}`,
    });
    return {
      success: true,
      message: `✅ 客户已退回公海\n公司：${customer.company}\n原负责人：${oldOwner || "未知"}\n原因：${reason}`,
      data: customer,
    };
  } catch (error) {
    return { success: false, message: `退回公海失败：${error instanceof Error ? error.message : "未知错误"}` };
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
• "给ABC公司报价，产品XX，数量100，单价50"

🔄 更新类：
• "把 ORD-000001 标记为已发货"
• "把ABC公司升级为A级"
• "完成任务 回复客户报价"

🔍 查询类：
• "查看线索列表"
• "ABC公司的订单进度怎么样"
• "我今天有什么任务"
• "本月新增了多少客户"

🌊 公海类：
• "查看公海客户"
• "认领ABC公司，我是张三"
• "把XYZ公司退回公海"

输入任何问题，我会尽力帮助您！`,
  };
}
