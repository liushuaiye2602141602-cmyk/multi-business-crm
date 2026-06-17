"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ArrowUpRight, ArrowDownLeft, Bot, User } from "lucide-react";

interface IMMessage {
  id: number;
  direction: string;
  content: string;
  intent: string | null;
  action: string | null;
  errorMsg: string | null;
  createdAt: string;
  platform: { name: string };
  imUser: { platformName: string | null; platformUserId: string };
}

export default function IMMessagesPage() {
  const [messages, setMessages] = useState<IMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchMessages(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/im/messages?page=${p}&pageSize=20`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages(page);
  }, [page]);

  const intentLabels: Record<string, string> = {
    create_lead: "创建线索",
    create_customer: "创建客户",
    create_order: "创建订单",
    add_followup: "添加跟进",
    query_leads: "查询线索",
    query_customers: "查询客户",
    query_orders: "查询订单",
    query_tasks: "查询任务",
    help: "帮助",
    unknown: "未识别",
  };

  const platformLabels: Record<string, string> = {
    feishu: "飞书",
    telegram: "Telegram",
    wechat: "企业微信",
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">IM 消息记录</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有 IM 平台的消息交互记录（共 {total} 条）</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">暂无消息记录</p>
          <p className="text-sm text-gray-400 mt-1">通过飞书等平台发送消息后，记录将显示在这里</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`border rounded-lg p-4 ${
                  msg.direction === "in" ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${msg.direction === "in" ? "bg-gray-100" : "bg-blue-100"}`}>
                    {msg.direction === "in" ? (
                      <User size={16} className="text-gray-600" />
                    ) : (
                      <Bot size={16} className="text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.direction === "in" ? msg.imUser.platformName || msg.imUser.platformUserId : "AI 助手"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {platformLabels[msg.platform.name] || msg.platform.name}
                      </span>
                      {msg.direction === "in" ? (
                        <ArrowDownLeft size={14} className="text-green-500" />
                      ) : (
                        <ArrowUpRight size={14} className="text-blue-500" />
                      )}
                      {msg.intent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {intentLabels[msg.intent] || msg.intent}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(msg.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.errorMsg && (
                      <p className="text-xs text-red-500 mt-1">错误：{msg.errorMsg}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
              <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
