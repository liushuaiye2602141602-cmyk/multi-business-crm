import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const config = await prisma.aIConfig.findFirst({ where: { isActive: true } });
    if (!config) {
      return NextResponse.json({ success: false, error: "AI 未配置" });
    }

    let baseUrl = config.baseUrl;
    if (!baseUrl.endsWith("/")) baseUrl += "/";

    const response = await fetch(`${baseUrl}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Hi, reply with OK" }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json({
        success: false,
        error: `API 返回 ${response.status}: ${errorText.slice(0, 200)}`,
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      message: `连接成功！模型回复: "${reply.trim()}"`,
      model: config.model,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "连接失败",
    });
  }
}
