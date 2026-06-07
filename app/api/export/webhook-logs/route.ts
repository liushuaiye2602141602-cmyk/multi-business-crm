import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { WebhookStatusLabel } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";

export async function GET() {
  const logs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const headers = [
    "status", "sourceCode", "ipAddress", "errorMessage", "createdAt"
  ];

  const rows = logs.map((l) => [
    WebhookStatusLabel[l.status] || l.status,
    l.sourceCode || "",
    l.ipAddress || "",
    l.errorMessage || "",
    formatDateTime(l.createdAt),
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

  return new NextResponse("﻿" + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="webhook-logs_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
