"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TaskType, TaskStatus, TaskPriority } from "@/lib/generated/prisma/enums";

export async function createTask(formData: FormData) {
  const data = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    type: (formData.get("type") as TaskType) || "FOLLOW_UP",
    status: (formData.get("status") as TaskStatus) || "PENDING",
    priority: (formData.get("priority") as TaskPriority) || "MEDIUM",
    dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };

  if (!data.title) throw new Error("任务标题不能为空");
  if (!data.dueDate) throw new Error("截止日期不能为空");

  const task = await prisma.task.create({ data });
  revalidatePath("/tasks");
  redirect(`/tasks`);
}

export async function updateTask(id: number, formData: FormData) {
  const data = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    type: formData.get("type") as TaskType,
    status: formData.get("status") as TaskStatus,
    priority: formData.get("priority") as TaskPriority,
    dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
    completedAt: formData.get("status") === "COMPLETED" ? new Date() : null,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };

  if (!data.title) throw new Error("任务标题不能为空");

  await prisma.task.update({ where: { id }, data });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function deleteTask(id: number) {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
}

export async function markTaskComplete(id: number) {
  await prisma.task.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  revalidatePath("/tasks");
}

export async function getOverdueTasks() {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    orderBy: { dueDate: "asc" },
    include: {
      lead: { select: { company: true } },
      customer: { select: { company: true } },
    },
  });
  return tasks;
}
