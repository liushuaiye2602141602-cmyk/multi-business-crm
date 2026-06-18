import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const actionType = searchParams.get("actionType");
  const allowed = searchParams.get("allowed");

  const where: any = {};
  if (actionType) where.actionType = actionType;
  if (allowed !== null && allowed !== undefined) where.allowed = allowed === "true";

  const [logs, total] = await Promise.all([
    prisma.aIExecutionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aIExecutionLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize });
}
