import { NextRequest, NextResponse } from "next/server";
import { analyzeLead } from "@/lib/ai/crm-analyzer";

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const analysis = await analyzeLead(leadId);
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
