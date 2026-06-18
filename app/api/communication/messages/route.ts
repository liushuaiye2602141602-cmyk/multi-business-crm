import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/communication/message-service";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = await sendMessage(body);
  return NextResponse.json(message, { status: 201 });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get("customerId");
  const leadId = searchParams.get("leadId");
  const channel = searchParams.get("channel");

  const where: any = {};
  if (customerId) where.customerId = parseInt(customerId);
  if (leadId) where.leadId = parseInt(leadId);
  if (channel) where.channel = channel;

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(messages);
}
