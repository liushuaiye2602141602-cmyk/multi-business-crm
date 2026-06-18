"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Send, Inbox, RefreshCw, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

interface EmailRecord {
  id: number;
  direction: string;
  subject: string;
  body: string;
  fromAddr: string;
  toAddr: string;
  ccAddr: string | null;
  status: string;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  customer: { id: number; company: string } | null;
  contact: { id: number; name: string } | null;
  lead: { id: number; company: string } | null;
}

export default function EmailPage() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function fetchEmails() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (direction) params.set("direction", direction);
      if (keyword) params.set("keyword", keyword);
      params.set("pageSize", "50");

      const res = await fetch(`/api/email/emails?${params}`);
      const data = await res.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmails();
  }, [direction]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/email/inbox");
      if (res.ok) {
        await fetchEmails();
      } else {
        const data = await res.json();
        alert(data.error || "同步失败");
      }
    } catch {
      alert("同步失败");
    } finally {
      setSyncing(false);
    }
  }

  function handleSearch() {
    fetchEmails();
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (isToday) {
      return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="邮件中心"
        description="收发和管理邮件"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "同步中..." : "同步收件箱"}
            </button>
            <Link
              href="/email/compose"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Send size={16} />
              写邮件
            </Link>
          </div>
        }
      />

      {/* 筛选栏 */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDirection("")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                direction === ""
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setDirection("in")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                direction === "in"
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Inbox size={14} />
              收件
            </button>
            <button
              onClick={() => setDirection("out")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                direction === "out"
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Send size={14} />
              发件
            </button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="搜索主题、发件人、收件人..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              搜索
            </button>
          </div>
        </div>
      </Card>

      {/* 邮件列表 */}
      <Card padding="none">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : emails.length === 0 ? (
          <EmptyState
            message="暂无邮件"
            description="点击「同步收件箱」获取邮件，或点击「写邮件」发送新邮件"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {emails.map((email) => (
              <div
                key={email.id}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                {/* 方向图标 */}
                <div
                  className={`mt-0.5 p-1.5 rounded-full ${
                    email.direction === "in"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {email.direction === "in" ? (
                    <Inbox size={14} />
                  ) : (
                    <Send size={14} />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {email.subject}
                    </h4>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDate(email.sentAt || email.receivedAt || email.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {email.direction === "in"
                      ? `来自: ${email.fromAddr}`
                      : `至: ${email.toAddr}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {email.body.slice(0, 120)}
                  </p>
                  {(email.customer || email.contact || email.lead) && (
                    <div className="flex items-center gap-2 mt-1">
                      {email.customer && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700">
                          <Mail size={10} className="mr-0.5" />
                          {email.customer.company}
                        </span>
                      )}
                      {email.lead && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700">
                          {email.lead.company}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 状态 */}
                <div className="shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      email.status === "sent"
                        ? "bg-green-100 text-green-700"
                        : email.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : email.status === "read"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {email.status === "sent"
                      ? "已发送"
                      : email.status === "failed"
                      ? "失败"
                      : email.status === "read"
                      ? "已读"
                      : email.status === "delivered"
                      ? "已送达"
                      : email.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
