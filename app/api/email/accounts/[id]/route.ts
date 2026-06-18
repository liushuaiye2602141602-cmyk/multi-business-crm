import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.emailAccount.findUnique({
    where: { id: parseInt(id) },
    include: { _count: { select: { messages: true, threads: true } } },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(account);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const account = await prisma.emailAccount.update({ where: { id: parseInt(id) }, data: body });
  return NextResponse.json(account);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.emailAccount.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
