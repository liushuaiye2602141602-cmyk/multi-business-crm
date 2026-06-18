"use client";

import { Mail, MessageSquare, Phone, StickyNote, FileText, ShoppingCart, CheckSquare } from "lucide-react";

interface TimelineItem {
  type: string;
  date: string;
  data: any;
}

const channelIcons: Record<string, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  webchat: MessageSquare,
  manual: StickyNote,
};

const typeLabels: Record<string, string> = {
  message: "消息",
  followup: "跟进",
  task: "任务",
  quote: "报价",
  order: "订单",
};

const typeColors: Record<string, string> = {
  message: "bg-blue-100 text-blue-700",
  followup: "bg-green-100 text-green-700",
  task: "bg-yellow-100 text-yellow-700",
  quote: "bg-purple-100 text-purple-700",
  order: "bg-red-100 text-red-700",
};

export default function CustomerTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">暂无活动记录</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const Icon = item.type === "message" && item.data.channel
          ? channelIcons[item.data.channel] || MessageSquare
          : item.type === "task" ? CheckSquare
          : item.type === "quote" ? FileText
          : item.type === "order" ? ShoppingCart
          : MessageSquare;

        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${typeColors[item.type] || "bg-gray-100"}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-gray-900">
                  {typeLabels[item.type] || item.type}
                </span>
                {item.data.channel && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {item.data.channel}
                  </span>
                )}
                {item.data.intent && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {item.data.intent}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 ml-auto">
                  {new Date(item.date).toLocaleString("zh-CN")}
                </span>
              </div>
              <p className="text-sm text-gray-700 truncate">
                {item.data.content || item.data.title || item.data.quoteNo || item.data.orderNo || ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
