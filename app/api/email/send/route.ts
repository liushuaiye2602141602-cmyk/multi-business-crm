import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, cc, customerId, contactId, leadId } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "收件人和主题不能为空" },
        { status: 400 }
      );
    }

    const config = await prisma.emailConfig.findFirst({
      where: { isActive: true },
    });

    const info = await sendEmail({ to, subject, text, html, cc });

    const email = await prisma.email.create({
      data: {
        direction: "out",
        subject,
        body: text || "",
        bodyHtml: html || null,
        fromAddr: config?.fromEmail || "",
        toAddr: to,
        ccAddr: cc || null,
        messageId: info.messageId || null,
        status: "sent",
        customerId: customerId ? Number(customerId) : null,
        contactId: contactId ? Number(contactId) : null,
        leadId: leadId ? Number(leadId) : null,
        sentAt: new Date(),
      },
    });

    await createActivityLog({
      action: "发送邮件",
      entityType: "邮件",
      entityId: email.id,
      entityName: subject,
      description: `发送邮件至 ${to}，主题: ${subject}`,
    });

    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发送邮件失败" },
      { status: 500 }
    );
  }
}
