import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const events = await prisma.calendarEvent.findMany({
    where: {
      startTime: {
        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999),
      },
    },
    orderBy: { startTime: "asc" },
  });

  const serializedEvents = events.map((e) => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="日程管理"
        description="管理日历事件、会议安排和重要提醒"
      />
      <CalendarClient initialEvents={serializedEvents} />
    </div>
  );
}
