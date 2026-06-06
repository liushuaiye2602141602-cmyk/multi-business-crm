import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LeadSourceLabel, LeadStatusLabel, LeadGradeLabel, LeadTemperatureLabel } from "@/lib/enums";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { businessLine: true },
  });

  const headers = [
    "companyName", "contactName", "country", "email", "whatsapp",
    "source", "sourceWebsite", "businessLine", "interestProducts",
    "inquiryContent", "grade", "status", "temperature", "nextFollowUp",
    "remark", "createdAt"
  ];

  const rows = leads.map((lead) => [
    lead.company,
    lead.contactName,
    lead.country || "",
    lead.email || "",
    lead.whatsapp || "",
    LeadSourceLabel[lead.source] || lead.source,
    lead.sourceWebsite || "",
    lead.businessLine.name,
    lead.interestProducts || "",
    lead.inquiryContent || "",
    LeadGradeLabel[lead.grade] || lead.grade,
    LeadStatusLabel[lead.status] || lead.status,
    LeadTemperatureLabel[lead.temperature] || lead.temperature,
    lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split("T")[0] : "",
    lead.remark || "",
    new Date(lead.createdAt).toISOString().split("T")[0],
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

  // 添加 BOM 以支持中文 Excel 打开
  const bom = "﻿";
  const csvWithBom = bom + csvContent;

  return new NextResponse(csvWithBom, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
