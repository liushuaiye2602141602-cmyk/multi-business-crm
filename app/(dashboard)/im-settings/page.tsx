"use client";

import { useState, useEffect } from "react";
import { Bot, Save, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface IMPlatform {
  id: number;
  name: string;
  appId: string | null;
  appSecret: string | null;
  encryptKey: string | null;
  verifyToken: string | null;
  botToken: string | null;
  isActive: boolean;
  _count?: { imUsers: number; imMessages: number };
}

export default function IMSettingsPage() {
  const [platforms, setPlatforms] = useState<IMPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<IMPlatform | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "feishu",
    appId: "",
    appSecret: "",
    encryptKey: "",
    verifyToken: "",
    botToken: "",
  });
  const [saving, setSaving] = useState(false);

  async function fetchPlatforms() {
    try {
      const res = await fetch("/api/im/platforms");
      const data = await res.json();
      setPlatforms(data);
    } catch (error) {
      console.error("Failed to fetch platforms:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlatforms();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/im/platforms/${editing.id}` : "/api/im/platforms";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchPlatforms();
        setShowAdd(false);
        setEditing(null);
        setForm({ name: "feishu", appId: "", appSecret: "", encryptKey: "", verifyToken: "", botToken: "" });
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(platform: IMPlatform) {
    await fetch(`/api/im/platforms/${platform.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !platform.isActive }),
    });
    await fetchPlatforms();
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除该平台配置？")) return;
    await fetch(`/api/im/platforms/${id}`, { method: "DELETE" });
    await fetchPlatforms();
  }

  function startEdit(platform: IMPlatform) {
    setEditing(platform);
    setForm({
      name: platform.name,
      appId: platform.appId || "",
      appSecret: platform.appSecret || "",
      encryptKey: platform.encryptKey || "",
      verifyToken: platform.verifyToken || "",
      botToken: platform.botToken || "",
    });
    setShowAdd(true);
  }

  const platformLabels: Record<string, string> = {
    feishu: "飞书",
    telegram: "Telegram",
    wechat: "企业微信",
  };

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IM 设置</h1>
          <p className="text-sm text-gray-500 mt-1">配置 IM 平台接入，支持通过飞书等平台与 AI 助手对话</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name: "feishu", appId: "", appSecret: "", encryptKey: "", verifyToken: "", botToken: "" });
            setShowAdd(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> 添加平台
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {platforms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Bot size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂未配置 IM 平台</p>
            <p className="text-sm text-gray-400 mt-1">点击「添加平台」开始配置</p>
          </div>
        ) : (
          platforms.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot size={24} className={p.isActive ? "text-blue-600" : "text-gray-400"} />
                  <div>
                    <h3 className="font-medium text-gray-900">{platformLabels[p.name] || p.name}</h3>
                    <p className="text-xs text-gray-500">
                      App ID: {p.appId || "未配置"} · 用户: {p._count?.imUsers || 0} · 消息: {p._count?.imMessages || 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="p-1 rounded hover:bg-gray-100"
                    title={p.isActive ? "点击禁用" : "点击启用"}
                  >
                    {p.isActive ? (
                      <ToggleRight size={28} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-400" />
                    )}
                  </button>
                  <button onClick={() => startEdit(p)} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? "编辑平台" : "添加平台"}</h2>
          <div className="space-y-4">
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
                <select
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="feishu">飞书</option>
                  <option value="telegram">Telegram</option>
                  <option value="wechat">企业微信</option>
                </select>
              </div>
            )}
            {(form.name === "feishu" || form.name === "wechat") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                  <input type="text" value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="cli_xxxxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
                  <input type="password" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Encrypt Key</label>
                  <input type="text" value={form.encryptKey} onChange={(e) => setForm({ ...form, encryptKey: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="可选，用于签名验证" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
                  <input type="text" value={form.verifyToken} onChange={(e) => setForm({ ...form, verifyToken: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="可选" />
                </div>
              </>
            )}
            {form.name === "telegram" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                <input type="text" value={form.botToken} onChange={(e) => setForm({ ...form, botToken: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="123456:ABC-xxx" />
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={16} /> {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={() => { setShowAdd(false); setEditing(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              取消
            </button>
          </div>
          {form.name === "feishu" && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">飞书配置说明：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>在飞书开放平台创建应用，启用机器人能力</li>
                <li>配置事件订阅 URL：<code className="bg-blue-100 px-1 rounded">https://your-domain.com/api/im/feishu/webhook</code></li>
                <li>订阅 <code className="bg-blue-100 px-1 rounded">im.message.receive_v1</code> 事件</li>
                <li>将 App ID 和 App Secret 填入上方</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
