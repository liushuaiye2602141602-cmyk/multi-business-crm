"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, List } from "lucide-react";

interface Event {
  id: number;
  title: string;
  start: string;
  type: string;
}

export default function ScheduleWidget({ events }: { events: Event[] }) {
  const [view, setView] = useState<"week" | "month" | "list">("list");
  const [currentDate] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter upcoming events (next 14 days)
  const upcomingEvents = events
    .filter((e) => {
      const d = new Date(e.start);
      const diff = d.getTime() - today.getTime();
      return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const typeColors: Record<string, string> = {
    meeting: "bg-blue-500",
    follow_up: "bg-orange-500",
    call: "bg-green-500",
    deadline: "bg-red-500",
    holiday: "bg-purple-500",
    default: "bg-gray-400",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={16} className="text-blue-500" />
          日程
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["week", "month", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                view === v ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "week" ? "周" : v === "month" ? "月" : "列表"}
            </button>
          ))}
        </div>
      </div>

      {view === "list" && (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">暂无日程安排</p>
          ) : (
            upcomingEvents.map((event) => {
              const d = new Date(event.start);
              const isToday = d.toDateString() === today.toDateString();
              const dayStr = d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
              const dotColor = typeColors[event.type] || typeColors.default;

              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                    isToday ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <span className={`flex-1 truncate ${isToday ? "font-medium text-blue-900" : "text-gray-700"}`}>
                    {event.title}
                  </span>
                  <span className={`text-[10px] flex-shrink-0 ${isToday ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    {isToday ? "今天" : dayStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {view === "week" && (
        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
          {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => (
            <div key={d} className="text-gray-400 font-medium py-1">{d}</div>
          ))}
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dayEvents = events.filter((e) => new Date(e.start).toDateString() === d.toDateString());
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`p-1.5 rounded-lg min-h-[40px] ${
                  isToday ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                }`}
              >
                <div className={`font-medium ${isToday ? "text-blue-600" : "text-gray-600"}`}>
                  {d.getDate()}
                </div>
                {dayEvents.slice(0, 2).map((e) => (
                  <div key={e.id} className={`w-full h-1 rounded mt-0.5 ${typeColors[e.type] || typeColors.default}`} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
            <div key={d} className="text-gray-400 font-medium py-1">{d}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOffset = (firstDay.getDay() + 6) % 7;
            const d = new Date(today.getFullYear(), today.getMonth(), i - startOffset + 1);
            const isCurrentMonth = d.getMonth() === today.getMonth();
            const isToday = d.toDateString() === today.toDateString();
            const dayEvents = events.filter((e) => new Date(e.start).toDateString() === d.toDateString());
            return (
              <div
                key={i}
                className={`p-1 rounded min-h-[28px] ${
                  isToday ? "bg-blue-50 border border-blue-200" :
                  isCurrentMonth ? "bg-gray-50" : "bg-gray-25 opacity-40"
                }`}
              >
                <div className={`font-medium ${isToday ? "text-blue-600" : isCurrentMonth ? "text-gray-600" : "text-gray-300"}`}>
                  {d.getDate()}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 justify-center mt-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className={`w-1 h-1 rounded-full ${typeColors[e.type] || typeColors.default}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
