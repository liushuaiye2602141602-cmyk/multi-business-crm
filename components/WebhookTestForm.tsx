"use client";

import { useState } from "react";
import { Send, Loader2, Wand2, ExternalLink, Copy, Check, RefreshCw } from "lucide-react";
import Badge from "./Badge";
import Link from "next/link";
import { ExternalSourceTypeLabel } from "@/lib/enums";

interface ExternalSource {
  id: number;
  name: string;
  code: string;
  sourceType: string;
  businessLineId: number | null;
  defaultSource: string;
  autoAnalyze: boolean;
  isActive: boolean;
  businessLine: { name: string; code: string | null } | null;
}

interface WebhookTestFormProps {
  externalSources: ExternalSource[];
}

const TEST_DATA = {
  "flexible-packaging": {
    companyName: "Test Pet Food Brand",
    name: "Mike",
    country: "Germany",
    email: "mike@testpetfood.com",
    whatsapp: "+49 123456789",
    sourceWebsite: "baolaipackaging.com",
    productInterest: "10kg dog food flat bottom pouch",
    inquiryContent: "We need 10kg dog food bags with zipper and handle for Germany market. Quantity around 20,000 pcs.",
    businessLineCode: "flexible-packaging",
    source: "WEBSITE",
    leadGrade: "A",
    priority: "HIGH",
  },
  "packaging-machinery": {
    companyName: "Test Juice Factory",
    name: "David",
    country: "UAE",
    email: "david@testjuice.com",
    whatsapp: "+971 123456",
    sourceWebsite: "machinery-site.com",
    productInterest: "liquid filling machine for 500ml bottles",
    inquiryContent: "We need a liquid filling machine for 500ml juice bottles, around 2000 bottles per hour.",
    businessLineCode: "packaging-machinery",
    source: "WEBSITE",
    leadGrade: "B",
    priority: "MEDIUM",
  },
  "wooden-crafts": {
    companyName: "Test Gift Importer",
    name: "Anna",
    country: "USA",
    email: "anna@testgift.com",
    whatsapp: "+1 123456",
    sourceWebsite: "yashengcrafts.com",
    productInterest: "custom wooden Christmas decorations",
    inquiryContent: "We are looking for custom wooden Christmas decorations with logo printing. Initial quantity 3000 pcs.",
    businessLineCode: "wooden-crafts",
    source: "WEBSITE",
    leadGrade: "B",
    priority: "MEDIUM",
  },
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "已复制" : label}
    </button>
  );
}

export default function WebhookTestForm({ externalSources }: WebhookTestFormProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({
    companyName: "",
    name: "",
    country: "",
    email: "",
    whatsapp: "",
    sourceWebsite: "",
    productInterest: "",
    inquiryContent: "",
    notes: "",
    businessLineCode: "",
    source: "WEBSITE",
    leadGrade: "C",
    priority: "MEDIUM",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    data: Record<string, unknown>;
    leadId?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSource = externalSources.find((s) => s.id === parseInt(selectedSourceId));

  function fillTestData(key: keyof typeof TEST_DATA) {
    const data = TEST_DATA[key];
    setFormData((prev) => ({ ...prev, ...data }));
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function getRequestBody(): string {
    return JSON.stringify(formData, null, 2);
  }

  function getCurlCommand(): string {
    if (!selectedSource) return "";
    return `curl -X POST http://localhost:3003/api/webhooks/leads \\
  -H "Content-Type: application/json" \\
  -H "x-crm-source-code: ${selectedSource.code}" \\
  -H "x-crm-api-key: ${apiKey}" \\
  -d '${getRequestBody()}'`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSource) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/webhooks/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-crm-source-code": selectedSource.code,
          "x-crm-api-key": apiKey,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data,
        leadId: data.leadId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTestDuplicate() {
    if (!selectedSource || !apiKey) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/webhooks/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-crm-source-code": selectedSource.code,
          "x-crm-api-key": apiKey,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data,
        leadId: data.leadId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 源和 API Key */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">测试配置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择 ExternalSource</label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择</option>
              {externalSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="crm_sk_xxxxx"
            />
          </div>
        </div>

        {selectedSource && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>类型: <Badge label={ExternalSourceTypeLabel[selectedSource.sourceType] || selectedSource.sourceType} /></span>
              <span>业务线: {selectedSource.businessLine?.name || "未指定"}</span>
              <span>状态: <Badge label={selectedSource.isActive ? "启用" : "停用"} className={selectedSource.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} /></span>
              <span>自动AI: <Badge label={selectedSource.autoAnalyze ? "是" : "否"} className={selectedSource.autoAnalyze ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} /></span>
            </div>
          </div>
        )}
      </div>

      {/* 测试数据快捷填充 */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">快速填充测试数据</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => fillTestData("flexible-packaging")}
            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Wand2 size={16} />
            软包装测试
          </button>
          <button
            onClick={() => fillTestData("packaging-machinery")}
            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <Wand2 size={16} />
            包装机测试
          </button>
          <button
            onClick={() => fillTestData("wooden-crafts")}
            className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <Wand2 size={16} />
            木质工艺品测试
          </button>
        </div>
      </div>

      {/* 测试表单 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">测试线索数据</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">companyName *</label>
            <input
              value={formData.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">name</label>
            <input
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">country</label>
            <input
              value={formData.country}
              onChange={(e) => updateField("country", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">email</label>
            <input
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">whatsapp</label>
            <input
              value={formData.whatsapp}
              onChange={(e) => updateField("whatsapp", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">sourceWebsite</label>
            <input
              value={formData.sourceWebsite}
              onChange={(e) => updateField("sourceWebsite", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">productInterest</label>
            <input
              value={formData.productInterest}
              onChange={(e) => updateField("productInterest", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">inquiryContent</label>
            <textarea
              value={formData.inquiryContent}
              onChange={(e) => updateField("inquiryContent", e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">businessLineCode</label>
            <input
              value={formData.businessLineCode}
              onChange={(e) => updateField("businessLineCode", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="flexible-packaging"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">leadGrade</label>
            <select
              value={formData.leadGrade}
              onChange={(e) => updateField("leadGrade", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isLoading || !selectedSource || !apiKey}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send size={16} />
                发送测试 Webhook
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTestDuplicate}
            disabled={isLoading || !selectedSource || !apiKey}
            className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} />
            测试重复线索
          </button>

          {selectedSource && apiKey && (
            <>
              <CopyButton text={getRequestBody()} label="复制 JSON" />
              <CopyButton text={getCurlCommand()} label="复制 cURL" />
            </>
          )}
        </div>
      </form>

      {/* 结果显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className={`bg-white rounded-lg border p-6 ${result.status >= 200 && result.status < 300 ? "border-green-200" : "border-red-200"}`}>
          <h2 className="text-lg font-semibold mb-4">响应结果</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">HTTP 状态码:</span>
              <Badge
                label={String(result.status)}
                className={result.status >= 200 && result.status < 300 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
              />
            </div>
            <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>

            {/* 重复线索检测提示 */}
            {result.data.status === "duplicate" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 font-medium">✓ 重复线索检测正常</p>
                <p className="text-yellow-700 text-sm">该邮箱已存在线索，系统正确返回了重复状态。</p>
              </div>
            )}

            {result.leadId && (
              <Link
                href={`/leads/${result.leadId}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:underline"
              >
                <ExternalLink size={16} />
                查看创建的线索
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
