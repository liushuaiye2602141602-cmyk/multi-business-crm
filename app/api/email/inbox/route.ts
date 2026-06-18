import { NextResponse } from "next/server";
import { fetchEmails } from "@/lib/email";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const messages = await fetchEmails(20);

    // 将收到的邮件存入数据库（跳过已存在的 messageId）
    for (const msg of messages) {
      if (!msg.messageId) continue;

      const existing = await prisma.email.findUnique({
        where: { messageId: msg.messageId },
      });

      if (!existing) {
        await prisma.email.create({
          data: {
            direction: "in",
            subject: msg.subject,
            body: msg.text,
            bodyHtml: msg.html || null,
            fromAddr: msg.from,
            toAddr: msg.to,
            messageId: msg.messageId,
            status: "read",
            receivedAt: msg.date,
          },
        });
      }
    }

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取邮件失败" },
      { status: 500 }
    );
  }
}
