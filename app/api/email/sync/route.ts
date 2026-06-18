import { NextRequest, NextResponse } from "next/server";
import { fetchEmails } from "@/lib/email/service";

export async function POST(request: NextRequest) {
  const { accountId } = await request.json();
  const result = await fetchEmails(accountId);
  return NextResponse.json(result);
}
