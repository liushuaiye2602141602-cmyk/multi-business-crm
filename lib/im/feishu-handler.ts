import prisma from "@/lib/prisma";
import type { ParsedIntent, WriteIntent } from "./feishu-parser";

export interface MessageContext {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  receivedAt: Date;
}

// All write intents and their corresponding env var flag names
const WRITE_INTENT_FLAGS = {
  CREATE_LEAD: "FEISHU_ALLOW_CREATE_LEAD",
  UPDATE_LEAD: "FEISHU_ALLOW_UPDATE_LEAD",
  ADD_LEAD_FOLLOWUP: "FEISHU_ALLOW_ADD_FOLLOWUP",
  CONVERT_LEAD_TO_CUSTOMER: "FEISHU_ALLOW_CONVERT_LEAD",
  CREATE_CUSTOMER: "FEISHU_ALLOW_CREATE_CUSTOMER",
  UPDATE_CUSTOMER: "FEISHU_ALLOW_UPDATE_CUSTOMER",
  CREATE_CONTACT: "FEISHU_ALLOW_CREATE_CONTACT",
  UPDATE_CONTACT: "FEISHU_ALLOW_UPDATE_CONTACT",
  SET_PRIMARY_CONTACT: "FEISHU_ALLOW_SET_PRIMARY_CONTACT",
  ADD_CUSTOMER_FOLLOWUP: "FEISHU_ALLOW_ADD_FOLLOWUP",
  CREATE_TASK: "FEISHU_ALLOW_CREATE_TASK",
  UPDATE_TASK: "FEISHU_ALLOW_UPDATE_TASK",
  COMPLETE_TASK: "FEISHU_ALLOW_COMPLETE_TASK",
  CREATE_PROJECT: "FEISHU_ALLOW_CREATE_PROJECT",
  UPDATE_PROJECT: "FEISHU_ALLOW_UPDATE_PROJECT",
  LINK_TASK_TO_ENTITY: "FEISHU_ALLOW_UPDATE_TASK",
  LINK_PROJECT_TO_CUSTOMER: "FEISHU_ALLOW_UPDATE_PROJECT",
  LINK_PROJECT_TO_LEAD: "FEISHU_ALLOW_UPDATE_PROJECT",
  CREATE_QUOTE: "FEISHU_ALLOW_CREATE_QUOTE",
  UPDATE_QUOTE: "FEISHU_ALLOW_UPDATE_QUOTE",
  SEND_QUOTE: "FEISHU_ALLOW_SEND_QUOTE",
  ACCEPT_QUOTE: "FEISHU_ALLOW_ACCEPT_QUOTE",
  CONVERT_QUOTE_TO_ORDER: "FEISHU_ALLOW_QUOTE_TO_ORDER",
  QUOTE_TO_ORDER: "FEISHU_ALLOW_QUOTE_TO_ORDER",
  CREATE_ORDER: "FEISHU_ALLOW_CREATE_ORDER",
  UPDATE_ORDER: "FEISHU_ALLOW_UPDATE_ORDER",
  CREATE_INVOICE: "FEISHU_ALLOW_CREATE_INVOICE",
  UPDATE_INVOICE: "FEISHU_ALLOW_UPDATE_INVOICE",
  RECORD_PAYMENT: "FEISHU_ALLOW_RECORD_PAYMENT",
  CLAIM_CUSTOMER: "FEISHU_ALLOW_CUSTOMER_POOL",
  RELEASE_CUSTOMER: "FEISHU_ALLOW_CUSTOMER_POOL",
  UPDATE_ORDER_STATUS: "FEISHU_ALLOW_UPDATE_ORDER",
} as const satisfies Record<WriteIntent, string>;

export type WritePermissionKey = (typeof WRITE_INTENT_FLAGS)[WriteIntent];

export function getPermissionKeyForIntent(intent: string): WritePermissionKey | null {
  if (Object.prototype.hasOwnProperty.call(WRITE_INTENT_FLAGS, intent)) {
    return WRITE_INTENT_FLAGS[intent as WriteIntent];
  }
  return null;
}

// Confirmation expiry in milliseconds (10 minutes)
const CONFIRM_EXPIRY_MS = 10 * 60 * 1000;

const WRITE_INTENTS: ReadonlySet<string> = new Set(Object.keys(WRITE_INTENT_FLAGS));

export type FeishuRoutingDryRun = {
  normalizedText: string;
  writeLikelihood: boolean;
  intent: string;
  confidence: number;
  parameters: ParsedIntent["parameters"];
  permissionKey: string | null;
  shadowMode: boolean;
  wouldExecute: boolean;
  responseType: "SHADOW_PREVIEW" | "PERMISSION_DENIED" | "CONFIRMATION_PREVIEW" | "EXECUTE" | "READ_ONLY" | "READ_QUERY" | "CHAT" | "UNKNOWN";
  dbWriteCount: number;
  pendingActionCreateCount: number;
};

export async function dryRunFeishuRouting(text: string): Promise<FeishuRoutingDryRun> {
  const { normalizeMessage, detectWriteLikelihood, parseFeishuIntent, enrichWithLLM, isWriteConfirmationMode } = await import("./feishu-parser");
  const normalizedText = normalizeMessage(text);
  const writeLikelihood = detectWriteLikelihood(normalizedText);
  let parsed = parseFeishuIntent(normalizedText);
  if (WRITE_INTENTS.has(parsed.intent) && process.env.FEISHU_ROUTING_DRY_RUN_NO_AI !== "true") {
    parsed = await enrichWithLLM(parsed, normalizedText);
  }

  const permissionKey = getPermissionKeyForIntent(parsed.intent);
  const shadowMode = isShadowModeEnabled();
  let responseType: FeishuRoutingDryRun["responseType"] = "UNKNOWN";
  let wouldExecute = false;

  if (parsed.intent === "CHAT" || parsed.intent === "HELP" || parsed.intent === "SENSITIVE") {
    responseType = "CHAT";
  } else if (parsed.intent === "COMPOUND_QUERY_AND_UPDATE") {
    const actions = parsed.parameters.actions || [];
    const writeActions = actions.filter((action: any) => WRITE_INTENTS.has(action.intent));
    const blockedActions = actions.filter((action: any) => action.blockedReason);
    if (blockedActions.length > 0 && writeActions.length === 0) {
      responseType = "PERMISSION_DENIED";
    } else if (writeActions.length > 0) {
      responseType = "CONFIRMATION_PREVIEW";
    } else {
      responseType = "READ_QUERY";
    }
  } else if (parsed.intent === "UNKNOWN") {
    responseType = "UNKNOWN";
  } else if (WRITE_INTENTS.has(parsed.intent)) {
    if (shadowMode) {
      responseType = "SHADOW_PREVIEW";
    } else if (process.env.FEISHU_READ_ONLY !== "false") {
      responseType = "READ_ONLY";
    } else if (!permissionKey || process.env[permissionKey] !== "true") {
      responseType = "PERMISSION_DENIED";
    } else if (isWriteConfirmationMode()) {
      responseType = "CONFIRMATION_PREVIEW";
    } else {
      responseType = "EXECUTE";
      wouldExecute = true;
    }
  } else {
    responseType = "READ_QUERY";
  }

  return {
    normalizedText,
    writeLikelihood,
    intent: parsed.intent,
    confidence: parsed.confidence,
    parameters: parsed.parameters,
    permissionKey,
    shadowMode,
    wouldExecute,
    responseType,
    dbWriteCount: 0,
    pendingActionCreateCount: parsed.intent === "COMPOUND_QUERY_AND_UPDATE"
      ? (parsed.parameters.actions || []).filter((action: any) => WRITE_INTENTS.has(action.intent)).length
      : 0,
  };
}

export async function handleIncomingFeishuMessage(
  context: MessageContext,
  sendReply: (text: string) => Promise<void>,
  platformId: number,
): Promise<void> {
  // 1. Idempotency check - skip if this message_id was already processed
  const existing = await prisma.iMMessage.findFirst({
    where: { platformId, externalId: context.messageId },
  });
  if (existing) {
    console.log(`跳过重复消息: ${context.messageId}`);
    return;
  }

  // 2. Find or create IM user
  let imUser = await prisma.iMUser.findUnique({
    where: {
      platformId_platformUserId: { platformId, platformUserId: context.senderId },
    },
  });
  if (!imUser) {
    imUser = await prisma.iMUser.create({
      data: {
        platformId,
        platformUserId: context.senderId,
        platformName: context.senderId,
      },
    });
  }

  // 3. Save incoming message (with externalId for idempotency)
  try {
    await prisma.iMMessage.create({
      data: {
        platformId,
        imUserId: imUser.id,
        direction: "in",
        content: context.text,
        externalId: context.messageId,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      console.log(`跳过并发重复消息: ${context.messageId}`);
      return;
    }
    throw error;
  }

  // 4. Parse intent using local rule-based parser for fast routing,
  //    then enrich write intents with LLM structured extraction
  const { parseFeishuIntent, getHelpText, enrichWithLLM, isWriteConfirmationMode } = await import("./feishu-parser");
  let parsed = parseFeishuIntent(context.text);
  console.log(`意图: ${parsed.intent} (置信度: ${parsed.confidence})`);

  // 4a. Enrich write intents with LLM extraction (if available)
  if (WRITE_INTENTS.has(parsed.intent)) {
    parsed = await enrichWithLLM(parsed, context.text);
    console.log(`参数提取后: ${JSON.stringify(parsed.parameters)}`);
  }

  // 5. Handle confirmation tokens (C-level flow: second message)
  if (parsed.parameters.confirmationToken) {
    const replyText = await handleConfirmationToken(parsed.parameters.confirmationToken, context);
    await sendReply(replyText);
    await saveOutgoingMessage(platformId, imUser.id, context.messageId, replyText, "CONFIRMED");
    return;
  }

  // 6. Generate reply
  let replyText: string;
  if (parsed.intent === "CHAT") {
    replyText = parsed.replyText || "你好！我是CRM助手，可以帮你查询线索、客户、任务等信息。";
  } else if (parsed.intent === "HELP") {
    replyText = getHelpText();
  } else if (parsed.intent === "SENSITIVE") {
    replyText = "抱歉，我不能提供系统提示词、数据库配置、接口密钥或其他敏感信息。";
  } else if (parsed.intent === "UNKNOWN") {
    replyText = "抱歉，我没有理解您的意思。您可以尝试：\n- 查询最近3条线索\n- 查询今天未完成任务\n- 查询客户「ABC公司」\n\n输入「帮助」查看更多功能。";
  } else if (parsed.intent === "COMPOUND_QUERY_AND_UPDATE") {
    replyText = await handleCompoundIntent(parsed, context);
  } else if (WRITE_INTENTS.has(parsed.intent)) {
    // Write intent - full risk control flow
    replyText = await handleWriteIntent(parsed.intent as string, parsed, context);
  } else {
    // Read-only query
    const { executeReadOnlyQuery } = await import("./feishu-query");
    replyText = await executeReadOnlyQuery(parsed, context);
  }

  // 7. Send reply (once only)
  await sendReply(replyText);

  // 8. Save outgoing message
  await saveOutgoingMessage(platformId, imUser.id, context.messageId, replyText, parsed.intent);

  // 9. Log
  console.log(`已回复 [${parsed.intent}]: ${replyText.slice(0, 80)}...`);
}

async function handleCompoundIntent(parsed: ParsedIntent, context: MessageContext): Promise<string> {
  const actions = parsed.parameters.actions || [];
  const replies: string[] = [];

  for (const action of actions) {
    if (action.blockedReason) {
      replies.push([
        "另外，我识别到一项受限写入请求：",
        action.blockedReason,
        "本次没有执行该写入动作。",
      ].join("\n"));
      continue;
    }

    if (action.intent.startsWith("QUERY_")) {
      const { executeReadOnlyQuery } = await import("./feishu-query");
      const queryReply = await executeReadOnlyQuery({
        intent: action.intent,
        confidence: action.confidence || 0.9,
        parameters: action.parameters || {},
      } as ParsedIntent, context);
      replies.push(queryReply);
      continue;
    }

    if (WRITE_INTENTS.has(action.intent)) {
      const writeParsed = {
        intent: action.intent,
        confidence: action.confidence || 0.9,
        parameters: action.parameters || {},
      } as ParsedIntent;
      const writeReply = await handleWriteIntent(action.intent, writeParsed, context);
      replies.push([
        "另外，我识别到一项更新请求：",
        "",
        writeReply,
      ].join("\n"));
    }
  }

  if (replies.length === 0) {
    return "这条消息同时包含多个动作。为避免误操作，本次没有修改数据。请将查询和写入分成两条消息发送。";
  }

  return replies.join("\n\n");
}

// ══════════════════════════════════════════════════════════════════
// Write intent handling with risk control
// ══════════════════════════════════════════════════════════════════

async function handleWriteIntent(
  intent: string,
  parsed: any,
  context: MessageContext,
): Promise<string> {
  // Step 1: Shadow mode previews the understood write without permissions or DB writes.
  if (isShadowModeEnabled()) {
    return buildShadowPreview(intent, parsed);
  }

  // Step 2: Global kill switch
  const readOnly = process.env.FEISHU_READ_ONLY !== "false";
  if (readOnly) {
    return "当前为只读模式，无法执行写入操作。管理员可通过设置 FEISHU_READ_ONLY=false 开启写入。";
  }

  // Step 3: Check fine-grained permission flag by explicit intent mapping.
  const flagName = getPermissionKeyForIntent(intent);
  if (!flagName || process.env[flagName] !== "true") {
    return `该操作未授权。请联系管理员开启 ${flagName} 权限。`;
  }

  // Step 4: Get risk level
  const { getRiskLevel } = await import("./feishu-risk-levels");
  const riskLevel = getRiskLevel(intent);

  // Step 5: Write confirmation mode - force confirmation for all writes
  const { isWriteConfirmationMode } = await import("./feishu-parser");
  if (isWriteConfirmationMode() && riskLevel !== "C") {
    // Treat as C-level when write confirmation mode is active
    return handleHighRiskIntent(intent, parsed, context);
  }

  // Step 6: C-level (high risk) - require confirmation
  if (riskLevel === "C") {
    return handleHighRiskIntent(intent, parsed, context);
  }

  // Step 7: A/B level - execute directly
  const result = await executeParsedWriteThroughKernel(parsed, context);

  return result.success
    ? `[${riskLevel}级操作] ${result.message}`
    : result.message;
}

async function executeParsedWriteThroughKernel(parsed: ParsedIntent, context: MessageContext) {
  const { executionKernel } = await import("@/lib/kernel/execution-kernel");
  return executionKernel.execute(
    {
      intent: parsed.intent,
      entityHint: parsed.entityHint || (parsed.parameters as any).entityHint || null,
      parameters: parsed.parameters || {},
    },
    {
      sessionId: `${context.chatId}::${context.senderId}`,
      senderId: context.senderId,
      chatId: context.chatId,
      messageId: context.messageId,
      actorId: context.senderId,
    },
  );
}

function getEntityHint(parsed: ParsedIntent): NonNullable<ParsedIntent["entityHint"]> {
  return parsed.entityHint || ((parsed.parameters as any).entityHint as any) || {};
}

function getCompanyHint(parsed: ParsedIntent): string | undefined {
  const p: any = parsed.parameters || {};
  return getEntityHint(parsed).company || p.company || p.companyName || p.customerName || p.exactName;
}

function getContactHint(parsed: ParsedIntent): string | undefined {
  const p: any = parsed.parameters || {};
  return getEntityHint(parsed).contact || p.contact || p.contactName;
}

function getEmailHint(parsed: ParsedIntent): string | undefined {
  const p: any = parsed.parameters || {};
  return getEntityHint(parsed).email || p.email;
}

function getPhoneHint(parsed: ParsedIntent): string | undefined {
  const p: any = parsed.parameters || {};
  return getEntityHint(parsed).phone || p.phone;
}

function getCountryHint(parsed: ParsedIntent): string | undefined {
  const p: any = parsed.parameters || {};
  return getEntityHint(parsed).country || p.country;
}

function isShadowModeEnabled(): boolean {
  return process.env.FEISHU_NL_SHADOW_MODE === "true";
}

function buildShadowPreview(intent: string, parsed: ParsedIntent): string {
  const p = parsed.parameters;
  const missingFields = p.missingFields?.length ? p.missingFields.join("、") : "无";
  const confidence = parsed.confidence >= 0.8 ? "高" : parsed.confidence >= 0.6 ? "中" : "低";

  if (intent === "CREATE_LEAD") {
    return [
      "【影子模式：未执行】",
      "",
      "操作：创建线索",
      `公司：${getCompanyHint(parsed) || "未识别"}`,
      `联系人：${p.contactName || "未提供"}`,
      `国家：${p.country || "未提供"}`,
      `邮箱：${p.email || "未提供"}`,
      `需求：${p.requirement || "未提供"}`,
      `缺失字段：${missingFields}`,
      `置信度：${confidence}`,
      "",
      "本次没有修改任何数据。",
    ].join("\n");
  }

  if (intent === "ADD_LEAD_FOLLOWUP") {
    return [
      "【影子模式：未执行】",
      "",
      "操作：添加线索跟进",
      `线索：${p.exactName || getCompanyHint(parsed) || "未识别"}`,
      `跟进内容：${p.followUpContent || "未提供"}`,
      `缺失字段：${missingFields}`,
      `置信度：${confidence}`,
      "",
      "本次没有修改任何数据。",
    ].join("\n");
  }

  return [
    "【影子模式：未执行】",
    "",
    `操作：${intent}`,
    `缺失字段：${missingFields}`,
    `置信度：${confidence}`,
    "",
    "本次没有修改任何数据。",
  ].join("\n");
}

// ══════════════════════════════════════════════════════════════════
// High-risk confirmation flow (C-level)
// ══════════════════════════════════════════════════════════════════

async function handleHighRiskIntent(
  intent: string,
  parsed: any,
  context: MessageContext,
): Promise<string> {
  const validation = await validateWriteBeforeConfirmation(intent, parsed, context);

  if (!validation.success) {
    return validation.message;
  }

  // Generate a short unique token (first 8 chars of a random hex)
  const token = `${intent.substring(0, 3)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Build summary of what will be executed
  const { getRiskLevel } = await import("./feishu-risk-levels");
  const riskLevel = getRiskLevel(intent);
  const riskLabel = riskLevel === "C" ? "高风险" : riskLevel === "B" ? "中风险" : "低风险";
  const intentLabel = INTENT_LABELS[intent] || intent;
  const summary = [
    `即将执行：${intentLabel}`,
    validation.message,
    "",
    `操作风险等级：${riskLevel} (${riskLabel})`,
    "",
    `请回复确认执行：`,
    `确认执行 ${token}`,
    "",
    `此确认在10分钟内有效。取消请回复：取消`,
  ].join("\n");

  // Save PendingAction
  const expiresAt = new Date(Date.now() + CONFIRM_EXPIRY_MS);
  await prisma.pendingAction.create({
    data: {
      token,
      senderId: context.senderId,
      chatId: context.chatId,
      intent,
      parameters: parsed.parameters,
      entityType: validation.entityType || null,
      entityId: validation.entityId || null,
      status: "PENDING",
      expiresAt,
    },
  });

  console.log(`高风险操作待确认: ${intent} token=${token} expires=${expiresAt.toISOString()}`);

  return summary;
}

async function validateWriteBeforeConfirmation(
  intent: string,
  parsed: ParsedIntent,
  contextInput?: string | MessageContext,
): Promise<{ success: boolean; message: string; entityType?: string; entityId?: number }> {
  const originalMessageId = typeof contextInput === "string" ? contextInput : contextInput?.messageId;
  if (intent === "CREATE_LEAD") {
    const company = getCompanyHint(parsed);
    const contactName = getContactHint(parsed);
    const email = getEmailHint(parsed);
    const phone = getPhoneHint(parsed);

    if (!company) {
      return { success: false, message: "请提供公司名称。示例：添加线索，ABC公司，联系人John" };
    }
    if (!contactName) {
      return { success: false, message: "请提供联系人姓名。示例：添加线索，ABC公司，联系人John" };
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: `邮箱格式不正确："${email}"。请提供有效的邮箱地址。` };
      }
      const existingEmail = await prisma.lead.findFirst({ where: { email } });
      if (existingEmail) {
        return {
          success: false,
          message: `发现可能重复的线索：公司 ${existingEmail.company}，邮箱 ${existingEmail.email}。请先查看现有线索。`,
        };
      }
    }
    if (phone) {
      const existingPhone = await prisma.lead.findFirst({ where: { phone } });
      if (existingPhone) {
        return {
          success: false,
          message: `发现可能重复的线索：公司 ${existingPhone.company}，电话 ${existingPhone.phone}。请先查看现有线索。`,
        };
      }
    }
    const existingCompany = await prisma.lead.findFirst({
      where: { company: { equals: company, mode: "insensitive" } },
    });
    if (existingCompany) {
      return {
        success: false,
        message: `发现可能重复的线索：公司 ${existingCompany.company}，联系人 ${existingCompany.contactName}。请先查看现有线索。`,
      };
    }
    const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
    if (!businessLine) {
      return { success: false, message: "系统中还没有业务线，请先在CRM网页中创建业务线。" };
    }

    return {
      success: true,
      message: [
        "理解摘要：创建线索",
        `公司：${company}`,
        `联系人：${contactName}`,
        `国家：${parsed.parameters.country || "未提供"}`,
        `邮箱：${email || "未提供"}`,
        `需求：${parsed.parameters.requirement || "未提供"}`,
        "未确认前不会写入数据库。",
      ].join("\n"),
      entityType: "Lead",
    };
  }

  if (intent === "ADD_LEAD_FOLLOWUP") {
    let targetName = parsed.parameters.exactName || getCompanyHint(parsed);
    const content = parsed.parameters.followUpContent;
    if (!targetName || !content) {
      return { success: false, message: "请提供公司名称和跟进内容。示例：给ABC公司添加跟进：今天电话沟通" };
    }
    targetName = targetName.replace(/(?:添加跟进|新增跟进|添加|新增|跟进|记录|一条)$/g, "").trim();
    if (!targetName) {
      return { success: false, message: "公司名称解析异常，请确认格式正确。" };
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

    const existingFollowUp = await prisma.followUp.findFirst({
      where: { leadId: lead.id, content },
    });
    if (existingFollowUp) {
      return { success: false, message: `发现重复跟进记录：${content}` };
    }

    return {
      success: true,
      message: [
        "理解摘要：添加线索跟进",
        `线索：${lead.company}`,
        `跟进内容：${content}`,
        "未确认前不会写入数据库。",
      ].join("\n"),
      entityType: "Lead",
      entityId: lead.id,
    };
  }

  if (intent === "UPDATE_LEAD") {
    const { validateUpdateLeadBeforeConfirmation } = await import("./feishu-lead-update");
    return validateUpdateLeadBeforeConfirmation(parsed, originalMessageId);
  }

  if (
    intent === "CONVERT_LEAD_TO_CUSTOMER"
    || intent === "CREATE_CUSTOMER"
    || intent === "UPDATE_CUSTOMER"
    || intent === "CREATE_CONTACT"
    || intent === "UPDATE_CONTACT"
    || intent === "SET_PRIMARY_CONTACT"
  ) {
    const service = await import("@/lib/services/customer-flow-service");
    const p: any = parsed.parameters || {};
    const companyHint = getCompanyHint(parsed);
    const contactHint = getContactHint(parsed);
    let validation: any;

    if (intent === "CONVERT_LEAD_TO_CUSTOMER") {
      validation = await service.validateConvertLeadToCustomerPlan(
        p.leadReference || {
          id: p.id,
          companyName: companyHint,
          contactName: contactHint,
          email: getEmailHint(parsed),
          phone: getPhoneHint(parsed),
        },
        typeof contextInput === "string" ? originalMessageId : contextInput,
      );
    } else if (intent === "CREATE_CUSTOMER") {
      validation = await service.validateCreateCustomerPlan(
        p.customerInput || {
          company: companyHint,
          country: getCountryHint(parsed),
          email: getEmailHint(parsed),
          phone: getPhoneHint(parsed),
          businessLineId: p.businessLineId,
          businessLineName: p.businessLineName,
          primaryContact: {
            name: contactHint,
            email: getEmailHint(parsed),
            phone: getPhoneHint(parsed),
            whatsapp: p.whatsapp,
          },
        },
        originalMessageId,
      );
    } else if (intent === "UPDATE_CUSTOMER") {
      validation = await service.validateUpdateCustomerPlan(
        p.customerReference || { id: p.id, companyName: companyHint, email: getEmailHint(parsed), phone: getPhoneHint(parsed) },
        p.customerChanges || p.changes || {},
        originalMessageId,
      );
    } else if (intent === "CREATE_CONTACT") {
      validation = await service.validateCreateContactPlan(
        p.customerReference || { id: p.customerId, companyName: companyHint },
        p.contactInput || {
          name: contactHint,
          title: p.title,
          department: p.department,
          email: getEmailHint(parsed),
          phone: getPhoneHint(parsed),
          whatsapp: p.whatsapp,
          notes: p.notes,
          isPrimary: !!p.isPrimary,
        },
        originalMessageId,
      );
    } else if (intent === "UPDATE_CONTACT") {
      validation = await service.validateUpdateContactPlan(
        p.contactReference || { id: p.contactId || p.id, contactName: contactHint || companyHint, email: getEmailHint(parsed), phone: getPhoneHint(parsed) },
        p.customerReference || (p.exactName ? { companyName: p.exactName } : undefined),
        p.contactChanges || p.changes || {},
        originalMessageId,
      );
    } else {
      validation = await service.validateSetPrimaryContactPlan(
        p.customerReference || { id: p.customerId, companyName: companyHint },
        p.contactReference || { id: p.contactId || p.id, contactName: contactHint },
        originalMessageId,
      );
    }

    if (validation.success && validation.plan) {
      (parsed.parameters as any).customerFlowPlan = validation.plan;
    }
    return validation;
  }

  if (
    intent === "CREATE_TASK"
    || intent === "UPDATE_TASK"
    || intent === "COMPLETE_TASK"
    || intent === "CREATE_PROJECT"
    || intent === "UPDATE_PROJECT"
  ) {
    const service = await import("@/lib/services/task-project-flow-service");
    const p: any = parsed.parameters || {};
    let validation: any;

    if (intent === "CREATE_TASK") {
      validation = await service.validateCreateTaskPlan(p.task || {
        title: p.title || p.followUpContent || getCompanyHint(parsed),
        dueAt: p.dueAt,
        priority: p.priority,
      }, p.relatedEntity, typeof contextInput === "string" ? originalMessageId : contextInput);
    } else if (intent === "UPDATE_TASK") {
      validation = await service.validateUpdateTaskPlan(
        p.taskReference || { id: p.id, title: p.title || getCompanyHint(parsed) },
        p.changes || {},
        typeof contextInput === "string" ? originalMessageId : contextInput,
      );
    } else if (intent === "COMPLETE_TASK") {
      validation = await service.validateCompleteTaskPlan(
        p.taskReference || { id: p.id, title: p.title || getCompanyHint(parsed) },
        typeof contextInput === "string" ? originalMessageId : contextInput,
      );
    } else if (intent === "CREATE_PROJECT") {
      validation = await service.validateCreateProjectPlan(p.project || {
        name: p.title || getCompanyHint(parsed),
        stage: p.stage,
        estimatedAmount: p.estimatedAmount,
        currency: p.currency,
      }, p.relatedEntity, typeof contextInput === "string" ? originalMessageId : contextInput);
    } else {
      validation = await service.validateUpdateProjectPlan(
        p.projectReference || { id: p.id, name: p.title || getCompanyHint(parsed) },
        p.changes || {},
        typeof contextInput === "string" ? originalMessageId : contextInput,
      );
    }

    if (validation.success && validation.plan) {
      (parsed.parameters as any).taskProjectPlan = validation.plan;
    }
    return validation;
  }

  if (
    intent === "CREATE_QUOTE"
    || intent === "UPDATE_QUOTE"
    || intent === "SEND_QUOTE"
    || intent === "ACCEPT_QUOTE"
    || intent === "CONVERT_QUOTE_TO_ORDER"
    || intent === "QUOTE_TO_ORDER"
    || intent === "CREATE_ORDER"
    || intent === "UPDATE_ORDER"
  ) {
    const service = await import("@/lib/services/quote-order-flow-service");
    const p: any = parsed.parameters || {};
    const context = typeof contextInput === "string" ? { messageId: originalMessageId } : contextInput;
    let validation: any;

    if (intent === "CREATE_QUOTE") {
      validation = await service.validateCreateQuotePlan(p.quote || {}, p.items || [], p.customerReference, p.projectReference, p.contactReference, context);
    } else if (intent === "UPDATE_QUOTE") {
      validation = await service.validateUpdateQuotePlan(p.quoteReference || { id: p.id }, p.changes || {}, context);
    } else if (intent === "SEND_QUOTE") {
      validation = await service.validateSendQuotePlan(p.quoteReference || { id: p.id }, context);
    } else if (intent === "ACCEPT_QUOTE") {
      validation = await service.validateAcceptQuotePlan(p.quoteReference || { id: p.id }, context);
    } else if (intent === "CONVERT_QUOTE_TO_ORDER" || intent === "QUOTE_TO_ORDER") {
      validation = await service.validateQuoteToOrderPlan(p.quoteReference || { id: p.id }, context);
    } else if (intent === "CREATE_ORDER") {
      validation = await service.validateCreateOrderPlan(p.order || {}, p.items || [], p.customerReference, p.projectReference, p.contactReference, context);
    } else {
      validation = await service.validateUpdateOrderPlan(p.orderReference || { id: p.id }, p.changes || {}, context);
    }

    if (validation.success && validation.plan) {
      (parsed.parameters as any).quoteOrderPlan = validation.plan;
    }
    return validation;
  }

  return { success: false, message: `该操作暂未开放：${intent}` };
}

// ══════════════════════════════════════════════════════════════════
// Confirmation token validation and execution
// ══════════════════════════════════════════════════════════════════

async function handleConfirmationToken(
  token: string,
  context: MessageContext,
): Promise<string> {
  // Handle cancellation
  if (token === "取消" || token === "取消执行") {
    // Cancel all pending actions for this user in this chat
    const cancelled = await prisma.pendingAction.updateMany({
      where: {
        senderId: context.senderId,
        chatId: context.chatId,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });

    if (cancelled.count > 0) {
      return `已取消 ${cancelled.count} 个待确认操作。`;
    }
    return "当前没有待确认的操作。";
  }

  // Find the pending action by token
  const pending = await prisma.pendingAction.findUnique({
    where: { token },
  });

  if (!pending) {
    return `未找到确认码"${token}"对应的操作。请检查确认码是否正确。`;
  }

  // Validate
  if (pending.status !== "PENDING") {
    return `该操作状态为"${pending.status}"，无法重复执行。`;
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingAction.update({
      where: { id: pending.id },
      data: { status: "EXPIRED" },
    });
    return `该操作已过期（超过10分钟）。请重新发起操作。`;
  }

  if (pending.senderId !== context.senderId) {
    return "确认码与发送者不匹配，无法执行。";
  }

  if (pending.chatId !== context.chatId) {
    return "确认码与会话不匹配，请在同一会话中确认。";
  }

  const consumed = await prisma.pendingAction.updateMany({
    where: {
      id: pending.id,
      status: "PENDING",
    },
    data: { status: "CONFIRMED" },
  });
  if (consumed.count !== 1) {
    return "该确认码已被使用，无法重复执行。";
  }

  // Execute the confirmed action
  const { getRiskLevel } = await import("./feishu-risk-levels");

  const riskLevel = getRiskLevel(pending.intent);
  const parsed = { intent: pending.intent, confidence: 1.0, parameters: pending.parameters } as any;
  const result = await executeParsedWriteThroughKernel(parsed, context);

  if (result.success) {
    return `[${riskLevel}级操作-已确认] ${result.message}`;
  }
  return result.message;
}

// ══════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════

const INTENT_LABELS: Record<string, string> = {
  CREATE_LEAD: "创建线索",
  ADD_LEAD_FOLLOWUP: "添加线索跟进",
  UPDATE_LEAD: "更新线索",
  CONVERT_LEAD_TO_CUSTOMER: "线索转客户",
  SEND_QUOTE: "发送报价",
  ACCEPT_QUOTE: "接受报价",
  CONVERT_QUOTE_TO_ORDER: "报价转订单",
  UPDATE_ORDER_STATUS: "更新订单状态",
  RECORD_PAYMENT: "记录付款",
  CLAIM_CUSTOMER: "认领客户",
  RELEASE_CUSTOMER: "退回公海",
};

async function saveOutgoingMessage(
  platformId: number,
  imUserId: number,
  messageId: string,
  content: string,
  intent?: string,
) {
  try {
    await prisma.iMMessage.create({
      data: {
        platformId,
        imUserId,
        direction: "out",
        content,
        externalId: `reply_${messageId}`,
        intent: intent || undefined,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      console.log(`跳过重复回复落库: reply_${messageId}`);
      return;
    }
    throw error;
  }
}
