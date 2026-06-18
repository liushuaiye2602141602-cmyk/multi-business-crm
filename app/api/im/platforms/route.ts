import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const platforms = await prisma.iMPlatform.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { imUsers: true, imMessages: true } } },
    });
    return NextResponse.json(platforms);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const existing = await prisma.iMPlatform.findUnique({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json({ error: "Platform already exists" }, { status: 409 });
    }
    const platform = await prisma.iMPlatform.create({
      data: {
        name: body.name,
        appId: body.appId || null,
        appSecret: body.appSecret || null,
        encryptKey: body.encryptKey || null,
        verifyToken: body.verifyToken || null,
        botToken: body.botToken || null,
        isActive: body.isActive ?? true,
        extra: body.extra || null,
      },
    });
    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create platform" },
      { status: 500 }
    );
  }
}
