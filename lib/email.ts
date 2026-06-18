import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import prisma from "./prisma";

export async function getActiveEmailConfig() {
  return prisma.emailConfig.findFirst({ where: { isActive: true } });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string;
}) {
  const config = await getActiveEmailConfig();
  if (!config) throw new Error("邮件未配置，请在设置中配置 SMTP");

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });

  const info = await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: options.to,
    cc: options.cc,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return info;
}

export async function fetchEmails(limit = 20) {
  const config = await getActiveEmailConfig();
  if (!config || !config.imapHost || !config.imapPort) {
    throw new Error("IMAP 未配置");
  }

  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const messages: Array<{
        messageId: string;
        subject: string;
        from: string;
        to: string;
        date: Date;
        text: string;
        html: string;
      }> = [];

      const status = await client.status("INBOX", { messages: true });
      const total = status.messages || 0;
      const from = Math.max(1, total - limit + 1);

      for await (const message of client.fetch(`${from}:*`, {
        envelope: true,
        bodyStructure: true,
        source: true,
      })) {
        const source = message.source?.toString() || "";
        const textPart = source.split("\r\n\r\n").slice(1).join("\r\n\r\n");

        messages.push({
          messageId: message.envelope?.messageId || "",
          subject: message.envelope?.subject || "(无主题)",
          from: message.envelope?.from?.map(a => a.address).join(", ") || "",
          to: message.envelope?.to?.map(a => a.address).join(", ") || "",
          date: message.envelope?.date || new Date(),
          text: textPart.slice(0, 5000),
          html: "",
        });
      }

      return messages.reverse();
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
