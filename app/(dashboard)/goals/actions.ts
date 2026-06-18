"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function upsertSalesGoal(data: {
  year: number;
  month: number;
  metricType: string;
  targetValue: number;
  currentValue?: number;
  currency?: string;
}) {
  await prisma.salesGoal.upsert({
    where: {
      year_month_metricType: {
        year: data.year,
        month: data.month,
        metricType: data.metricType,
      },
    },
    update: {
      targetValue: data.targetValue,
      currentValue: data.currentValue ?? 0,
      currency: (data.currency as "USD" | "EUR" | "CNY") ?? "USD",
    },
    create: {
      year: data.year,
      month: data.month,
      metricType: data.metricType,
      targetValue: data.targetValue,
      currentValue: data.currentValue ?? 0,
      currency: (data.currency as "USD" | "EUR" | "CNY") ?? "USD",
    },
  });
  revalidatePath("/goals");
}

export async function updateGoalValue(id: number, currentValue: number) {
  await prisma.salesGoal.update({
    where: { id },
    data: { currentValue },
  });
  revalidatePath("/goals");
}
