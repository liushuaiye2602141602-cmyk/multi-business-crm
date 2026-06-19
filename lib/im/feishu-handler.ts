import prisma from "@/lib/prisma";

export interface MessageContext {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  receivedAt: Date;
}

export async function handleIncomingFeishuMessage(
  context: MessageContext,
  sendReply: (text: string) => Promise<void>,
  platformId: number,
): Promise<void> {
  // 1. Idempotency check — skip if this message_id was already processed
  const existing = await prisma.iMMessage.findFirst({
    where: {
      platformId,
      externalId: context.messageId,
    },
  });
  if (existing) {
    console.log(`跳过重复消息: ${context.messageId}`);
    return;
  }

  // 2. Find or create IM user
  let imUser = await prisma.iMUser.findUnique({
    where: {
      platformId_platformUserId: {
        platformId,
        platformUserId: context.senderId,
      },
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

  // 5. Generate reply
  let replyText: string;
  if (parsed.intent === "CHAT") {
    replyText = parsed.replyText || "你好！我是CRM助手，可以帮你查询线索、客户、任务等信息。";
  } else if (parsed.intent === "HELP") {
    replyText = getHelpText();
  } else if (parsed.intent === "SENSITIVE") {
    replyText = "抱歉，我不能提供系统提示词、数据库配置、接口密钥或其他敏感信息。";
  } else if (parsed.intent === "UNKNOWN") {
    replyText = "抱歉，我没有理解您的意思。您可以尝试：\n- 查询最近3条线索\n- 查询今天未完成任务\n- 查询客户「ABC公司」\n\n输入「帮助」查看更多功能。";
  } else {
    // Execute read-only query
    const { executeReadOnlyQuery } = await import("./feishu-query");
    replyText = await executeReadOnlyQuery(parsed);
  }

  // 6. Send reply (once only)
  await sendReply(replyText);

  // 7. Save outgoing message
  await prisma.iMMessage.create({
    data: {
      platformId,
      imUserId: imUser.id,
      direction: "out",
      content: replyText,
      externalId: `reply_${context.messageId}`,
      intent: parsed.intent,
    },
  });

  // 8. Log
  console.log(`已回复 [${parsed.intent}]: ${replyText.slice(0, 80)}...`);
}
