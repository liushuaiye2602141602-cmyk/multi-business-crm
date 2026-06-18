"use client";

import { useState, useEffect } from "react";
import { Save, Mail, Server } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";

interface EmailConfigForm {
  id: string;
  name: string;
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  imapHost: string;
  imapPort: string;
}

const defaultForm: EmailConfigForm = {
  id: "",
  name: "default",
  host: "",
  port: "465",
  secure: true,
  username: "",
  password: "",
  fromName: "",
  fromEmail: "",
  imapHost: "",
  imapPort: "993",
};

export default function EmailSettingsPage() {
  const [form, setForm] = useState<EmailConfigForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/email/config");
        const data = await res.json();
        if (data) {
          setForm({
            id: String(data.id),
            name: data.name || "default",
            host: data.host || "",
            port: String(data.port || "465"),
            secure: data.secure ?? true,
            username: data.username || "",
            password: "",
            fromName: data.fromName || "",
            fromEmail: data.fromEmail || "",
            imapHost: data.imapHost || "",
            imapPort: String(data.imapPort || "993"),
          });
        }
      } catch (error) {
        console.error("Failed to load email config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/email/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          port: Number(form.port),
          imapPort: form.imapPort ? Number(form.imapPort) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, id: String(data.id), password: "" }));
        setMessage({ type: "success", text: "配置已保存" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "保存失败" });
      }
    } catch {
      setMessage({ type: "error", text: "保存失败，请检查网络连接" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="邮件设置"
        description="配置 SMTP 发送和 IMAP 接收参数"
        backHref="/email"
      />

      {/* SMTP 发送配置 */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <Server size={18} className="text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">SMTP 发送配置</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              配置名称
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMTP 主机 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="smtp.example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              端口 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              placeholder="465"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="secure"
              checked={form.secure}
              onChange={(e) => setForm({ ...form, secure: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="secure" className="text-sm text-gray-700">
              使用 SSL/TLS
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="user@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={form.id ? "留空表示不修改" : ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              发件人名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.fromName}
              onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              placeholder="Your Company"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              发件人邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.fromEmail}
              onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
              placeholder="no-reply@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {/* IMAP 接收配置 */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <Mail size={18} className="text-green-600" />
          <h3 className="text-base font-semibold text-gray-900">IMAP 接收配置</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMAP 主机
            </label>
            <input
              type="text"
              value={form.imapHost}
              onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
              placeholder="imap.example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMAP 端口
            </label>
            <input
              type="number"
              value={form.imapPort}
              onChange={(e) => setForm({ ...form, imapPort: e.target.value })}
              placeholder="993"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          IMAP 配置用于从收件箱同步邮件。留空则仅支持发送功能。
        </p>
      </Card>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <Save size={16} />
          {saving ? "保存中..." : "保存配置"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>

      {/* 提示信息 */}
      <Card>
        <h4 className="text-sm font-medium text-gray-700 mb-2">常见配置参考</h4>
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Gmail:</strong> smtp.gmail.com:465 (SSL) / imap.gmail.com:993</p>
          <p><strong>Outlook:</strong> smtp.office365.com:587 (STARTTLS) / outlook.office365.com:993</p>
          <p><strong>QQ 邮箱:</strong> smtp.qq.com:465 (SSL) / imap.qq.com:993</p>
          <p><strong>163 邮箱:</strong> smtp.163.com:465 (SSL) / imap.163.com:993</p>
          <p className="mt-2 text-gray-400">注意: Gmail 需要使用应用专用密码，QQ/163 需要开启 SMTP 并获取授权码。</p>
        </div>
      </Card>
    </div>
  );
}
