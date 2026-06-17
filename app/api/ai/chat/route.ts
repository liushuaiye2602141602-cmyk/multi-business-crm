import { NextRequest, NextResponse } from "next/server";
import { parseIntent } from "@/lib/ai/intent";
import { executeIntent } from "@/lib/ai/executor";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const intentResult = await parseIntent(message);
    const execResult = await executeIntent(intentResult);

    await createActivityLog({
      action: "AI Chat",
      entityType: "IM消息",
      entityName: message.slice(0, 50),
      description: `意图: ${intentResult.intent}, 结果: ${execResult.success ? "成功" : "失败"}`,
    });

    return NextResponse.json({
      intent: intentResult.intent,
      reply: execResult.message,
      success: execResult.success,
      data: execResult.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 500 }
    );
  }
}
