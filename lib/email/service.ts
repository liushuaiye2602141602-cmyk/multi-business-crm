import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

// Send email
export async function sendEmail(accountId: number, options: {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  cc?: string;
  inReplyTo?: string;
  leadId?: number;
  customerId?: number;
  contactId?: number;
  quoteId?: number;
  orderId?: number;
}) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Email account not found");

  const transporter = nodemailer.createTransport({
    host: account.smtpHost || "",
    port: account.smtpPort || 587,
    secure: account.smtpSecure,
    auth: {
      user: account.username,
      pass: account.password,
    },
  });

  const info = await transporter.sendMail({
    from: `"${account.name}" <${account.emailAddress}>`,
    to: options.to,
    cc: options.cc,
    subject: options.subject,
    text: options.body,
    html: options.bodyHtml || options.body,
  });

  // Save to database
  const message = await prisma.emailMessage.create({
    data: {
      accountId,
      direction: "out",
      messageId: info.messageId,
      inReplyTo: options.inReplyTo || null,
      fromAddr: account.emailAddress,
      toAddr: options.to,
      ccAddr: options.cc || null,
      subject: options.subject,
      body: options.body,
      bodyHtml: options.bodyHtml || null,
      status: "sent",
      sentAt: new Date(),
      leadId: options.leadId || null,
      customerId: options.customerId || null,
      contactId: options.contactId || null,
      quoteId: options.quoteId || null,
      orderId: options.orderId || null,
      tenantId: account.tenantId,
    },
  });

  // Update or create thread
  if (options.inReplyTo) {
    const parentMessage = await prisma.emailMessage.findFirst({
      where: { messageId: options.inReplyTo },
    });
    if (parentMessage?.threadId) {
      await prisma.emailThread.update({
        where: { id: parentMessage.threadId },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      });
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: { threadId: parentMessage.threadId },
      });
    }
  } else {
    // Create new thread
    const thread = await prisma.emailThread.create({
      data: {
        accountId,
        subject: options.subject,
        lastMessageAt: new Date(),
        messageCount: 1,
        tenantId: account.tenantId,
      },
    });
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { threadId: thread.id },
    });
  }

  return message;
}

// Fetch emails from IMAP
export async function fetchEmails(accountId: number, limit = 50) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Email account not found");

  const client = new ImapFlow({
    host: account.imapHost || "",
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.username,
      pass: account.password,
    },
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const fetched: Array<{
        messageId: string;
        from: string;
        to: string;
        subject: string;
        date: Date;
        body: string;
        inReplyTo: string | null;
      }> = [];
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages || 0;
      const from = Math.max(1, total - limit + 1);

      for await (const message of client.fetch(`${from}:*`, {
        envelope: true,
        source: true,
        uid: true,
      })) {
        const source = message.source?.toString() || "";
        const bodyParts = source.split("\r\n\r\n");
        const body = bodyParts.slice(1).join("\r\n\r\n").trim();

        fetched.push({
          messageId: message.envelope?.messageId || "",
          from: message.envelope?.from?.map(a => a.address).join(", ") || "",
          to: message.envelope?.to?.map(a => a.address).join(", ") || "",
          subject: message.envelope?.subject || "(no subject)",
          date: message.envelope?.date || new Date(),
          body: body.slice(0, 10000),
          inReplyTo: message.envelope?.inReplyTo || null,
        });
      }

      // Persist to database
      let newCount = 0;
      for (const email of fetched) {
        const existing = await prisma.emailMessage.findFirst({
          where: { messageId: email.messageId },
        });
        if (!existing) {
          // Auto-bind to CRM entities
          const autoBind = await autoBindEmail(email.from);

          const message = await prisma.emailMessage.create({
            data: {
              accountId,
              direction: "in",
              messageId: email.messageId,
              inReplyTo: email.inReplyTo,
              fromAddr: email.from,
              toAddr: email.to,
              subject: email.subject,
              body: email.body,
              status: "received",
              receivedAt: email.date,
              leadId: autoBind?.leadId || null,
              customerId: autoBind?.customerId || null,
              contactId: autoBind?.contactId || null,
              tenantId: account.tenantId,
            },
          });

          // Handle threading
          if (email.inReplyTo) {
            const parent = await prisma.emailMessage.findFirst({
              where: { messageId: email.inReplyTo },
            });
            if (parent?.threadId) {
              await prisma.emailMessage.update({
                where: { id: message.id },
                data: { threadId: parent.threadId },
              });
              await prisma.emailThread.update({
                where: { id: parent.threadId },
                data: { lastMessageAt: email.date, messageCount: { increment: 1 } },
              });
            }
          } else {
            const thread = await prisma.emailThread.create({
              data: {
                accountId,
                subject: email.subject,
                lastMessageAt: email.date,
                messageCount: 1,
                tenantId: account.tenantId,
              },
            });
            await prisma.emailMessage.update({
              where: { id: message.id },
              data: { threadId: thread.id },
            });
          }
          newCount++;
        }
      }

      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { lastSyncAt: new Date() },
      });

      return { total: fetched.length, new: newCount };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// Auto-bind incoming email to CRM entities
async function autoBindEmail(fromAddress: string): Promise<{
  leadId?: number;
  customerId?: number;
  contactId?: number;
} | null> {
  if (!fromAddress) return null;

  // Try to match by Contact email
  const contact = await prisma.contact.findFirst({
    where: { email: fromAddress },
  });
  if (contact) {
    return { contactId: contact.id, customerId: contact.customerId };
  }

  // Try to match by Customer email
  const customer = await prisma.customer.findFirst({
    where: { email: fromAddress },
  });
  if (customer) {
    return { customerId: customer.id };
  }

  // Try to match by Lead email
  const lead = await prisma.lead.findFirst({
    where: { email: fromAddress },
  });
  if (lead) {
    return { leadId: lead.id };
  }

  return null;
}

// Get email threads for account
export async function getThreads(accountId: number, limit = 20) {
  return prisma.emailThread.findMany({
    where: { accountId },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
}

// Get thread with all messages
export async function getThreadMessages(threadId: number) {
  return prisma.emailMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    include: {
      lead: { select: { id: true, company: true } },
      customer: { select: { id: true, company: true } },
      contact: { select: { id: true, name: true, email: true } },
    },
  });
}
