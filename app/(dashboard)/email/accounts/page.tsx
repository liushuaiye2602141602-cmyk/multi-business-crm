"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Mail, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

interface EmailAccountRecord {
  id: number;
  name: string;
  provider: string;
  emailAddress: string;
  smtpHost: string | null;
  smtpPort: number | null;
  imapHost: string | null;
  imapPort: number | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  _count: { messages: number };
}

interface AccountForm {
  name: string;
  provider: string;
  emailAddress: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  imapHost: string;
  imapPort: string;
  username: string;
  password: string;
}

const defaultForm: AccountForm = {
  name: "",
  provider: "CUSTOM",
  emailAddress: "",
  smtpHost: "",
  smtpPort: "465",
  smtpSecure: true,
  imapHost: "",
  imapPort: "993",
  username: "",
  password: "",
};

const providers = [
  { value: "CUSTOM", label: "自定义 (Custom)" },
  { value: "GMAIL", label: "Gmail" },
  { value: "OUTLOOK", label: "Outlook / Microsoft 365" },
  { value: "ALIYUN", label: "阿里云邮箱" },
  { value: "NETEASE", label: "网易邮箱" },
];

const providerDefaults: Record<string, Partial<AccountForm>> = {
  GMAIL: { smtpHost: "smtp.gmail.com", smtpPort: "465", imapHost: "imap.gmail.com", imapPort: "993" },
  OUTLOOK: { smtpHost: "smtp.office365.com", smtpPort: "587", smtpSecure: false, imapHost: "outlook.office365.com", imapPort: "993" },
  ALIYUN: { smtpHost: "smtp.aliyun.com", smtpPort: "465", imapHost: "imap.aliyun.com", imapPort: "993" },
  NETEASE: { smtpHost: "smtp.163.com", smtpPort: "465", imapHost: "imap.163.com", imapPort: "993" },
};

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AccountForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/email/accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  function handleProviderChange(provider: string) {
    const defaults = providerDefaults[provider] || {};
    setForm((prev) => ({
      ...prev,
      provider,
      smtpHost: defaults.smtpHost || "",
      smtpPort: defaults.smtpPort || "465",
      smtpSecure: defaults.smtpSecure !== undefined ? defaults.smtpSecure : true,
      imapHost: defaults.imapHost || "",
      imapPort: defaults.imapPort || "993",
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/email/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
          imapPort: form.imapPort ? Number(form.imapPort) : null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "账号已添加" });
        setShowForm(false);
        setForm(defaultForm);
        await fetchAccounts();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "添加失败" });
      }
    } catch {
      setMessage({ type: "error", text: "添加失败，请检查网络连接" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除此邮箱账号吗？")) return;
    try {
      await fetch(`/api/email/accounts/${id}`, { method: "DELETE" });
      await fetchAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="邮箱账号管理"
        description="管理多个邮箱账号的 SMTP / IMAP 配置"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            添加账号
          </button>
        }
      />

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Account Form */}
      {showForm && (
        <Card>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">添加邮箱账号</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              取消
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                账号名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 公司邮箱"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱服务商
              </label>
              <select
                value={form.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {providers.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.emailAddress}
                onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                placeholder="user@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="通常与邮箱地址相同"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码 / 授权码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="邮箱密码或应用专用密码"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="smtpSecure"
                checked={form.smtpSecure}
                onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="smtpSecure" className="text-sm text-gray-700">
                使用 SSL/TLS
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 主机</label>
              <input
                type="text"
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 端口</label>
              <input
                type="number"
                value={form.smtpPort}
                onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                placeholder="465"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP 主机</label>
              <input
                type="text"
                value={form.imapHost}
                onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
                placeholder="imap.example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP 端口</label>
              <input
                type="number"
                value={form.imapPort}
                onChange={(e) => setForm({ ...form, imapPort: e.target.value })}
                placeholder="993"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.emailAddress || !form.username || !form.password}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {saving ? "保存中..." : "保存账号"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
          </div>
        </Card>
      )}

      {/* Accounts List */}
      <Card padding="none">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : accounts.length === 0 ? (
          <EmptyState
            message="暂无邮箱账号"
            description="点击「添加账号」配置您的第一个邮箱"
            actionLabel="添加账号"
            actionHref="#"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">账号</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">邮箱地址</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">服务商</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">邮件数</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">最后同步</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Mail size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{account.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{account.emailAddress}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      {account.provider}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {account.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle size={14} /> 启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <XCircle size={14} /> 停用
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{account._count.messages}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(account.lastSyncAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
