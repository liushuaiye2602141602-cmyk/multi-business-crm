import { NextRequest, NextResponse } from "next/server";
import { getCustomerTimeline } from "@/lib/communication/message-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const timeline = await getCustomerTimeline(parseInt(customerId));
  return NextResponse.json(timeline);
}
