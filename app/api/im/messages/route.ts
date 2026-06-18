import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const platformId = searchParams.get("platformId");
    const direction = searchParams.get("direction");

    const where: Record<string, unknown> = {};
    if (platformId) where.platformId = parseInt(platformId);
    if (direction) where.direction = direction;

    const [messages, total] = await Promise.all([
      prisma.iMMessage.findMany({
        where,
        include: {
          platform: { select: { name: true } },
          imUser: { select: { platformName: true, platformUserId: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.iMMessage.count({ where }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
