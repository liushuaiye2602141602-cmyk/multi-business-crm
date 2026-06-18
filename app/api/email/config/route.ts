import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.emailConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      return NextResponse.json(null);
    }

    // 隐藏密码字段
    const { password, ...safe } = config;
    return NextResponse.json({ ...safe, password: "***" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch email config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      host,
      port,
      secure,
      username,
      password,
      fromName,
      fromEmail,
      imapHost,
      imapPort,
    } = body;

    if (!name || !host || !port || !username || !password || !fromName || !fromEmail) {
      return NextResponse.json(
        { error: "必填字段不能为空" },
        { status: 400 }
      );
    }

    const data = {
      name,
      host,
      port: Number(port),
      secure: Boolean(secure),
      username,
      password,
      fromName,
      fromEmail,
      imapHost: imapHost || null,
      imapPort: imapPort ? Number(imapPort) : null,
    };

    let config;
    if (id) {
      config = await prisma.emailConfig.update({
        where: { id: Number(id) },
        data,
      });
    } else {
      // 创建前将其他配置设为非活跃
      await prisma.emailConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      config = await prisma.emailConfig.create({ data });
    }

    const { password: _, ...safe } = config;
    return NextResponse.json(safe);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save email config" },
      { status: 500 }
    );
  }
}
