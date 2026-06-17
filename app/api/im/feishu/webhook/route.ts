import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyFeishuSignature, sendFeishuMessage } from "@/lib/im/feishu";
import { parseIntent } from "@/lib/ai/intent";
import { executeIntent } from "@/lib/ai/executor";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL 验证（飞书首次配置时发送）
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const platform = await prisma.iMPlatform.findUnique({ where: { name: "feishu" } });
  if (!platform || !platform.isActive) {
    return NextResponse.json({ error: "Feishu platform not configured" }, { status: 400 });
  }

  // 验证签名
  if (platform.encryptKey) {
    const timestamp = request.headers.get("x-lark-request-timestamp") || "";
    const nonce = request.headers.get("x-lark-request-nonce") || "";
    const signature = request.headers.get("x-lark-signature") || "";
    const expectedSignature = verifyFeishuSignature(timestamp, nonce, platform.encryptKey, rawBody);
    if (signature && signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const header = body.header as Record<string, unknown> | undefined;
  const event = body.event as Record<string, unknown> | undefined;
  if (!header || !event) {
    return NextResponse.json({ ok: true });
  }

  const eventType = header.event_type as string;

  if (eventType === "im.message.receive_v1") {
    const message = event.message as Record<string, unknown> | undefined;
    const sender = event.sender as Record<string, unknown> | undefined;
    if (!message || !sender) {
      return NextResponse.json({ ok: true });
    }

    const senderId = (sender.sender_id as Record<string, string>)?.open_id;
    const chatId = message.chat_id as string;
    const messageType = message.message_type as string;

    if (messageType !== "text") {
      return NextResponse.json({ ok: true });
    }

    let content = "";
    try {
      const contentObj = JSON.parse(message.content as string);
      content = contentObj.text || "";
    } catch {
      content = (message.content as string) || "";
    }
    content = content.replace(/@_user_\d+/g, "").trim();
    if (!content) {
      return NextResponse.json({ ok: true });
    }

    let imUser = await prisma.iMUser.findUnique({
      where: {
        platformId_platformUserId: {
          platformId: platform.id,
          platformUserId: senderId || "unknown",
        },
      },
    });
    if (!imUser) {
      imUser = await prisma.iMUser.create({
        data: {
          platformId: platform.id,
          platformUserId: senderId || "unknown",
          platformName: (sender.sender_id as Record<string, string>)?.user_id || "未知用户",
        },
      });
    }

    await prisma.iMMessage.create({
      data: {
        platformId: platform.id,
        imUserId: imUser.id,
        direction: "in",
        content,
      },
    });

    // 异步处理
    processMessageAsync(platform, imUser, content, chatId).catch((err) => {
      console.error("Failed to process IM message:", err);
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function processMessageAsync(
  platform: { id: number; appId: string | null; appSecret: string | null },
  imUser: { id: number },
  content: string,
  chatId: string
) {
  let intent: string | null = null;
  let action: string | null = null;
  let replyContent: string;
  let actionResult: unknown = null;
  let errorMsg: string | null = null;

  try {
    const intentResult = await parseIntent(content);
    intent = intentResult.intent;
    action = intentResult.functionName;
    const execResult = await executeIntent(intentResult);
    replyContent = execResult.message;
    actionResult = execResult;

    await createActivityLog({
      action: "IM AI 处理",
      entityType: "IM消息",
      entityId: imUser.id,
      entityName: content.slice(0, 50),
      description: `意图: ${intent}, 结果: ${execResult.success ? "成功" : "失败"}`,
    });
  } catch (error) {
    errorMsg = error instanceof Error ? error.message : "处理失败";
    replyContent = `❌ 处理出错：${errorMsg}`;
  }

  await prisma.iMMessage.create({
    data: {
      platformId: platform.id,
      imUserId: imUser.id,
      direction: "out",
      content: replyContent,
      intent,
      action,
      actionResult: actionResult ? JSON.parse(JSON.stringify(actionResult)) : null,
      errorMsg,
    },
  });

  if (platform.appId && platform.appSecret && chatId) {
    await sendFeishuMessage(platform.appId, platform.appSecret, chatId, replyContent);
  }
}
