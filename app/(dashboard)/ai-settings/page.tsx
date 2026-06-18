"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Input } from "@/components/ui/FormField";
import { Select } from "@/components/ui/FormField";
import {
  Save,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

const AI_PRESETS = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", visionModel: "gpt-4o" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { name: "Moonshot", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  { name: "MiMo", baseUrl: "https://your-mimo-api.com/v1", model: "mimo-v2.5-pro" },
  { name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", visionModel: "glm-4v" },
  { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-turbo", visionModel: "qwen-vl-plus" },
  { name: "自定义", baseUrl: "", model: "" },
];

interface AIFormData {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  visionBaseUrl: string;
  visionApiKey: string;
  visionModel: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  model?: string;
}

export default function AISettingsPage() {
  const [form, setForm] = useState<AIFormData>({
    provider: "OPENAI_COMPATIBLE",
    baseUrl: "",
    apiKey: "",
    model: "",
    visionBaseUrl: "",
    visionApiKey: "",
    visionModel: "",
  });

  const [selectedPreset, setSelectedPreset] = useState("自定义");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showVisionApiKey, setShowVisionApiKey] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/config");
      const data = await res.json();
      if (data.configured) {
        setForm({
          provider: data.provider || "OPENAI_COMPATIBLE",
          baseUrl: data.baseUrl || "",
          apiKey: data.apiKey || "",
          model: data.model || "",
          visionBaseUrl: data.visionBaseUrl || "",
          visionApiKey: "",
          visionModel: data.visionModel || "",
        });
        // Match preset
        const matched = AI_PRESETS.find((p) => p.baseUrl === data.baseUrl);
        if (matched) setSelectedPreset(matched.name);
        else setSelectedPreset("自定义");

        if (data.hasVision) {
          setShowVision(true);
          // Vision API key is masked separately from the API
          setForm((prev) => ({
            ...prev,
            visionBaseUrl: data.visionBaseUrl || "",
            visionModel: data.visionModel || "",
          }));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handlePresetChange(name: string) {
    setSelectedPreset(name);
    const preset = AI_PRESETS.find((p) => p.name === name);
    if (preset) {
      setForm((prev) => ({
        ...prev,
        baseUrl: preset.baseUrl,
        model: preset.model,
        visionBaseUrl: preset.baseUrl,
        visionModel: preset.visionModel || "",
      }));
      if (preset.visionModel) {
        setShowVision(true);
      }
    }
  }

  function updateField(field: keyof AIFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
          model: form.model,
          visionBaseUrl: showVision ? form.visionBaseUrl : null,
          visionApiKey: showVision ? form.visionApiKey || undefined : null,
          visionModel: showVision ? form.visionModel : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg("配置已保存");
        // Refresh masked keys
        fetchConfig();
      } else {
        setSaveMsg(data.error || "保存失败");
      }
    } catch {
      setSaveMsg("保存失败，请检查网络");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "请求失败，请检查网络连接" });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="AI 设置" />
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
      <PageHeader title="AI 设置" description="配置 AI 模型接口，支持多种服务商预设" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main config */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="主模型配置" description="选择服务商预设或自定义配置" />

            <div className="space-y-4">
              <FormField label="服务商预设">
                <Select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  options={AI_PRESETS.map((p) => ({ value: p.name, label: p.name }))}
                />
              </FormField>

              <FormField label="Base URL" required>
                <Input
                  placeholder="https://api.openai.com/v1"
                  value={form.baseUrl}
                  onChange={(e) => updateField("baseUrl", e.target.value)}
                />
              </FormField>

              <FormField label="API Key" required>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={form.apiKey}
                    onChange={(e) => updateField("apiKey", e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormField>

              <FormField label="模型名称" required description="如 gpt-4o-mini、deepseek-chat 等">
                <Input
                  placeholder="模型名称"
                  value={form.model}
                  onChange={(e) => updateField("model", e.target.value)}
                />
              </FormField>
            </div>
          </Card>

          {/* Vision config */}
          <Card>
            <button
              type="button"
              onClick={() => setShowVision(!showVision)}
              className="w-full flex items-center justify-between"
            >
              <CardHeader
                title="视觉模型配置"
                description="如果主模型支持图片输入（如 GPT-4o），可不单独配置"
              />
              {showVision ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showVision && (
              <div className="space-y-4 mt-2">
                <FormField label="视觉 Base URL">
                  <Input
                    placeholder="与主模型相同则留空"
                    value={form.visionBaseUrl}
                    onChange={(e) => updateField("visionBaseUrl", e.target.value)}
                  />
                </FormField>

                <FormField label="视觉 API Key">
                  <div className="relative">
                    <Input
                      type={showVisionApiKey ? "text" : "password"}
                      placeholder="留空则使用主模型 Key"
                      value={form.visionApiKey}
                      onChange={(e) => updateField("visionApiKey", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVisionApiKey(!showVisionApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showVisionApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>

                <FormField label="视觉模型名称" description="如 gpt-4o、glm-4v 等支持图片输入的模型">
                  <Input
                    placeholder="视觉模型名称"
                    value={form.visionModel}
                    onChange={(e) => updateField("visionModel", e.target.value)}
                  />
                </FormField>
              </div>
            )}
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} isLoading={saving} icon={<Save size={16} />}>
              保存配置
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              isLoading={testing}
              icon={<Zap size={16} />}
            >
              测试连接
            </Button>
            {saveMsg && (
              <span
                className={`text-sm ${saveMsg.includes("已保存") ? "text-green-600" : "text-red-600"}`}
              >
                {saveMsg}
              </span>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <Card className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                    {testResult.success ? "测试通过" : "测试失败"}
                  </p>
                  <p className={`text-sm mt-1 ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                    {testResult.message || testResult.error}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar: status & info */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="连接状态" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">主模型</span>
                {form.baseUrl && form.apiKey && form.model ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 size={14} /> 已配置
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-red-500">
                    <XCircle size={14} /> 未配置
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">视觉模型</span>
                {form.visionModel ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 size={14} /> 已配置
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                    未配置
                  </span>
                )}
              </div>
              {form.model && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">当前模型</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{form.model}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="AI 功能" />
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                线索 AI 分析
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                客户 AI 复盘
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                项目 AI 分析
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                跟进 AI 回复
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                模板 AI 改写
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                图片客户提取
              </li>
            </ul>
          </Card>

          <Card>
            <CardHeader title="安全说明" />
            <ul className="space-y-2 text-xs text-gray-500">
              <li>API Key 存储在数据库中，前端仅显示掩码</li>
              <li>即使 AI 未配置，CRM 基础功能仍然正常可用</li>
              <li>数据库配置优先于 .env 环境变量</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
