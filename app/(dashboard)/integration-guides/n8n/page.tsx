"use client";

import PageHeader from "@/components/PageHeader";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
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
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export default function N8nGuidePage() {
  const webhookUrl = "http://localhost:3003/api/webhooks/leads";

  const jsonBody = `{
  "companyName": "ABC Pet Food",
  "name": "Mike",
  "country": "Germany",
  "email": "mike@example.com",
  "whatsapp": "+49 123456",
  "sourceWebsite": "baolaipackaging.com",
  "productInterest": "10kg dog food flat bottom pouch",
  "inquiryContent": "We need 10kg dog food bags with zipper and handle.",
  "businessLineCode": "flexible-packaging",
  "source": "WEBSITE",
  "leadGrade": "A",
  "priority": "HIGH"
}`;

  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-crm-source-code: your-source-code" \\
  -H "x-crm-api-key: crm_sk_xxxxx" \\
  -d '${jsonBody}'`;

  return (
    <div>
      <PageHeader title="n8n 接入 CRM Webhook 指南" backHref="/integration-guides" />

      <div className="space-y-6">
        {/* 用途说明 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">用途说明</h2>
          <p className="text-gray-600">
            用于把网站表单、Facebook 表单、Google Sheet、AI 营销系统、OpenClaw 整理出来的线索推送到 CRM。
          </p>
        </div>

        {/* n8n HTTP Request 配置 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">n8n HTTP Request 节点配置</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Method</p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">POST</div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">URL</p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm flex items-center justify-between">
                <span>{webhookUrl}</span>
                <CopyButton text={webhookUrl} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Headers</p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs">
                Content-Type: application/json<br />
                x-crm-source-code: your-source-code<br />
                x-crm-api-key: your-api-key
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Body Type</p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">JSON</div>
            </div>
          </div>
        </div>

        {/* JSON Body 示例 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">JSON Body 示例</h2>
            <CopyButton text={jsonBody} />
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
            {jsonBody}
          </pre>
        </div>

        {/* cURL 示例 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">cURL 示例</h2>
            <CopyButton text={curlExample} />
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
            {curlExample}
          </pre>
        </div>

        {/* 字段说明 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">字段说明</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">字段</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">必填</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">说明</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: "companyName", required: "是", desc: "公司名称" },
                  { field: "name", required: "否", desc: "联系人姓名" },
                  { field: "country", required: "否", desc: "国家" },
                  { field: "email", required: "否", desc: "邮箱（用于重复检测）" },
                  { field: "whatsapp", required: "否", desc: "WhatsApp 号码" },
                  { field: "sourceWebsite", required: "否", desc: "来源网站" },
                  { field: "productInterest", required: "否", desc: "感兴趣产品" },
                  { field: "inquiryContent", required: "否", desc: "询盘内容" },
                  { field: "businessLineCode", required: "否（建议填写）", desc: "业务线代码" },
                  { field: "source", required: "否", desc: "来源渠道" },
                  { field: "leadGrade", required: "否", desc: "客户等级 A/B/C/D" },
                  { field: "priority", required: "否", desc: "优先级" },
                ].map((row) => (
                  <tr key={row.field} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{row.field}</td>
                    <td className="py-2 px-3">{row.required}</td>
                    <td className="py-2 px-3">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 业务线代码 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">业务线代码对照</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">flexible-packaging</code>
              <span>软包装</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">packaging-machinery</code>
              <span>包装机/灌装机</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">wooden-crafts</code>
              <span>木质工艺品</span>
            </div>
          </div>
        </div>

        {/* 常见错误 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">常见错误</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">401</code>
              <span>Missing x-crm-api-key / Invalid API key - 检查 Header 和 API Key</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">400</code>
              <span>companyName is required - 必须提供公司名称</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">400</code>
              <span>Business line is required or invalid - 提供有效的 businessLineCode</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">200</code>
              <span>status: "duplicate" - 该邮箱已存在线索</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
