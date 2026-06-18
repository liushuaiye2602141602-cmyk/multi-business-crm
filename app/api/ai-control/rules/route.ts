import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const rules = await prisma.aIPolicyRule.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rule = await prisma.aIPolicyRule.create({ data: body });
  return NextResponse.json(rule, { status: 201 });
}
