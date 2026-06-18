import { NextRequest, NextResponse } from "next/server";
import { getThreads } from "@/lib/email/service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = parseInt(searchParams.get("accountId") || "0");
  const limit = parseInt(searchParams.get("limit") || "20");

  const threads = await getThreads(accountId, limit);
  return NextResponse.json(threads);
}
