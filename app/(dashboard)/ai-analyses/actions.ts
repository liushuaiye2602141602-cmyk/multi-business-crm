"use server";

import { revalidatePath } from "next/cache";
import { executionKernel } from "@/lib/kernel/execution-kernel";

export async function deleteAIAnalysis(id: number) {
  await executionKernel.execute({ intent: "DELETE_AI_ANALYSIS", parameters: { aIAnalysisId: id } }, { sessionId: "dashboard:ai-analyses", actorId: "web-action" });
  revalidatePath("/ai-analyses");
}
