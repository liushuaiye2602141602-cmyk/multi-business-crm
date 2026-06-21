"use server";

import { revalidatePath } from "next/cache";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:goals";

export async function upsertSalesGoal(data: {
  year: number;
  month: number;
  metricType: string;
  targetValue: number;
  currentValue?: number;
  currency?: string;
}) {
  await executionKernel.execute({ intent: "UPSERT_SALES_GOAL", parameters: { data: { ...data, currentValue: data.currentValue ?? 0, currency: data.currency ?? "USD" } } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/goals");
}

export async function updateGoalValue(id: number, currentValue: number) {
  await executionKernel.execute({ intent: "UPDATE_SALES_GOAL", parameters: { salesGoalId: id, data: { currentValue } } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/goals");
}
