import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FollowUpMethodLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";

export async function GET() {
  const followUps = await prisma.followUp.findMany({
    orderBy: { followUpDate: "desc" },
    include: { lead: true, customer: true, project: true },
  });

  const headers = [
    "method", "content", "customerFeedback", "nextAction",
    "followUpDate", "nextFollowUpDate", "lead", "customer", "project", "remark"
  ];

  const rows = followUps.map((f) => [
    FollowUpMethodLabel[f.method] || f.method,
    f.content,
    f.customerFeedback || "",
    f.nextAction || "",
    formatDate(f.followUpDate),
    f.nextFollowUpDate ? formatDate(f.nextFollowUpDate) : "",
    f.lead?.company || "",
    f.customer?.company || "",
    f.project?.name || "",
    f.remark || "",
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
      "Content-Disposition": `attachment; filename="follow-ups_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
