"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  toggleEventComplete,
} from "./actions";

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  isCompleted: boolean;
  customerId: number | null;
  leadId: number | null;
  projectId: number | null;
}

const EVENT_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  task: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  meeting: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  holiday: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  reminder: { dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  task: "任务",
  meeting: "会议",
  holiday: "假期",
  reminder: "提醒",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function CalendarClient({
  initialEvents,
}: {
  initialEvents: CalendarEvent[];
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("task");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> =
      [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: formatDateStr(d),
      });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: formatDateStr(d),
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: formatDateStr(d),
      });
    }

    return days;
  }, [year, month]);

  function formatDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isToday(dateStr: string): boolean {
    return dateStr === formatDateStr(new Date());
  }

  function getEventsForDate(dateStr: string): CalendarEvent[] {
    return events.filter((e) => {
      const eventDate = formatDateStr(new Date(e.startTime));
      return eventDate === dateStr;
    });
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function openAddModal(dateStr?: string) {
    const now = new Date();
    setFormTitle("");
    setFormDescription("");
    setFormType("task");
    setFormDate(dateStr || formatDateStr(now));
    setFormTime("09:00");
    setFormEndTime("");
    setFormAllDay(false);
    setShowModal(true);
  }

  function openAddForDate(dateStr: string) {
    setSelectedDate(dateStr);
    setFormTitle("");
    setFormDescription("");
    setFormType("task");
    setFormDate(dateStr);
    setFormTime("09:00");
    setFormEndTime("");
    setFormAllDay(false);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    setIsSubmitting(true);
    const startDateTime = formAllDay
      ? `${formDate}T00:00:00`
      : `${formDate}T${formTime}:00`;
    const endDateTime = formEndTime
      ? `${formDate}T${formEndTime}:00`
      : undefined;

    try {
      await createCalendarEvent({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        eventType: formType,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay: formAllDay,
      });

      // Refresh events from server
      const res = await fetch("/api/calendar-events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }

      setShowModal(false);
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCalendarEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }

  async function handleToggleComplete(id: number, current: boolean) {
    try {
      await toggleEventComplete(id, !current);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, isCompleted: !current } : e
        )
      );
    } catch (err) {
      console.error("Failed to toggle event:", err);
    }
  }

  // Upcoming events (next 30 days, not completed)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return events
      .filter((e) => {
        const d = new Date(e.startTime);
        return d >= now && d <= thirtyDaysLater && !e.isCompleted;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 10);
  }, [events]);

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  return (
    <div>
      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[140px] text-center">
            {year}年 {monthNames[month]}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            今天
          </button>
        </div>
        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          添加日程
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        {Object.entries(EVENT_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
            <span>{EVENT_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-gray-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayEvents = getEventsForDate(day.dateStr);
            const today = isToday(day.dateStr);

            return (
              <div
                key={idx}
                className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !day.isCurrentMonth ? "bg-gray-50/50" : ""
                }`}
                onClick={() => openAddForDate(day.dateStr)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                      today
                        ? "bg-blue-600 text-white font-bold"
                        : day.isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.task;
                    return (
                      <div
                        key={event.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate ${colors.bg} ${colors.text} ${
                          event.isCompleted ? "line-through opacity-60" : ""
                        }`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-gray-500" />
          近期待办事项
        </h3>
        {upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">近期没有待办事项</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => {
              const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.task;
              const eventDate = new Date(event.startTime);
              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${colors.bg}`}
                >
                  <div
                    className={`w-2 h-10 rounded-full ${colors.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-sm ${
                          event.isCompleted
                            ? "line-through text-gray-400"
                            : "text-gray-900"
                        }`}
                      >
                        {event.title}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                      >
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {eventDate.toLocaleDateString("zh-CN", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                      {!event.allDay && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {eventDate.toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {event.allDay && (
                        <span className="text-gray-400">全天</span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(event.id, event.isCompleted);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        event.isCompleted
                          ? "text-green-600 bg-green-50"
                          : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                      }`}
                      title={event.isCompleted ? "标记未完成" : "标记完成"}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(event.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">添加日程</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入日程标题"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                  placeholder="可选描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    类型
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="task">任务</option>
                    <option value="meeting">会议</option>
                    <option value="holiday">假期</option>
                    <option value="reminder">提醒</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  全天
                </label>
              </div>
              {!formAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      开始时间
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      结束时间
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formTitle.trim()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
