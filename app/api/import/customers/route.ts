import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const defaultBusinessLineId = formData.get("businessLineId") as string;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV 文件为空或格式错误" }, { status: 400 });
    }

    const headers = parseCSVLine(lines[0]);
    const dataLines = lines.slice(1);

    const businessLines = await prisma.businessLine.findMany();
    const blMap = new Map(businessLines.map((bl) => [bl.name.toLowerCase(), bl.id]));
    const blCodeMap = new Map(businessLines.filter((bl) => bl.code).map((bl) => [bl.code!.toLowerCase(), bl.id]));

    let success = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = parseCSVLine(dataLines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || "";
        });

        const companyName = row.companyName || row.company || "";
        const email = row.email || "";

        if (!companyName) {
          failed++;
          errors.push(`第 ${i + 2} 行: 公司名为空`);
          continue;
        }

        // 检查重复
        const existing = await prisma.customer.findFirst({
          where: {
            OR: [
              { company: companyName, email: email || undefined },
              ...(email ? [{ email }] : []),
            ],
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // 解析业务线
        let businessLineId = defaultBusinessLineId ? parseInt(defaultBusinessLineId) : null;
        const blName = row.businessLine || row.businessLineName || "";
        const blCode = row.businessLineCode || "";
        if (blName && blMap.has(blName.toLowerCase())) {
          businessLineId = blMap.get(blName.toLowerCase())!;
        } else if (blCode && blCodeMap.has(blCode.toLowerCase())) {
          businessLineId = blCodeMap.get(blCode.toLowerCase())!;
        }

        if (!businessLineId) {
          failed++;
          errors.push(`第 ${i + 2} 行: 业务线未找到`);
          continue;
        }

        await prisma.customer.create({
          data: {
            company: companyName,
            contactName: row.contactName || row.name || companyName,
            country: row.country || null,
            email: email || null,
            whatsapp: row.whatsapp || null,
            website: row.website || null,
            industry: row.industry || null,
            customerType: (row.customerType as any) || "UNKNOWN",
            customerStatus: (row.customerStatus || row.status as any) || "POTENTIAL",
            leadGrade: (row.leadGrade || row.leadScore as any) || "C",
            source: (row.source as any) || null,
            sourceWebsite: row.sourceWebsite || null,
            remark: row.remark || row.notes || null,
            businessLineId,
          },
        });

        success++;
      } catch (error) {
        failed++;
        errors.push(`第 ${i + 2} 行: ${error instanceof Error ? error.message : "未知错误"}`);
      }
    }

    await createActivityLog({
      action: "导入",
      entityType: "客户",
      description: `导入客户: 成功 ${success} 条, 跳过 ${skipped} 条, 失败 ${failed} 条`,
    });

    return NextResponse.json({
      success,
      skipped,
      failed,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    return NextResponse.json({ error: "导入失败: " + (error instanceof Error ? error.message : "未知错误") }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
