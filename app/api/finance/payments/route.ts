import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executionKernel } from "@/lib/kernel/execution-kernel";

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
      include: { customer: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const kernelResult = await executionKernel.execute({
      intent: "RECORD_PAYMENT",
      parameters: {
        data: {
          invoiceId: body.invoiceId,
          amount: body.amount,
          method: body.method || "TT",
          receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
          notes: body.notes || null,
        },
      },
    });

    if (!kernelResult.success || !kernelResult.entityId) {
      return NextResponse.json(
        { error: kernelResult.message || "Failed to create payment" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: kernelResult.entityId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment was created but could not be loaded" },
        { status: 500 }
      );
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}
