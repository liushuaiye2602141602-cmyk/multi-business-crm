"use server";

import { revalidatePath } from "next/cache";
import { executionKernel } from "@/lib/kernel/execution-kernel";

const SESSION = "dashboard:calendar";

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
  await executionKernel.execute({
    intent: "CREATE_CALENDAR_EVENT",
    parameters: {
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
    },
  }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/calendar");
}

export async function updateCalendarEvent(id: number, data: {
  title?: string;
  description?: string;
  eventType?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  isCompleted?: boolean;
}) {
  await executionKernel.execute({
    intent: "UPDATE_CALENDAR_EVENT",
    parameters: {
      calendarEventId: id,
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    },
  }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/calendar");
}

export async function deleteCalendarEvent(id: number) {
  await executionKernel.execute({ intent: "DELETE_CALENDAR_EVENT", parameters: { calendarEventId: id } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/calendar");
}

export async function toggleEventComplete(id: number, isCompleted: boolean) {
  await executionKernel.execute({ intent: "UPDATE_CALENDAR_EVENT", parameters: { calendarEventId: id, data: { isCompleted } } }, { sessionId: SESSION, actorId: "web-action" });
  revalidatePath("/calendar");
}
