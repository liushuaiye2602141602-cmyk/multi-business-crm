import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executionKernel } from "@/lib/kernel/execution-kernel";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = parseInt(customerId);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, company: true } },
          order: { select: { id: true, orderNo: true } },
          payments: { orderBy: { receivedAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.customerId || !body.amount) {
      return NextResponse.json(
        { error: "customerId and amount are required" },
        { status: 400 }
      );
    }

    const invoiceCount = await prisma.invoice.count();
    const invoiceNo = `INV-${String(invoiceCount + 1).padStart(6, "0")}`;

    const kernelResult = await executionKernel.execute({
      intent: "CREATE_INVOICE",
      parameters: {
        data: {
          invoiceNo,
          orderId: body.orderId || null,
          customerId: body.customerId,
          amount: body.amount,
          currency: body.currency || "USD",
          status: "DRAFT",
          issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes || null,
        },
      },
    });

    if (!kernelResult.success || !kernelResult.entityId) {
      return NextResponse.json(
        { error: kernelResult.message || "Failed to create invoice" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: kernelResult.entityId },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice was created but could not be loaded" },
        { status: 500 }
      );
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}
