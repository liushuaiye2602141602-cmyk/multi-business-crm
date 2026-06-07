import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export async function GET() {
  const analyses = await prisma.aIAnalysis.findMany({
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "targetType", "targetId", "title", "summary",
    "qualificationLevel", "intentLevel", "nextAction", "createdAt"
  ];

  const rows = analyses.map((a) => [
    a.targetType,
    String(a.targetId),
    a.title || "",
    a.summary || "",
    a.qualificationLevel || "",
    a.intentLevel || "",
    a.nextAction || "",
    formatDate(a.createdAt),
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
      "Content-Disposition": `attachment; filename="ai-analyses_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
