"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TaskType, TaskStatus, TaskPriority } from "@/lib/generated/prisma/enums";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:tasks";

function taskData(formData: FormData) {
  return {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    type: (formData.get("type") as TaskType) || "FOLLOW_UP",
    status: (formData.get("status") as TaskStatus) || "PENDING",
    priority: (formData.get("priority") as TaskPriority) || "MEDIUM",
    dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
    completedAt: formData.get("status") === "COMPLETED" ? new Date() : null,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };
}

export async function createTask(formData: FormData) {
  const data = taskData(formData);
  if (!data.title) throw new Error("任务标题不能为空");
  if (!data.dueDate) throw new Error("截止日期不能为空");
  const result = await executionKernel.execute({ intent: "CREATE_TASK", parameters: { data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTask(id: number, formData: FormData) {
  const data = taskData(formData);
  if (!data.title) throw new Error("任务标题不能为空");
  const result = await executionKernel.execute({ intent: "UPDATE_TASK", parameters: { taskId: id, data } }, { sessionId: SESSION, actorId: "web-action" });
  if (!result.success) throw new Error(result.message);
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function deleteTask(id: number) {
  await executionKernel.execute({ intent: "DELETE_TASK", parameters: { taskId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/tasks");
}

export async function markTaskComplete(id: number) {
  await executionKernel.execute({ intent: "COMPLETE_TASK", parameters: { taskId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/tasks");
}

export async function getOverdueTasks() {
  const now = new Date();
  return prisma.task.findMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    orderBy: { dueDate: "asc" },
    include: {
      lead: { select: { company: true } },
      customer: { select: { company: true } },
    },
  });
}
