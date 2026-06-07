import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TaskTypeLabel, TaskStatusLabel, TaskPriorityLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: true, customer: true, project: true },
  });

  const headers = [
    "title", "type", "status", "priority", "dueDate",
    "lead", "customer", "project", "description", "createdAt"
  ];

  const rows = tasks.map((t) => [
    t.title,
    TaskTypeLabel[t.type] || t.type,
    TaskStatusLabel[t.status] || t.status,
    TaskPriorityLabel[t.priority] || t.priority,
    t.dueDate ? formatDate(t.dueDate) : "",
    t.lead?.company || "",
    t.customer?.company || "",
    t.project?.name || "",
    t.description || "",
    formatDate(t.createdAt),
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
      "Content-Disposition": `attachment; filename="tasks_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
