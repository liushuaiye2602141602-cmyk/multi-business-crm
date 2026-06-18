import { NextRequest, NextResponse } from "next/server";
import { extractCustomerFromImage } from "@/lib/ai/vision";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "请上传图片" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const extracted = await extractCustomerFromImage(base64);

    // 如果用户确认，创建线索
    const autoCreate = formData.get("autoCreate") === "true";
    let createdLead = null;

    if (autoCreate && extracted.company !== "未知") {
      const businessLine = await prisma.businessLine.findFirst({
        orderBy: { id: "asc" },
      });
      if (businessLine) {
        createdLead = await prisma.lead.create({
          data: {
            tenantId: 1,
            company: extracted.company,
            contactName: extracted.contactName,
            country: extracted.country || null,
            email: extracted.email || null,
            phone: extracted.phone || null,
            whatsapp: extracted.whatsapp || null,
            requirement: extracted.requirement || null,
            interestProducts: extracted.interestProducts || null,
            remark: extracted.remark || null,
            source: "OTHER",
            status: "NEW",
            temperature: "WARM",
            grade: "C",
            businessLineId: businessLine.id,
          },
        });

        await createActivityLog({
          action: "图片识别创建",
          entityType: "线索",
          entityId: createdLead.id,
          entityName: createdLead.company,
          description: `通过图片识别创建线索: ${createdLead.company}`,
        });
      }
    }

    return NextResponse.json({
      extracted,
      created: !!createdLead,
      leadId: createdLead?.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片分析失败" },
      { status: 500 }
    );
  }
}
