"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCalendarEvent(data: {
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  customerId?: number;
  leadId?: number;
  projectId?: number;
}) {
  await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description,
      eventType: data.eventType,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      allDay: data.allDay ?? false,
      customerId: data.customerId,
      leadId: data.leadId,
      projectId: data.projectId,
    },
  });
  revalidatePath("/calendar");
}

export async function updateCalendarEvent(
  id: number,
  data: {
    title?: string;
    description?: string;
    eventType?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    isCompleted?: boolean;
  }
) {
  await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    },
  });
  revalidatePath("/calendar");
}

export async function deleteCalendarEvent(id: number) {
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
}

export async function toggleEventComplete(id: number, isCompleted: boolean) {
  await prisma.calendarEvent.update({
    where: { id },
    data: { isCompleted },
  });
  revalidatePath("/calendar");
}
