import { NextResponse } from "next/server";
import { checkAndTriggerFollowUps } from "@/lib/ai/agents";

export async function POST() {
  try {
    const actions = await checkAndTriggerFollowUps();
    return NextResponse.json({ success: true, actions, count: actions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
