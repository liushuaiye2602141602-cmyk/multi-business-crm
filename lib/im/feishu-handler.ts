import prisma from "@/lib/prisma";
import type { WriteIntent } from "./feishu-parser";

export interface MessageContext {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  receivedAt: Date;
}

// All write intents and their corresponding env var flag names
const WRITE_INTENT_FLAGS: Record<string, string> = {
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
  CREATE_QUOTE: "FEISHU_ALLOW_CREATE_QUOTE",
  UPDATE_QUOTE: "FEISHU_ALLOW_UPDATE_QUOTE",
  SEND_QUOTE: "FEISHU_ALLOW_SEND_QUOTE",
  ACCEPT_QUOTE: "FEISHU_ALLOW_ACCEPT_QUOTE",
  CONVERT_QUOTE_TO_ORDER: "FEISHU_ALLOW_QUOTE_TO_ORDER",
  CREATE_ORDER: "FEISHU_ALLOW_CREATE_ORDER",
  UPDATE_ORDER: "FEISHU_ALLOW_UPDATE_ORDER",
  CREATE_INVOICE: "FEISHU_ALLOW_CREATE_INVOICE",
  UPDATE_INVOICE: "FEISHU_ALLOW_UPDATE_INVOICE",
  RECORD_PAYMENT: "FEISHU_ALLOW_RECORD_PAYMENT",
  CLAIM_CUSTOMER: "FEISHU_ALLOW_CUSTOMER_POOL",
  RELEASE_CUSTOMER: "FEISHU_ALLOW_CUSTOMER_POOL",
  UPDATE_ORDER_STATUS: "FEISHU_ALLOW_UPDATE_ORDER",
};

// Confirmation expiry in milliseconds (10 minutes)
const CONFIRM_EXPIRY_MS = 10 * 60 * 1000;

const WRITE_INTENTS: ReadonlySet<string> = new Set(Object.keys(WRITE_INTENT_FLAGS));

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
  await prisma.iMMessage.create({
    data: {
      platformId,
      imUserId: imUser.id,
      direction: "in",
      content: context.text,
      externalId: context.messageId,
    },
  });

  // 4. Parse intent using local rule-based parser (no AI call needed)
  const { parseFeishuIntent, getHelpText } = await import("./feishu-parser");
  const parsed = parseFeishuIntent(context.text);
  console.log(`意图: ${parsed.intent} (置信度: ${parsed.confidence})`);

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
  } else if (WRITE_INTENTS.has(parsed.intent)) {
    // Write intent - full risk control flow
    replyText = await handleWriteIntent(parsed.intent as string, parsed, context);
  } else {
    // Read-only query
    const { executeReadOnlyQuery } = await import("./feishu-query");
    replyText = await executeReadOnlyQuery(parsed);
  }

  // 7. Send reply (once only)
  await sendReply(replyText);

  // 8. Save outgoing message
  await saveOutgoingMessage(platformId, imUser.id, context.messageId, replyText, parsed.intent);

  // 9. Log
  console.log(`已回复 [${parsed.intent}]: ${replyText.slice(0, 80)}...`);
}

// ══════════════════════════════════════════════════════════════════
// Write intent handling with risk control
// ══════════════════════════════════════════════════════════════════

async function handleWriteIntent(
  intent: string,
  parsed: any,
  context: MessageContext,
): Promise<string> {
  // Step 1: Global kill switch
  const readOnly = process.env.FEISHU_READ_ONLY !== "false";
  if (readOnly) {
    return "当前为只读模式，无法执行写入操作。管理员可通过设置 FEISHU_READ_ONLY=false 开启写入。";
  }

  // Step 2: Check fine-grained permission flag
  const flagName = WRITE_INTENT_FLAGS[intent];
  if (flagName && process.env[flagName] !== "true") {
    return `该操作未授权。请联系管理员开启 ${flagName} 权限。`;
  }

  // Step 3: Get risk level
  const { getRiskLevel } = await import("./feishu-risk-levels");
  const riskLevel = getRiskLevel(intent);

  // Step 4: C-level (high risk) - require confirmation
  if (riskLevel === "C") {
    return handleHighRiskIntent(intent, parsed, context);
  }

  // Step 5: A/B level - execute directly
  const { executeWriteIntent } = await import("./feishu-write-executor");
  const result = await executeWriteIntent(parsed, context.senderId, context.chatId);

  return result.success
    ? `[${riskLevel}级操作] ${result.message}`
    : result.message;
}

// ══════════════════════════════════════════════════════════════════
// High-risk confirmation flow (C-level)
// ══════════════════════════════════════════════════════════════════

async function handleHighRiskIntent(
  intent: string,
  parsed: any,
  context: MessageContext,
): Promise<string> {
  // Check for pending confirmation on this intent
  const { executeWriteIntent } = await import("./feishu-write-executor");
  const result = await executeWriteIntent(parsed, context.senderId, context.chatId);

  // If execution failed (missing params etc.), return the error directly
  if (!result.success) {
    return result.message;
  }

  // Generate a short unique token (first 8 chars of a random hex)
  const token = `${intent.substring(0, 3)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Build summary of what will be executed
  const intentLabel = INTENT_LABELS[intent] || intent;
  const summary = [
    `即将执行：${intentLabel}`,
    result.message,
    "",
    `操作风险等级：C (高风险)`,
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
      entityType: result.entityType || null,
      entityId: result.entityId || null,
      status: "PENDING",
      expiresAt,
    },
  });

  console.log(`高风险操作待确认: ${intent} token=${token} expires=${expiresAt.toISOString()}`);

  return summary;
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

  // Execute the confirmed action
  const { getRiskLevel } = await import("./feishu-risk-levels");
  const { executeWriteIntent } = await import("./feishu-write-executor");

  const riskLevel = getRiskLevel(pending.intent);
  const parsed = { intent: pending.intent, confidence: 1.0, parameters: pending.parameters } as any;
  const result = await executeWriteIntent(parsed, pending.senderId, pending.chatId);

  // Mark as confirmed
  await prisma.pendingAction.update({
    where: { id: pending.id },
    data: { status: "CONFIRMED" },
  });

  if (result.success) {
    return `[${riskLevel}级操作-已确认] ${result.message}`;
  }
  return result.message;
}

// ══════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════

const INTENT_LABELS: Record<string, string> = {
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
}
