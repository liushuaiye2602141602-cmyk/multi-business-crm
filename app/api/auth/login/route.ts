import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Single-user mode: login is not needed
export async function POST() {
  const user = getCurrentUser();
  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
