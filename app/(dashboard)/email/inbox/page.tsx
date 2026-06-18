"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Inbox, RefreshCw, Mail, Send, Star } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

interface EmailAccountOption {
  id: number;
  name: string;
  emailAddress: string;
}

interface ThreadRecord {
  id: number;
  subject: string;
  lastMessageAt: string | null;
  messageCount: number;
  messages: Array<{
    id: number;
    fromAddr: string;
    toAddr: string;
    body: string;
    direction: string;
    isRead: boolean;
    isStarred: boolean;
    receivedAt: string | null;
    sentAt: string | null;
    createdAt: string;
  }>;
}

export default function EmailInboxPage() {
  const [accounts, setAccounts] = useState<EmailAccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/email/accounts");
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      }
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchThreads();
    }
  }, [selectedAccountId]);

  async function fetchThreads() {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/email/threads?accountId=${selectedAccountId}&limit=50`);
      const data = await res.json();
      setThreads(data);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedAccountId) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      if (res.ok) {
        const result = await res.json();
        alert(`同步完成: 共 ${result.total} 封, 新增 ${result.new} 封`);
        await fetchThreads();
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

  function getPreview(thread: ThreadRecord) {
    const lastMsg = thread.messages[0];
    if (!lastMsg) return "";
    return lastMsg.body.slice(0, 120);
  }

  function getFrom(thread: ThreadRecord) {
    const lastMsg = thread.messages[0];
    if (!lastMsg) return "";
    return lastMsg.direction === "in" ? lastMsg.fromAddr : `To: ${lastMsg.toAddr}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="收件箱"
        description="按会话线程查看邮件"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing || !selectedAccountId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "同步中..." : "同步收件箱"}
            </button>
          </div>
        }
      />

      {/* Account Selector */}
      <Card>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">选择账号:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[280px]"
          >
            {accounts.length === 0 && <option value={0}>暂无账号，请先添加</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.emailAddress})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Thread List */}
      <Card padding="none">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : threads.length === 0 ? (
          <EmptyState
            message="暂无邮件会话"
            description="点击「同步收件箱」获取邮件"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/email/thread/${thread.id}`}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors block"
              >
                <div className="mt-0.5 p-1.5 rounded-full bg-blue-100 text-blue-600">
                  <Inbox size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {thread.subject}
                    </h4>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDate(thread.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{getFrom(thread)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{getPreview(thread)}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                    {thread.messageCount} 封
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
