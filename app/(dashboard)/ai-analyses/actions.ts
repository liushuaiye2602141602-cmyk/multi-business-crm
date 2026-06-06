"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createActivityLog } from "@/lib/activity-log";

export async function deleteAIAnalysis(id: number) {
  const analysis = await prisma.aIAnalysis.findUnique({ where: { id } });
  if (!analysis) throw new Error("分析记录不存在");

  await prisma.aIAnalysis.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "AI分析",
    entityId: id,
    entityName: analysis.title || undefined,
    description: `删除 AI 分析记录: ${analysis.title || "未命名"}`,
  });

  revalidatePath("/ai-analyses");
}
