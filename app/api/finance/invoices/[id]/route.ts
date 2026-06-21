import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executionKernel } from "@/lib/kernel/execution-kernel";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        order: { include: { items: true } },
        payments: { orderBy: { receivedAt: "desc" } },
      },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    const body = await request.json();
    const data = {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.issuedAt !== undefined && {
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
      }),
      ...(body.dueDate !== undefined && {
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      }),
      ...(body.paidAt !== undefined && {
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
    };

    const kernelResult = await executionKernel.execute({
      intent: "UPDATE_INVOICE",
      parameters: {
        invoiceId,
        data,
      },
    });

    if (!kernelResult.success) {
      return NextResponse.json(
        { error: kernelResult.message || "Failed to update invoice" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const kernelResult = await executionKernel.execute({
      intent: "DELETE_INVOICE",
      parameters: { invoiceId },
    });

    if (!kernelResult.success) {
      return NextResponse.json(
        { error: kernelResult.message || "Failed to delete invoice" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
