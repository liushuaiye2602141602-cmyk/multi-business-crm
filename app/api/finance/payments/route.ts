import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.invoiceId || !body.amount) {
      return NextResponse.json(
        { error: "invoiceId and amount are required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
      include: { payments: true, customer: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: body.invoiceId,
        amount: body.amount,
        method: body.method || "TT",
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
        notes: body.notes || null,
      },
    });

    // 检查是否全额支付
    const totalPaid =
      Number(
        invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      ) + Number(body.amount);
    if (totalPaid >= Number(invoice.amount)) {
      await prisma.invoice.update({
        where: { id: body.invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    await createActivityLog({
      action: "收款记录",
      entityType: "发票",
      entityId: body.invoiceId,
      entityName: invoice.invoiceNo,
      description: `记录收款 ${invoice.currency} ${body.amount} (发票: ${invoice.invoiceNo})`,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}
