import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const platform = await prisma.iMPlatform.findUnique({
      where: { id: parseInt(id) },
      include: {
        imUsers: { orderBy: { createdAt: "desc" }, take: 50 },
        _count: { select: { imMessages: true } },
      },
    });
    if (!platform) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }
    return NextResponse.json(platform);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch platform" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const platform = await prisma.iMPlatform.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.appId !== undefined && { appId: body.appId }),
        ...(body.appSecret !== undefined && { appSecret: body.appSecret }),
        ...(body.encryptKey !== undefined && { encryptKey: body.encryptKey }),
        ...(body.verifyToken !== undefined && { verifyToken: body.verifyToken }),
        ...(body.botToken !== undefined && { botToken: body.botToken }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.extra !== undefined && { extra: body.extra }),
      },
    });
    return NextResponse.json(platform);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update platform" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.iMPlatform.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete platform" },
      { status: 500 }
    );
  }
}
