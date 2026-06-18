"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Save,
  Plus,
  Trash2,
  Edit3,
  X,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";

/* ========== Types ========== */

interface ControlSettings {
  id?: number;
  aiEnabled: boolean;
  salesAgentEnabled: boolean;
  emailAgentEnabled: boolean;
  whatsappAgentEnabled: boolean;
  followUpAgentEnabled: boolean;
  prospectingEnabled: boolean;
  executionMode: string;
  workHoursStart: number;
  workHoursEnd: number;
  maxContactsPerDay: number;
}

interface PolicyRule {
  id: number;
  name: string;
  type: string;
  action: string;
  condition: string;
  value: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ExecutionLog {
  id: number;
  actionType: string;
  entityType: string | null;
  entityId: number | null;
  allowed: boolean;
  reason: string | null;
  mode: string | null;
  createdAt: string;
}

interface LogResponse {
  logs: ExecutionLog[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTION_TYPES = [
  { value: "email_send", label: "邮件发送" },
  { value: "whatsapp_send", label: "WhatsApp 发送" },
  { value: "task_create", label: "任务创建" },
  { value: "lead_analyze", label: "线索分析" },
  { value: "prospecting", label: "主动获客" },
];

const RULE_ACTIONS = [
  { value: "block_send", label: "拦截发送" },
  { value: "limit_rate", label: "频率限制" },
  { value: "block_blacklist", label: "黑名单拦截" },
  { value: "block_discount", label: "折扣拦截" },
];

const EXECUTION_MODES = [
  { value: "MANUAL", label: "手动模式", desc: "AI 提出建议，人工确认后执行" },
  { value: "APPROVAL", label: "审批模式", desc: "AI 自动执行，但高风险操作需审批" },
  { value: "AUTO", label: "全自动", desc: "AI 全自动执行所有操作" },
];

export default function AIControlPanelPage() {
  /* ---- Settings state ---- */
  const [settings, setSettings] = useState<ControlSettings>({
    aiEnabled: true,
    salesAgentEnabled: true,
    emailAgentEnabled: true,
    whatsappAgentEnabled: false,
    followUpAgentEnabled: true,
    prospectingEnabled: false,
    executionMode: "MANUAL",
    workHoursStart: 9,
    workHoursEnd: 18,
    maxContactsPerDay: 5,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  /* ---- Rules state ---- */
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    type: "SOFT",
    action: "block_send",
    condition: "{}",
    value: "",
    isActive: true,
  });

  /* ---- Logs state ---- */
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logFilterAction, setLogFilterAction] = useState("");
  const [logFilterAllowed, setLogFilterAllowed] = useState("");

  /* ========== Load Data ========== */

  useEffect(() => {
    loadSettings();
    loadRules();
    loadLogs();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [logsPage, logFilterAction, logFilterAllowed]);

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/ai-control/settings");
      const data = await res.json();
      if (data.id) {
        setSettings({
          aiEnabled: data.aiEnabled,
          salesAgentEnabled: data.salesAgentEnabled,
          emailAgentEnabled: data.emailAgentEnabled,
          whatsappAgentEnabled: data.whatsappAgentEnabled,
          followUpAgentEnabled: data.followUpAgentEnabled,
          prospectingEnabled: data.prospectingEnabled,
          executionMode: data.executionMode,
          workHoursStart: data.workHoursStart,
          workHoursEnd: data.workHoursEnd,
          maxContactsPerDay: data.maxContactsPerDay,
        });
      }
    } catch {
      // ignore
    } finally {
      setSettingsLoading(false);
    }
  }

  async function loadRules() {
    setRulesLoading(true);
    try {
      const res = await fetch("/api/ai-control/rules");
      const data = await res.json();
      setRules(data);
    } catch {
      // ignore
    } finally {
      setRulesLoading(false);
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(logsPage));
      params.set("pageSize", "20");
      if (logFilterAction) params.set("actionType", logFilterAction);
      if (logFilterAllowed) params.set("allowed", logFilterAllowed);
      const res = await fetch(`/api/ai-control/logs?${params}`);
      const data: LogResponse = await res.json();
      setLogs(data.logs);
      setLogsTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }

  /* ========== Settings Handlers ========== */

  function toggleSetting(key: keyof ControlSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateNumberField(key: keyof ControlSettings, value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setSettings((prev) => ({ ...prev, [key]: num }));
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/ai-control/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveMsg("设置已保存");
      } else {
        setSaveMsg("保存失败");
      }
    } catch {
      setSaveMsg("保存失败，请检查网络");
    } finally {
      setSaving(false);
    }
  }

  /* ========== Rule Handlers ========== */

  function openAddRule() {
    setEditingRule(null);
    setRuleForm({ name: "", type: "SOFT", action: "block_send", condition: "{}", value: "", isActive: true });
    setShowRuleForm(true);
  }

  function openEditRule(rule: PolicyRule) {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      type: rule.type,
      action: rule.action,
      condition: rule.condition,
      value: rule.value || "",
      isActive: rule.isActive,
    });
    setShowRuleForm(true);
  }

  async function handleSaveRule() {
    const url = editingRule ? `/api/ai-control/rules/${editingRule.id}` : "/api/ai-control/rules";
    const method = editingRule ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });
      if (res.ok) {
        setShowRuleForm(false);
        loadRules();
      }
    } catch {
      // ignore
    }
  }

  async function handleDeleteRule(id: number) {
    if (!confirm("确定删除此规则？")) return;
    try {
      await fetch(`/api/ai-control/rules/${id}`, { method: "DELETE" });
      loadRules();
    } catch {
      // ignore
    }
  }

  /* ========== Render Helpers ========== */

  function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }

  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  if (settingsLoading) {
    return (
      <div>
        <PageHeader title="AI 控制面板" />
        <Card>
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            加载中...
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="AI 控制面板" description="管理 AI 系统开关、模块控制、执行策略与审计日志" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Left column: Settings ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Global Toggle */}
          <Card>
            <CardHeader title="全局控制" description="控制 AI 系统总开关" />
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <Toggle
                enabled={settings.aiEnabled}
                onToggle={() => toggleSetting("aiEnabled")}
                label="AI 系统总开关"
                description="关闭后所有 AI 功能将停止运行"
              />
            </div>
          </Card>

          {/* Module Toggles */}
          <Card>
            <CardHeader title="模块开关" description="单独控制各 AI 模块的启用状态" />
            <div className="divide-y divide-gray-100">
              <Toggle
                enabled={settings.salesAgentEnabled}
                onToggle={() => toggleSetting("salesAgentEnabled")}
                label="销售助手 (AI 分析)"
                description="线索分析、客户复盘、商机评分"
              />
              <Toggle
                enabled={settings.emailAgentEnabled}
                onToggle={() => toggleSetting("emailAgentEnabled")}
                label="邮件助手"
                description="AI 辅助撰写和发送邮件"
              />
              <Toggle
                enabled={settings.whatsappAgentEnabled}
                onToggle={() => toggleSetting("whatsappAgentEnabled")}
                label="WhatsApp 助手"
                description="AI 辅助 WhatsApp 消息"
              />
              <Toggle
                enabled={settings.followUpAgentEnabled}
                onToggle={() => toggleSetting("followUpAgentEnabled")}
                label="跟进助手"
                description="AI 自动创建跟进任务和提醒"
              />
              <Toggle
                enabled={settings.prospectingEnabled}
                onToggle={() => toggleSetting("prospectingEnabled")}
                label="主动获客"
                description="AI 主动发掘和触达潜在客户"
              />
            </div>
          </Card>

          {/* Execution Mode */}
          <Card>
            <CardHeader title="执行模式" description="选择 AI 操作的执行方式" />
            <div className="space-y-3">
              {EXECUTION_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.executionMode === mode.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="executionMode"
                    value={mode.value}
                    checked={settings.executionMode === mode.value}
                    onChange={() => setSettings((prev) => ({ ...prev, executionMode: mode.value }))}
                    className="mt-1 accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{mode.label}</p>
                    <p className="text-xs text-gray-500">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Work Hours & Rate Limit */}
          <Card>
            <CardHeader title="工作时间与频率限制" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                <select
                  value={settings.workHoursStart}
                  onChange={(e) => updateNumberField("workHoursStart", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{`${String(i).padStart(2, "0")}:00`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                <select
                  value={settings.workHoursEnd}
                  onChange={(e) => updateNumberField("workHoursEnd", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{`${String(i).padStart(2, "0")}:00`}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">每日最大触达次数</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.maxContactsPerDay}
                  onChange={(e) => updateNumberField("maxContactsPerDay", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">AI 对同一实体每天最多操作次数</p>
              </div>
            </div>
          </Card>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveSettings} isLoading={saving} icon={<Save size={16} />}>
              保存设置
            </Button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.includes("已保存") ? "text-green-600" : "text-red-600"}`}>
                {saveMsg}
              </span>
            )}
          </div>

          {/* ---- Policy Rules ---- */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">策略规则</h3>
                <p className="text-xs text-gray-500 mt-0.5">定义 AI 执行的限制和拦截规则</p>
              </div>
              <Button size="sm" onClick={openAddRule} icon={<Plus size={14} />}>
                添加规则
              </Button>
            </div>

            {rulesLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 size={20} className="animate-spin mr-2" />
                加载中...
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">暂无规则，点击「添加规则」创建</div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rule.type === "HARD" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {rule.type}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{rule.name}</p>
                        <p className="text-xs text-gray-500">
                          {RULE_ACTIONS.find((a) => a.value === rule.action)?.label || rule.action}
                          {rule.value ? ` | 阈值: ${rule.value}` : ""}
                          {!rule.isActive && " (已禁用)"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditRule(rule)}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ---- Right column: Logs & Status ---- */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader title="当前状态" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI 系统</span>
                {settings.aiEnabled ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 size={14} /> 运行中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-red-500">
                    <XCircle size={14} /> 已关闭
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">执行模式</span>
                <span className="text-sm font-medium text-gray-800">
                  {EXECUTION_MODES.find((m) => m.value === settings.executionMode)?.label || settings.executionMode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">工作时间</span>
                <span className="text-sm text-gray-700">
                  <Clock size={13} className="inline mr-1" />
                  {settings.workHoursStart}:00 - {settings.workHoursEnd}:00
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">每日上限</span>
                <span className="text-sm text-gray-700">{settings.maxContactsPerDay} 次</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">模块状态</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <span className={settings.salesAgentEnabled ? "text-green-600" : "text-gray-400"}>
                    {settings.salesAgentEnabled ? "✓" : "○"} 销售助手
                  </span>
                  <span className={settings.emailAgentEnabled ? "text-green-600" : "text-gray-400"}>
                    {settings.emailAgentEnabled ? "✓" : "○"} 邮件助手
                  </span>
                  <span className={settings.whatsappAgentEnabled ? "text-green-600" : "text-gray-400"}>
                    {settings.whatsappAgentEnabled ? "✓" : "○"} WhatsApp
                  </span>
                  <span className={settings.followUpAgentEnabled ? "text-green-600" : "text-gray-400"}>
                    {settings.followUpAgentEnabled ? "✓" : "○"} 跟进助手
                  </span>
                  <span className={settings.prospectingEnabled ? "text-green-600" : "text-gray-400"}>
                    {settings.prospectingEnabled ? "✓" : "○"} 主动获客
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Execution Logs */}
          <Card>
            <CardHeader title="执行日志" description="AI 操作的审计记录" />

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-gray-400" />
              <select
                value={logFilterAction}
                onChange={(e) => { setLogFilterAction(e.target.value); setLogsPage(1); }}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">全部类型</option>
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={logFilterAllowed}
                onChange={(e) => { setLogFilterAllowed(e.target.value); setLogsPage(1); }}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">全部状态</option>
                <option value="true">允许</option>
                <option value="false">拦截</option>
              </select>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 size={20} className="animate-spin mr-2" />
                加载中...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">暂无日志记录</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded border text-xs ${
                      log.allowed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {ACTION_TYPES.find((t) => t.value === log.actionType)?.label || log.actionType}
                      </span>
                      <span className={log.allowed ? "text-green-600" : "text-red-600"}>
                        {log.allowed ? "允许" : "拦截"}
                      </span>
                    </div>
                    {log.reason && <p className="text-gray-600 mt-0.5">{log.reason}</p>}
                    <div className="flex items-center justify-between mt-1 text-gray-400">
                      <span>{log.entityType}{log.entityId ? `#${log.entityId}` : ""}</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {logsTotal > 20 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">共 {logsTotal} 条</span>
                <div className="flex gap-2">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage((p) => p - 1)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-gray-500 px-2 py-1">第 {logsPage} 页</span>
                  <button
                    disabled={logsPage * 20 >= logsTotal}
                    onClick={() => setLogsPage((p) => p + 1)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ---- Rule Form Modal ---- */}
      {showRuleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingRule ? "编辑规则" : "添加规则"}
              </h3>
              <button onClick={() => setShowRuleForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则名称</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="如：黑名单客户拦截"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">规则类型</label>
                  <select
                    value={ruleForm.type}
                    onChange={(e) => setRuleForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="HARD">HARD (强制拦截)</option>
                    <option value="SOFT">SOFT (条件拦截)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">规则动作</label>
                  <select
                    value={ruleForm.action}
                    onChange={(e) => setRuleForm((p) => ({ ...p, action: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {RULE_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阈值 / 参数</label>
                <input
                  type="text"
                  value={ruleForm.value}
                  onChange={(e) => setRuleForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder="如折扣上限 10、每日频率 3 等"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">条件 (JSON)</label>
                <textarea
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm((p) => ({ ...p, condition: e.target.value }))}
                  rows={3}
                  placeholder='{"customerStatus": "BLACKLIST"}'
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleForm.isActive}
                  onChange={(e) => setRuleForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">启用此规则</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowRuleForm(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleSaveRule} disabled={!ruleForm.name} icon={<Save size={14} />}>
                {editingRule ? "更新" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
