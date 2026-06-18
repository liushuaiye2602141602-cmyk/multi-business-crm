import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  let settings = await prisma.aIControlSettings.findFirst();
  if (!settings) {
    settings = await prisma.aIControlSettings.create({ data: {} });
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  let settings = await prisma.aIControlSettings.findFirst();
  if (!settings) {
    settings = await prisma.aIControlSettings.create({ data: body });
  } else {
    settings = await prisma.aIControlSettings.update({
      where: { id: settings.id },
      data: body,
    });
  }
  return NextResponse.json(settings);
}
