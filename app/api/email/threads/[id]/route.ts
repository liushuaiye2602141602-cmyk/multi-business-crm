import { NextRequest, NextResponse } from "next/server";
import { getThreadMessages } from "@/lib/email/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await getThreadMessages(parseInt(id));
  return NextResponse.json(messages);
}
