"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";

export default function ComposeEmailPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    to: "",
    cc: "",
    subject: "",
    text: "",
    customerId: "",
    contactId: "",
    leadId: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!form.to || !form.subject) {
      setError("收件人和主题不能为空");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: form.to,
          cc: form.cc || undefined,
          subject: form.subject,
          text: form.text,
          html: form.text,
          customerId: form.customerId ? Number(form.customerId) : undefined,
          contactId: form.contactId ? Number(form.contactId) : undefined,
          leadId: form.leadId ? Number(form.leadId) : undefined,
        }),
      });

      if (res.ok) {
        router.push("/email");
      } else {
        const data = await res.json();
        setError(data.error || "发送失败");
      }
    } catch {
      setError("发送失败，请检查网络连接");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="写邮件"
        description="编写并发送邮件"
        backHref="/email"
      />

      <Card>
        <div className="space-y-4">
          {/* 收件人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              收件人 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              placeholder="recipient@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 抄送 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              抄送
            </label>
            <input
              type="email"
              value={form.cc}
              onChange={(e) => setForm({ ...form, cc: e.target.value })}
              placeholder="cc@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              主题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="邮件主题"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 关联信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关联客户 ID
              </label>
              <input
                type="number"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                placeholder="可选"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关联联系人 ID
              </label>
              <input
                type="number"
                value={form.contactId}
                onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                placeholder="可选"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关联线索 ID
              </label>
              <input
                type="number"
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                placeholder="可选"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 正文 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              正文
            </label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={12}
              placeholder="输入邮件正文..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Send size={16} />
              {sending ? "发送中..." : "发送"}
            </button>
            <Link
              href="/email"
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
