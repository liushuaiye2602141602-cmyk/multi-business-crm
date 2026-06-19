import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const authUser = getCurrentUser();
  return NextResponse.json({
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    tenantId: authUser.tenantId,
    tenant: null,
  });
}
