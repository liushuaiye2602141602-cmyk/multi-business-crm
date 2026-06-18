"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Inbox, User, Building2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";

interface ThreadMessage {
  id: number;
  direction: string;
  fromAddr: string;
  toAddr: string;
  ccAddr: string | null;
  subject: string;
  body: string;
  bodyHtml: string | null;
  status: string;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  lead: { id: number; company: string } | null;
  customer: { id: number; company: string } | null;
  contact: { id: number; name: string; email: string } | null;
}

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params?.id as string;
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (threadId) {
      fetchMessages();
    }
  }, [threadId]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/email/threads/${threadId}`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to fetch thread messages:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const subject = messages[0]?.subject || "无主题";

  return (
    <div className="space-y-6">
      <PageHeader
        title={subject}
        description={`共 ${messages.length} 封邮件`}
        backHref="/email/inbox"
      />

      {loading ? (
        <div className="p-8 text-center text-gray-500">加载中...</div>
      ) : messages.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-gray-500">未找到邮件</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card key={msg.id}>
              {/* Message Header */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      msg.direction === "in"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {msg.direction === "in" ? <Inbox size={16} /> : <Send size={16} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {msg.direction === "in" ? msg.fromAddr : msg.toAddr}
                      </span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          msg.direction === "in"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {msg.direction === "in" ? "收" : "发"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {msg.direction === "in"
                        ? `发件人: ${msg.fromAddr}`
                        : `收件人: ${msg.toAddr}`}
                      {msg.ccAddr && <span className="ml-2">CC: {msg.ccAddr}</span>}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDateTime(msg.sentAt || msg.receivedAt || msg.createdAt)}
                </span>
              </div>

              {/* Message Body */}
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {msg.body}
              </div>

              {/* CRM Bindings */}
              {(msg.lead || msg.customer || msg.contact) && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                  {msg.contact && (
                    <Link
                      href={`/contacts`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs hover:bg-purple-100 transition-colors"
                    >
                      <User size={12} />
                      {msg.contact.name}
                    </Link>
                  )}
                  {msg.customer && (
                    <Link
                      href={`/customers`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition-colors"
                    >
                      <Building2 size={12} />
                      {msg.customer.company}
                    </Link>
                  )}
                  {msg.lead && (
                    <Link
                      href={`/leads`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs hover:bg-amber-100 transition-colors"
                    >
                      {msg.lead.company}
                    </Link>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
