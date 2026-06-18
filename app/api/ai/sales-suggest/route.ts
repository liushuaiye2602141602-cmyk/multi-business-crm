import { NextRequest, NextResponse } from "next/server";
import { generateSalesMessage } from "@/lib/ai/agents";

export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId } = await request.json();
    const suggestions = await generateSalesMessage(entityType, entityId);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
