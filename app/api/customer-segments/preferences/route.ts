import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/customer-segments/preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ? parseInt(searchParams.get("tenantId")!) : null;
    const userId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!) : null;

    const where: Record<string, any> = {};
    if (tenantId) where.tenantId = tenantId;
    if (userId) where.userId = userId;

    const preferences = await prisma.presetSegmentPreference.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Failed to fetch segment preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PUT /api/customer-segments/preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, preferences } = body as {
      tenantId?: number;
      userId?: number;
      preferences: Array<{
        segmentKey: string;
        isVisible?: boolean;
        sortOrder?: number;
        showOnDashboard?: boolean;
        settings?: Record<string, any>;
        displayName?: string;
      }>;
    };

    const results = [];
    for (const pref of preferences) {
      const result = await prisma.presetSegmentPreference.upsert({
        where: {
          tenantId_userId_segmentKey: {
            tenantId: tenantId != null ? tenantId : undefined as unknown as number,
            userId: userId != null ? userId : undefined as unknown as number,
            segmentKey: pref.segmentKey,
          },
        },
        update: {
          ...(pref.isVisible !== undefined && { isVisible: pref.isVisible }),
          ...(pref.sortOrder !== undefined && { sortOrder: pref.sortOrder }),
          ...(pref.showOnDashboard !== undefined && { showOnDashboard: pref.showOnDashboard }),
          ...(pref.settings !== undefined && { settings: pref.settings }),
          ...(pref.displayName !== undefined && { displayName: pref.displayName }),
        },
        create: {
          tenantId: tenantId ?? null,
          userId: userId ?? null,
          segmentKey: pref.segmentKey,
          isVisible: pref.isVisible ?? true,
          sortOrder: pref.sortOrder ?? 0,
          showOnDashboard: pref.showOnDashboard ?? false,
          settings: pref.settings ?? {},
          displayName: pref.displayName ?? null,
        },
      });
      results.push(result);
    }

    return NextResponse.json({ preferences: results });
  } catch (error) {
    console.error("Failed to update segment preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
