import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { tenant: { select: { id: true, name: true, plan: true } } },
  });

  return NextResponse.json(user);
}
