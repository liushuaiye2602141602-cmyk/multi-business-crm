import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { businessLine: true },
  });

  const headers = [
    "name", "businessLine", "category", "englishKeywords",
    "commonSpecs", "application", "targetMarket", "notes", "isActive", "createdAt"
  ];

  const rows = products.map((p) => [
    p.name,
    p.businessLine.name,
    p.category || "",
    p.englishKeywords || "",
    p.commonSpecs || "",
    p.application || "",
    p.targetMarket || "",
    p.notes || "",
    p.isActive ? "是" : "否",
    formatDate(p.createdAt),
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
      "Content-Disposition": `attachment; filename="products_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
