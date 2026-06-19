import prisma from "@/lib/prisma";
import { getLocalWorkspaceId } from "@/lib/local-context";
import type { ParsedIntent } from "./feishu-parser";

export interface WriteResult {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Central dispatcher for all write intent executions.
 * Each handler validates required parameters, calls Prisma, and returns a structured result.
 */
export async function executeWriteIntent(
  parsed: ParsedIntent,
  senderId: string,
  chatId: string,
): Promise<WriteResult> {
  switch (parsed.intent) {
    // ── A-level: Low risk ──────────────────────────────────────────
    case "CREATE_LEAD":
      return handleCreateLead(parsed, senderId);
    case "ADD_LEAD_FOLLOWUP":
      return handleAddLeadFollowup(parsed, senderId);
    case "UPDATE_LEAD":
      return handleUpdateLead(parsed);
    case "CREATE_CONTACT":
      return handleCreateContact(parsed);
    case "ADD_CUSTOMER_FOLLOWUP":
      return handleAddCustomerFollowup(parsed);
    case "CREATE_TASK":
      return handleCreateTask(parsed);

    // ── B-level: Medium risk ───────────────────────────────────────
    case "CREATE_CUSTOMER":
      return handleCreateCustomer(parsed, senderId);
    case "UPDATE_CUSTOMER":
      return handleUpdateCustomer(parsed);
    case "UPDATE_CONTACT":
      return handleUpdateContact(parsed);
    case "SET_PRIMARY_CONTACT":
      return handleSetPrimaryContact(parsed);
    case "CREATE_PROJECT":
      return handleCreateProject(parsed, senderId);
    case "UPDATE_PROJECT":
      return handleUpdateProject(parsed);
    case "CREATE_QUOTE":
      return handleCreateQuote(parsed, senderId);
    case "UPDATE_QUOTE":
      return handleUpdateQuote(parsed);
    case "CREATE_ORDER":
      return handleCreateOrder(parsed, senderId);
    case "UPDATE_ORDER":
      return handleUpdateOrder(parsed);
    case "CREATE_INVOICE":
      return handleCreateInvoice(parsed);
    case "UPDATE_INVOICE":
      return handleUpdateInvoice(parsed);
    case "UPDATE_TASK":
      return handleUpdateTask(parsed);
    case "COMPLETE_TASK":
      return handleCompleteTask(parsed);

    // ── C-level: High risk ─────────────────────────────────────────
    case "CONVERT_LEAD_TO_CUSTOMER":
      return handleConvertLeadToCustomer(parsed);
    case "SEND_QUOTE":
      return handleSendQuote(parsed);
    case "ACCEPT_QUOTE":
      return handleAcceptQuote(parsed);
    case "CONVERT_QUOTE_TO_ORDER":
      return handleConvertQuoteToOrder(parsed);
    case "UPDATE_ORDER_STATUS":
      return handleUpdateOrderStatus(parsed);
    case "RECORD_PAYMENT":
      return handleRecordPayment(parsed);
    case "CLAIM_CUSTOMER":
      return handleClaimCustomer(parsed);
    case "RELEASE_CUSTOMER":
      return handleReleaseCustomer(parsed);

    default:
      return { success: false, message: `功能开发中: ${parsed.intent}` };
  }
}

// ══════════════════════════════════════════════════════════════════
// A-level handlers (Low risk - execute directly)
// ══════════════════════════════════════════════════════════════════

async function handleCreateLead(parsed: ParsedIntent, senderId: string): Promise<WriteResult> {
  const company = parsed.parameters.exactName || parsed.parameters.keyword;
  const contactName = parsed.parameters.contactName;
  if (!company) {
    return { success: false, message: "请提供公司名称。示例：添加线索，ABC公司，联系人John" };
  }

  const tenantId = getLocalWorkspaceId();
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线，请先在CRM网页中创建业务线。" };
  }

  const lead = await prisma.lead.create({
    data: {
      company,
      contactName: contactName || "待补充",
      source: "OTHER",
      status: "NEW",
      temperature: "WARM",
      grade: "C",
      businessLineId: businessLine.id,
      tenantId,
      remark: `通过飞书创建 (sender: ${senderId})`,
    },
  });

  return {
    success: true,
    message: `线索已创建\n公司：${lead.company}\n联系人：${lead.contactName}\n状态：新线索\nID：${lead.id}`,
    entityType: "Lead",
    entityId: lead.id,
  };
}

async function handleAddLeadFollowup(parsed: ParsedIntent, senderId: string): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  const content = parsed.parameters.followUpContent;
  if (!targetName || !content) {
    return { success: false, message: "请提供公司名称和跟进内容。示例：给ABC公司添加跟进：今天电话沟通" };
  }

  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { company: { contains: targetName, mode: "insensitive" } },
        { contactName: { contains: targetName, mode: "insensitive" } },
      ],
    },
  });

  if (!lead) {
    return { success: false, message: `未找到包含"${targetName}"的线索。` };
  }

  await prisma.followUp.create({
    data: {
      leadId: lead.id,
      content,
      method: "OTHER",
    },
  });

  return {
    success: true,
    message: `跟进记录已添加\n线索：${lead.company}\n内容：${content}`,
    entityType: "Lead",
    entityId: lead.id,
  };
}

async function handleUpdateLead(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供要更新的线索公司名称。示例：更新线索「ABC公司」" };
  }
  return { success: false, message: `功能开发中：更新线索"${targetName}"。请通过CRM网页操作。` };
}

async function handleCreateContact(parsed: ParsedIntent): Promise<WriteResult> {
  const customerName = parsed.parameters.exactName || parsed.parameters.keyword;
  const contactName = parsed.parameters.contactName;
  if (!customerName || !contactName) {
    return { success: false, message: "请提供客户名称和联系人姓名。示例：创建联系人，ABC公司，联系人张三" };
  }

  const customer = await prisma.customer.findFirst({
    where: { company: { contains: customerName, mode: "insensitive" } },
  });
  if (!customer) {
    return { success: false, message: `未找到客户"${customerName}"。请先创建客户。` };
  }

  const contact = await prisma.contact.create({
    data: {
      customerId: customer.id,
      name: contactName,
    },
  });

  return {
    success: true,
    message: `联系人已创建\n客户：${customer.company}\n姓名：${contact.name}\nID：${contact.id}`,
    entityType: "Contact",
    entityId: contact.id,
  };
}

async function handleAddCustomerFollowup(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  const content = parsed.parameters.followUpContent;
  if (!targetName || !content) {
    return { success: false, message: "请提供客户名称和跟进内容。示例：给ABC公司添加跟进：今天电话沟通" };
  }

  const customer = await prisma.customer.findFirst({
    where: { company: { contains: targetName, mode: "insensitive" } },
  });
  if (!customer) {
    return { success: false, message: `未找到客户"${targetName}"。` };
  }

  await prisma.followUp.create({
    data: {
      customerId: customer.id,
      content,
      method: "OTHER",
    },
  });

  return {
    success: true,
    message: `跟进记录已添加\n客户：${customer.company}\n内容：${content}`,
    entityType: "Customer",
    entityId: customer.id,
  };
}

async function handleCreateTask(parsed: ParsedIntent): Promise<WriteResult> {
  const title = parsed.parameters.followUpContent || parsed.parameters.exactName || parsed.parameters.keyword;
  if (!title) {
    return { success: false, message: "请提供任务标题。示例：创建任务：明天跟进报价" };
  }

  const tenantId = getLocalWorkspaceId();
  const task = await prisma.task.create({
    data: {
      title,
      type: "FOLLOW_UP",
      status: "PENDING",
      priority: "MEDIUM",
      tenantId,
    },
  });

  return {
    success: true,
    message: `任务已创建\n标题：${task.title}\n状态：待处理\nID：${task.id}`,
    entityType: "Task",
    entityId: task.id,
  };
}

// ══════════════════════════════════════════════════════════════════
// B-level handlers (Medium risk - require complete parameters)
// ══════════════════════════════════════════════════════════════════

async function handleCreateCustomer(parsed: ParsedIntent, senderId: string): Promise<WriteResult> {
  const company = parsed.parameters.exactName || parsed.parameters.keyword;
  const contactName = parsed.parameters.contactName;
  if (!company) {
    return { success: false, message: "请提供公司名称。示例：创建客户，ABC公司，联系人张三" };
  }

  const tenantId = getLocalWorkspaceId();
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线，请先在CRM网页中创建业务线。" };
  }

  const customer = await prisma.customer.create({
    data: {
      company,
      contactName: contactName || "待补充",
      customerStatus: "POTENTIAL",
      lifecycleStage: "POTENTIAL",
      businessLineId: businessLine.id,
      tenantId,
      remark: `通过飞书创建 (sender: ${senderId})`,
    },
  });

  return {
    success: true,
    message: `客户已创建\n公司：${customer.company}\n联系人：${customer.contactName}\n状态：潜在客户\nID：${customer.id}`,
    entityType: "Customer",
    entityId: customer.id,
  };
}

async function handleUpdateCustomer(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供要更新的客户名称。示例：更新客户「ABC公司」" };
  }
  return { success: false, message: `功能开发中：更新客户"${targetName}"。请通过CRM网页操作。` };
}

async function handleUpdateContact(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：更新联系人。请通过CRM网页操作。" };
}

async function handleSetPrimaryContact(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：设置主联系人。请通过CRM网页操作。" };
}

async function handleCreateProject(parsed: ParsedIntent, senderId: string): Promise<WriteResult> {
  const name = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!name) {
    return { success: false, message: "请提供项目/商机名称。示例：创建项目ABC" };
  }

  // Find a customer to link to
  const customer = await prisma.customer.findFirst({ orderBy: { id: "asc" } });
  if (!customer) {
    return { success: false, message: "系统中还没有客户，请先创建客户。" };
  }

  const tenantId = getLocalWorkspaceId();
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线。" };
  }

  const project = await prisma.project.create({
    data: {
      name,
      status: "REQUIREMENT_CONFIRMING",
      customerId: customer.id,
      businessLineId: businessLine.id,
    },
  });

  return {
    success: true,
    message: `项目/商机已创建\n名称：${project.name}\n关联客户：${customer.company}\nID：${project.id}`,
    entityType: "Project",
    entityId: project.id,
  };
}

async function handleUpdateProject(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：更新项目/商机。请通过CRM网页操作。" };
}

async function handleCreateQuote(parsed: ParsedIntent, senderId: string): Promise<WriteResult> {
  const title = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!title) {
    return { success: false, message: "请提供报价标题。示例：创建报价ABC产品" };
  }

  // Generate quote number
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const count = await prisma.quote.count();
  const quoteNo = `QT-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  // Find a customer to link to
  const customer = await prisma.customer.findFirst({ orderBy: { id: "asc" } });

  const tenantId = getLocalWorkspaceId();
  const quote = await prisma.quote.create({
    data: {
      quoteNo,
      quoteTitle: title,
      status: "DRAFT",
      customerId: customer?.id,
      tenantId,
    },
  });

  return {
    success: true,
    message: `报价已创建\n报价号：${quote.quoteNo}\n标题：${title}\n状态：草稿\nID：${quote.id}`,
    entityType: "Quote",
    entityId: quote.id,
  };
}

async function handleUpdateQuote(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：更新报价。请通过CRM网页操作。" };
}

async function handleCreateOrder(parsed: ParsedIntent, senderId: string): Promise<WriteResult> {
  const title = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!title) {
    return { success: false, message: "请提供订单标题。示例：创建订单ABC产品" };
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const count = await prisma.order.count();
  const orderNo = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  const customer = await prisma.customer.findFirst({ orderBy: { id: "asc" } });
  if (!customer) {
    return { success: false, message: "系统中还没有客户，请先创建客户。" };
  }

  const tenantId = getLocalWorkspaceId();
  const order = await prisma.order.create({
    data: {
      orderNo,
      orderTitle: title,
      customerId: customer.id,
      orderStatus: "DRAFT",
      tenantId,
    },
  });

  return {
    success: true,
    message: `订单已创建\n订单号：${order.orderNo}\n标题：${title}\n状态：草稿\nID：${order.id}`,
    entityType: "Order",
    entityId: order.id,
  };
}

async function handleUpdateOrder(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：更新订单。请通过CRM网页操作。" };
}

async function handleCreateInvoice(parsed: ParsedIntent): Promise<WriteResult> {
  const title = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!title) {
    return { success: false, message: "请提供发票相关信息。示例：创建发票ORD-0001" };
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const count = await prisma.invoice.count();
  const invoiceNo = `INV-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  const customer = await prisma.customer.findFirst({ orderBy: { id: "asc" } });
  if (!customer) {
    return { success: false, message: "系统中还没有客户。" };
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo,
      customerId: customer.id,
      amount: 0,
      status: "DRAFT",
    },
  });

  return {
    success: true,
    message: `发票已创建\n发票号：${invoice.invoiceNo}\n状态：草稿\nID：${invoice.id}`,
    entityType: "Invoice",
    entityId: invoice.id,
  };
}

async function handleUpdateInvoice(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：更新发票。请通过CRM网页操作。" };
}

async function handleUpdateTask(parsed: ParsedIntent): Promise<WriteResult> {
  return { success: false, message: "功能开发中：更新任务。请通过CRM网页操作。" };
}

async function handleCompleteTask(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供要完成的任务标题。示例：完成任务：跟进报价" };
  }

  const task = await prisma.task.findFirst({
    where: {
      title: { contains: targetName, mode: "insensitive" },
      status: "PENDING",
    },
  });
  if (!task) {
    return { success: false, message: `未找到标题包含"${targetName}"的待处理任务。` };
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return {
    success: true,
    message: `任务已完成\n标题：${task.title}\n完成时间：${new Date().toLocaleString("zh-CN")}`,
    entityType: "Task",
    entityId: task.id,
  };
}

// ══════════════════════════════════════════════════════════════════
// C-level handlers (High risk - require confirmation)
// ══════════════════════════════════════════════════════════════════

async function handleConvertLeadToCustomer(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供要转化的线索公司名称。示例：线索转客户「ABC公司」" };
  }

  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { company: { contains: targetName, mode: "insensitive" } },
        { contactName: { contains: targetName, mode: "insensitive" } },
      ],
      status: { not: "CONVERTED" },
    },
  });

  if (!lead) {
    return { success: false, message: `未找到可转化的线索"${targetName}"。` };
  }

  // Create customer from lead
  const tenantId = getLocalWorkspaceId();
  const customer = await prisma.customer.create({
    data: {
      company: lead.company,
      contactName: lead.contactName,
      country: lead.country,
      phone: lead.phone,
      email: lead.email,
      whatsapp: lead.whatsapp,
      source: lead.source,
      customerStatus: "POTENTIAL",
      lifecycleStage: "POTENTIAL",
      leadGrade: lead.grade,
      businessLineId: lead.businessLineId,
      tenantId,
      remark: `从线索#${lead.id}转化`,
    },
  });

  // Update lead status
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: "CONVERTED",
      convertedCustomerId: customer.id,
    },
  });

  return {
    success: true,
    message: `线索已转化为客户\n原线索：${lead.company} (ID:${lead.id})\n新客户：${customer.company} (ID:${customer.id})`,
    entityType: "Customer",
    entityId: customer.id,
  };
}

async function handleSendQuote(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供报价号。示例：发送报价QT-20260101-0001" };
  }

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [
        { quoteNo: { contains: targetName, mode: "insensitive" } },
        { quoteTitle: { contains: targetName, mode: "insensitive" } },
      ],
      status: "DRAFT",
    },
  });

  if (!quote) {
    return { success: false, message: `未找到可发送的草稿报价"${targetName}"。` };
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: "SENT" },
  });

  return {
    success: true,
    message: `报价已发送\n报价号：${quote.quoteNo}\n标题：${quote.quoteTitle || "无"}\n状态：已发送`,
    entityType: "Quote",
    entityId: quote.id,
  };
}

async function handleAcceptQuote(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供报价号。示例：接受报价QT-20260101-0001" };
  }

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [
        { quoteNo: { contains: targetName, mode: "insensitive" } },
        { quoteTitle: { contains: targetName, mode: "insensitive" } },
      ],
      status: { in: ["SENT", "WAITING_FEEDBACK", "REVISED"] },
    },
  });

  if (!quote) {
    return { success: false, message: `未找到可接受的报价"${targetName}"。` };
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: "ACCEPTED" },
  });

  return {
    success: true,
    message: `报价已接受\n报价号：${quote.quoteNo}\n标题：${quote.quoteTitle || "无"}\n状态：已接受`,
    entityType: "Quote",
    entityId: quote.id,
  };
}

async function handleConvertQuoteToOrder(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供报价号。示例：报价转订单QT-20260101-0001" };
  }

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [
        { quoteNo: { contains: targetName, mode: "insensitive" } },
        { quoteTitle: { contains: targetName, mode: "insensitive" } },
      ],
      status: "ACCEPTED",
    },
  });

  if (!quote) {
    return { success: false, message: `未找到已接受的报价"${targetName}"。只有已接受的报价才能转为订单。` };
  }

  if (!quote.customerId) {
    return { success: false, message: "该报价没有关联客户，无法转为订单。请先在CRM网页中补充客户信息。" };
  }

  // Create order from quote
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const count = await prisma.order.count();
  const orderNo = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  const order = await prisma.order.create({
    data: {
      orderNo,
      orderTitle: quote.quoteTitle || quote.productName || "报价转订单",
      customerId: quote.customerId,
      projectId: quote.projectId,
      quoteId: quote.id,
      businessLineId: quote.projectId
        ? (await prisma.project.findUnique({ where: { id: quote.projectId } }))?.businessLineId
        : undefined,
      orderStatus: "DRAFT",
      totalAmount: quote.totalPrice,
      currency: quote.currency,
      tenantId: quote.tenantId,
    },
  });

  return {
    success: true,
    message: `报价已转为订单\n报价号：${quote.quoteNo}\n新订单号：${order.orderNo}\n金额：${quote.totalPrice || "待填写"} ${quote.currency}\n订单ID：${order.id}`,
    entityType: "Order",
    entityId: order.id,
  };
}

async function handleUpdateOrderStatus(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供订单号。示例：确认订单ORD-20260101-0001" };
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNo: { contains: targetName, mode: "insensitive" } },
        { orderTitle: { contains: targetName, mode: "insensitive" } },
      ],
    },
  });

  if (!order) {
    return { success: false, message: `未找到订单"${targetName}"。` };
  }

  // Simple status progression: DRAFT -> CONFIRMED
  const nextStatus = order.orderStatus === "DRAFT" ? "CONFIRMED" : order.orderStatus;
  if (nextStatus === order.orderStatus) {
    return { success: false, message: `订单${order.orderNo}当前状态为"${order.orderStatus}"，无法自动推进。` };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: nextStatus as any },
  });

  return {
    success: true,
    message: `订单状态已更新\n订单号：${order.orderNo}\n${order.orderStatus} → ${nextStatus}`,
    entityType: "Order",
    entityId: order.id,
  };
}

async function handleRecordPayment(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供发票号和金额。示例：记录付款INV-20260101-0001 金额5000" };
  }

  // Try to find the invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [
        { invoiceNo: { contains: targetName, mode: "insensitive" } },
      ],
    },
  });

  if (!invoice) {
    return { success: false, message: `未找到发票"${targetName}"。` };
  }

  // Extract amount from message
  const amountMatch = targetName.match(/(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : Number(invoice.amount);

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount,
      method: "TT",
    },
  });

  // Update invoice status if fully paid
  const totalPayments = await prisma.payment.aggregate({
    where: { invoiceId: invoice.id },
    _sum: { amount: true },
  });

  const totalPaid = Number(totalPayments._sum.amount || 0);
  if (totalPaid >= Number(invoice.amount)) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  return {
    success: true,
    message: `付款已记录\n发票号：${invoice.invoiceNo}\n付款金额：${amount}\n累计已付：${totalPaid}/${invoice.amount}\n付款ID：${payment.id}`,
    entityType: "Payment",
    entityId: payment.id,
  };
}

async function handleClaimCustomer(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供要认领的客户名称。示例：认领客户「ABC公司」" };
  }

  const customer = await prisma.customer.findFirst({
    where: { company: { contains: targetName, mode: "insensitive" } },
  });
  if (!customer) {
    return { success: false, message: `未找到客户"${targetName}"。` };
  }

  if (customer.ownerId) {
    return { success: false, message: `客户"${customer.company}"已有负责人，无法认领。` };
  }

  const tenantId = getLocalWorkspaceId();
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      ownerId: 1, // Default to first user for bot operations
      ownerName: "飞书认领",
      poolEnteredAt: null,
      poolReason: null,
    },
  });

  return {
    success: true,
    message: `客户已认领\n客户：${customer.company}\n认领人：飞书认领`,
    entityType: "Customer",
    entityId: customer.id,
  };
}

async function handleReleaseCustomer(parsed: ParsedIntent): Promise<WriteResult> {
  const targetName = parsed.parameters.exactName || parsed.parameters.keyword;
  if (!targetName) {
    return { success: false, message: "请提供要退回公海的客户名称。示例：退回公海「ABC公司」" };
  }

  const customer = await prisma.customer.findFirst({
    where: { company: { contains: targetName, mode: "insensitive" } },
  });
  if (!customer) {
    return { success: false, message: `未找到客户"${targetName}"。` };
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      ownerId: null,
      ownerName: null,
      poolEnteredAt: new Date(),
      poolReason: "飞书退回",
    },
  });

  return {
    success: true,
    message: `客户已退回公海\n客户：${customer.company}\n退回时间：${new Date().toLocaleString("zh-CN")}`,
    entityType: "Customer",
    entityId: customer.id,
  };
}
