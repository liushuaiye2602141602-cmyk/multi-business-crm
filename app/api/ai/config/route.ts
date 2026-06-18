import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.aIConfig.findFirst({ where: { isActive: true } });
    if (!config) {
      return NextResponse.json({ configured: false });
    }
    return NextResponse.json({
      configured: true,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}****` : "",
      hasVision: !!(config.visionApiKey && config.visionModel),
      visionBaseUrl: config.visionBaseUrl || "",
      visionModel: config.visionModel || "",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.baseUrl || !body.apiKey || !body.model) {
      return NextResponse.json({ error: "baseUrl, apiKey, model are required" }, { status: 400 });
    }

    // Check if key is masked (contains ****)
    const isMasked = body.apiKey.includes("****");

    const existing = await prisma.aIConfig.findFirst({ where: { isActive: true } });

    if (existing) {
      await prisma.aIConfig.update({
        where: { id: existing.id },
        data: {
          provider: body.provider || "OPENAI_COMPATIBLE",
          baseUrl: body.baseUrl,
          ...(isMasked ? {} : { apiKey: body.apiKey }),
          model: body.model,
          visionBaseUrl: body.visionBaseUrl || null,
          visionApiKey: body.visionApiKey && !body.visionApiKey.includes("****") ? body.visionApiKey : undefined,
          visionModel: body.visionModel || null,
        },
      });
    } else {
      await prisma.aIConfig.create({
        data: {
          provider: body.provider || "OPENAI_COMPATIBLE",
          baseUrl: body.baseUrl,
          apiKey: body.apiKey,
          model: body.model,
          visionBaseUrl: body.visionBaseUrl || null,
          visionApiKey: body.visionApiKey || null,
          visionModel: body.visionModel || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
