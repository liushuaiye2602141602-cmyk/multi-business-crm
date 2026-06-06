import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QuoteStatusLabel } from "@/lib/enums";

export async function GET() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, lead: true, project: true },
  });

  const headers = [
    "quoteNo", "customer", "project", "productName", "specs",
    "quantity", "unitPrice", "totalPrice", "currency",
    "paymentTerms", "deliveryTime", "validUntil", "status", "content"
  ];

  const rows = quotes.map((q) => [
    q.quoteNo,
    q.customer?.company || q.lead?.company || "",
    q.project?.name || "",
    q.productName || "",
    q.specs || "",
    q.quantity || "",
    q.unitPrice ? String(q.unitPrice) : "",
    q.totalPrice ? String(q.totalPrice) : "",
    q.currency,
    q.paymentTerms || "",
    q.deliveryTime || "",
    q.validUntil ? new Date(q.validUntil).toISOString().split("T")[0] : "",
    QuoteStatusLabel[q.status] || q.status,
    q.content || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(",")
    ),
  ].join("\n");

  const bom = "﻿";
  const csvWithBom = bom + csvContent;

  return new NextResponse(csvWithBom, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotes_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
