import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const direction = searchParams.get("direction");
    const keyword = searchParams.get("keyword");

    const where: Record<string, unknown> = {};
    if (direction) where.direction = direction;
    if (keyword) {
      where.OR = [
        { subject: { contains: keyword, mode: "insensitive" } },
        { fromAddr: { contains: keyword, mode: "insensitive" } },
        { toAddr: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          customer: { select: { id: true, company: true } },
          contact: { select: { id: true, name: true } },
          lead: { select: { id: true, company: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.email.count({ where }),
    ]);

    return NextResponse.json({
      emails,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
