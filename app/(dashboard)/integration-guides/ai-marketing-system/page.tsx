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

const examples = {
  flexible: `{
  "companyName": "PetFood Brand GmbH",
  "name": "Mike Schmidt",
  "country": "Germany",
  "email": "mike@petfoodbrand.de",
  "whatsapp": "+49 123456789",
  "sourceWebsite": "tiktok.com/@petfoodbrand",
  "productInterest": "stand up pouch for dog food",
  "inquiryContent": "AI Analysis: Customer showed high interest in stand up pouch packaging for pet food. Engaged with multiple posts about zipper and handle features. Likely buyer based on engagement pattern.",
  "notes": "From TikTok AI campaign - Pet Food Packaging Q2 2024",
  "businessLineCode": "flexible-packaging",
  "source": "TIKTOK",
  "leadGrade": "A",
  "priority": "HIGH"
}`,
  machinery: `{
  "companyName": "Juice Factory LLC",
  "name": "David Johnson",
  "country": "UAE",
  "email": "david@juicefactory.ae",
  "whatsapp": "+971 123456",
  "sourceWebsite": "linkedin.com/in/david-juice",
  "productInterest": "liquid filling machine for bottles",
  "inquiryContent": "AI Analysis: Customer is looking for liquid filling solutions for 500ml juice bottles. Mentioned need for 2000 bottles/hour capacity. Budget range $30,000-$50,000.",
  "notes": "From LinkedIn AI campaign - Packaging Machinery",
  "businessLineCode": "packaging-machinery",
  "source": "LINKEDIN",
  "leadGrade": "B",
  "priority": "MEDIUM"
}`,
  wooden: `{
  "companyName": "Gift Import Co",
  "name": "Anna Williams",
  "country": "USA",
  "email": "anna@giftimport.com",
  "whatsapp": "+1 123456",
  "sourceWebsite": "instagram.com/giftimportco",
  "productInterest": "custom wooden Christmas decorations",
  "inquiryContent": "AI Analysis: Customer interested in custom wooden Christmas decorations with logo printing. Looking for initial quantity 3000 pcs. Retail chain with 50+ stores.",
  "notes": "From Instagram AI campaign - Holiday Crafts",
  "businessLineCode": "wooden-crafts",
  "source": "INSTAGRAM",
  "leadGrade": "B",
  "priority": "MEDIUM"
}`,
};

export default function AIMarketingGuidePage() {
  const standardFormat = `{
  "companyName": "string (必填)",
  "name": "string (可选)",
  "country": "string (可选)",
  "email": "string (可选, 用于重复检测)",
  "whatsapp": "string (可选)",
  "sourceWebsite": "string (可选)",
  "productInterest": "string (可选)",
  "inquiryContent": "string (可选)",
  "notes": "string (可选)",
  "businessLineCode": "string (推荐)",
  "source": "enum (可选)",
  "leadGrade": "enum (可选)",
  "priority": "enum (可选)"
}`;

  return (
    <div>
      <PageHeader title="AI 营销系统接入 CRM 指南" backHref="/integration-guides" />

      <div className="space-y-6">
        {/* 用途说明 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">用途说明</h2>
          <p className="text-gray-600">
            用于把 AI 营销系统（如 Codex 单独做的 AI 营销系统）产生的线索推送到 CRM。
          </p>
        </div>

        {/* 推荐推送格式 v1 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">推荐推送格式 v1</h2>
            <CopyButton text={standardFormat} />
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
            {standardFormat}
          </pre>
          <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <strong>说明：</strong>如果 AI 营销系统生成的是内容线索（如"某个客户可能感兴趣"），必须写入 notes，并且 inquiryContent 要说明来源和判断依据。
          </div>
        </div>

        {/* 业务线代码 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">业务线代码对照</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-4 p-2 bg-gray-50 rounded">
              <code className="bg-white px-2 py-1 rounded text-sm">flexible-packaging</code>
              <span>=</span>
              <span>软包装</span>
            </div>
            <div className="flex items-center gap-4 p-2 bg-gray-50 rounded">
              <code className="bg-white px-2 py-1 rounded text-sm">packaging-machinery</code>
              <span>=</span>
              <span>包装机/灌装机</span>
            </div>
            <div className="flex items-center gap-4 p-2 bg-gray-50 rounded">
              <code className="bg-white px-2 py-1 rounded text-sm">wooden-crafts</code>
              <span>=</span>
              <span>木质工艺品</span>
            </div>
          </div>
        </div>

        {/* source 推荐 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">source 来源渠道推荐</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: "WEBSITE", label: "官网" },
              { value: "FACEBOOK", label: "Facebook" },
              { value: "TIKTOK", label: "TikTok" },
              { value: "WHATSAPP", label: "WhatsApp" },
              { value: "EMAIL", label: "邮箱" },
              { value: "MANUAL_OUTREACH", label: "手动开发" },
              { value: "REFERRAL", label: "转介绍" },
              { value: "OTHER", label: "其他" },
            ].map((item) => (
              <div key={item.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <code className="text-xs">{item.value}</code>
                <span className="text-sm text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 建议推送字段 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">建议 AI 营销系统推送字段</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">字段</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">说明</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">建议</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: "companyName", desc: "公司名称", tip: "必填，如无公司名用用户名代替" },
                  { field: "name", desc: "联系人", tip: "" },
                  { field: "country", desc: "国家", tip: "" },
                  { field: "email", desc: "邮箱", tip: "用于重复检测" },
                  { field: "whatsapp", desc: "WhatsApp", tip: "" },
                  { field: "sourceWebsite", desc: "来源网站", tip: "如 TikTok 个人页链接" },
                  { field: "productInterest", desc: "感兴趣产品", tip: "" },
                  { field: "inquiryContent", desc: "询盘内容", tip: "AI 生成的对话摘要" },
                  { field: "businessLineCode", desc: "业务线代码", tip: "必须对应正确" },
                  { field: "source", desc: "来源渠道", tip: "TIKTOK / FACEBOOK 等" },
                  { field: "notes", desc: "备注", tip: "如 AI 营销活动标识" },
                ].map((row) => (
                  <tr key={row.field} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{row.field}</td>
                    <td className="py-2 px-3">{row.desc}</td>
                    <td className="py-2 px-3 text-gray-500">{row.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 无 companyName 处理 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-medium text-yellow-800 mb-2">如果 AI 营销系统没有 companyName</h3>
          <p className="text-yellow-700 text-sm mb-3">
            建议用客户名称、邮箱前缀、平台用户名临时生成，例如：
          </p>
          <div className="space-y-1 text-sm font-mono">
            <p>TikTok User - petfoodlover</p>
            <p>Facebook Lead - mike@example.com</p>
            <p>Website Visitor - 20240101</p>
          </div>
        </div>

        {/* 三个业务线示例 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">业务线推送示例</h2>

          <div className="space-y-6">
            {/* 软包装 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-700">1. 软包装线索示例</h3>
                <CopyButton text={examples.flexible} />
              </div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
                {examples.flexible}
              </pre>
            </div>

            {/* 包装机 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-purple-700">2. 包装机线索示例</h3>
                <CopyButton text={examples.machinery} />
              </div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
                {examples.machinery}
              </pre>
            </div>

            {/* 木质工艺品 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-orange-700">3. 木质工艺品线索示例</h3>
                <CopyButton text={examples.wooden} />
              </div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
                {examples.wooden}
              </pre>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Webhook 接收地址</h2>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
            POST http://localhost:3003/api/webhooks/leads
          </div>
          <div className="mt-3 bg-gray-50 rounded-lg p-3 font-mono text-xs">
            Headers:<br />
            x-crm-source-code: your-source-code<br />
            x-crm-api-key: crm_sk_xxxxx
          </div>
        </div>
      </div>
    </div>
  );
}
