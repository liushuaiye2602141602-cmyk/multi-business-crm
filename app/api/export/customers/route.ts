import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CustomerTypeLabel, CustomerStatusLabel, LeadSourceLabel, LeadGradeLabel } from "@/lib/enums";

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { businessLine: true },
  });

  const headers = [
    "companyName", "country", "website", "industry", "customerType",
    "businessLine", "source", "sourceWebsite", "contactName",
    "email", "whatsapp", "customerStatus", "leadGrade", "remark", "createdAt"
  ];

  const rows = customers.map((c) => [
    c.company,
    c.country || "",
    c.website || "",
    c.industry || "",
    CustomerTypeLabel[c.customerType] || c.customerType,
    c.businessLine.name,
    c.source ? LeadSourceLabel[c.source] || c.source : "",
    c.sourceWebsite || "",
    c.contactName,
    c.email || "",
    c.whatsapp || "",
    CustomerStatusLabel[c.customerStatus] || c.customerStatus,
    LeadGradeLabel[c.leadGrade] || c.leadGrade,
    c.remark || "",
    new Date(c.createdAt).toISOString().split("T")[0],
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
      "Content-Disposition": `attachment; filename="customers_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
