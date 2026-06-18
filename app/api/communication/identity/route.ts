import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/communication/message-service";

export async function POST(request: NextRequest) {
  const { identifier, type } = await request.json();
  const result = await resolveIdentity(identifier, type);
  return NextResponse.json(result || { found: false });
}
