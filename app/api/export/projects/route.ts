import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ProjectStatusLabel } from "@/lib/enums";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { businessLine: true, customer: true, lead: true },
  });

  const headers = [
    "projectName", "businessLine", "customer", "lead",
    "productCategory", "productName", "specs", "quantity",
    "usage", "targetMarket", "amount", "currency",
    "status", "remark", "createdAt"
  ];

  const rows = projects.map((p) => [
    p.name,
    p.businessLine.name,
    p.customer.company,
    p.lead?.company || "",
    p.productCategory || "",
    p.productName || "",
    p.specs || "",
    p.quantity || "",
    p.usage || "",
    p.targetMarket || "",
    p.amount ? String(p.amount) : "",
    p.currency,
    ProjectStatusLabel[p.status] || p.status,
    p.remark || "",
    new Date(p.createdAt).toISOString().split("T")[0],
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
      "Content-Disposition": `attachment; filename="projects_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
