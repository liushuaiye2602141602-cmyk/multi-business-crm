"use client";

import PageHeader from "@/components/PageHeader";
import { Copy, Check, AlertTriangle } from "lucide-react";
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

export default function WebsiteFormGuidePage() {
  const fetchExample = `fetch("http://localhost:3003/api/webhooks/leads", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-crm-source-code": "flexible-packaging-website",
    "x-crm-api-key": "crm_sk_xxxxx"
  },
  body: JSON.stringify({
    companyName: "ABC Pet Food",
    name: "Mike",
    email: "mike@example.com",
    productInterest: "10kg dog food bag",
    inquiryContent: "We need 10kg dog food bags with zipper."
  })
})`;

  return (
    <div>
      <PageHeader title="独立站表单接入 CRM 指南" backHref="/integration-guides" />

      <div className="space-y-6">
        {/* 用途说明 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">用途说明</h2>
          <p className="text-gray-600">
            适用于 WordPress、Elementor、Contact Form 7、WPForms、独立站自定义表单等，把客户询盘推送到 CRM Webhook。
          </p>
        </div>

        {/* 方式一：n8n 中转 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">方式一：使用 n8n 中转（推荐）</h2>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium">推荐方式</p>
            <p className="text-blue-700 text-sm mt-1">Website Form → n8n Webhook → CRM Webhook</p>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <p>1. 在 n8n 中创建 Webhook 触发节点，接收网站表单数据</p>
            <p>2. 使用 HTTP Request 节点，POST 到 CRM Webhook</p>
            <p>3. 优点：API Key 安全保存在 n8n 服务器端，不暴露在前端</p>
          </div>
        </div>

        {/* 方式二：WordPress 插件 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">方式二：WordPress 插件 Webhook</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>如果表单插件支持 Webhook（如 WPForms、Gravity Forms、Contact Form 7），可以直接配置 POST 到 CRM。</p>
            <p>配置要点：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>URL: http://your-domain:3003/api/webhooks/leads</li>
              <li>Method: POST</li>
              <li>Headers: x-crm-source-code, x-crm-api-key</li>
              <li>Body: JSON 格式映射表单字段</li>
            </ul>
          </div>
        </div>

        {/* 方式三：自定义代码 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">方式三：自定义代码 POST</h2>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">JavaScript fetch 示例</p>
            <CopyButton text={fetchExample} />
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
            {fetchExample}
          </pre>
        </div>

        {/* 安全警告 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-yellow-800">安全提醒</h3>
              <p className="text-yellow-700 text-sm mt-1">
                不要把真实 API Key 暴露在前端浏览器代码中。如果是公开网站，建议通过服务器端或 n8n 中转。
                前端直接写 API Key 不安全，可能被他人获取并滥用。
              </p>
            </div>
          </div>
        </div>

        {/* 表单字段映射建议 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">表单字段映射建议</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">网站表单字段</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">CRM 字段</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">说明</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { form: "Company Name", crm: "companyName", desc: "必填" },
                  { form: "Name / Contact", crm: "name", desc: "联系人" },
                  { form: "Country", crm: "country", desc: "国家" },
                  { form: "Email", crm: "email", desc: "用于重复检测" },
                  { form: "Phone / WhatsApp", crm: "whatsapp", desc: "" },
                  { form: "Product Interest", crm: "productInterest", desc: "" },
                  { form: "Message / Inquiry", crm: "inquiryContent", desc: "" },
                ].map((row) => (
                  <tr key={row.form} className="border-b last:border-0">
                    <td className="py-2 px-3">{row.form}</td>
                    <td className="py-2 px-3 font-mono text-xs">{row.crm}</td>
                    <td className="py-2 px-3 text-gray-500">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
