"use client";

import PageHeader from "@/components/PageHeader";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

function CopyButton({ text, label }: { text: string; label?: string }) {
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
      {copied ? "已复制" : label || "复制"}
    </button>
  );
}

export default function LeadFieldMappingPage() {
  const standardJson = `{
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
      <PageHeader title="外部线索字段映射规范" backHref="/integration-guides" />

      <div className="space-y-6">
        {/* 标准字段表 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">CRM Lead 标准字段表</h2>
            <CopyButton text={standardJson} label="复制 JSON" />
          </div>
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
                  { field: "companyName", required: "必填", desc: "公司名称" },
                  { field: "name", required: "可选", desc: "联系人姓名" },
                  { field: "country", required: "可选", desc: "国家" },
                  { field: "email", required: "可选", desc: "邮箱（用于重复检测）" },
                  { field: "whatsapp", required: "可选", desc: "WhatsApp 号码" },
                  { field: "sourceWebsite", required: "可选", desc: "来源网站" },
                  { field: "productInterest", required: "可选", desc: "感兴趣产品" },
                  { field: "inquiryContent", required: "可选", desc: "询盘内容" },
                  { field: "notes", required: "可选", desc: "备注" },
                  { field: "businessLineCode", required: "推荐", desc: "业务线代码" },
                  { field: "source", required: "可选", desc: "来源渠道" },
                  { field: "leadGrade", required: "可选", desc: "客户等级" },
                  { field: "priority", required: "可选", desc: "优先级" },
                ].map((row) => (
                  <tr key={row.field} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{row.field}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.required === "必填" ? "bg-red-100 text-red-700" :
                        row.required === "推荐" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {row.required}
                      </span>
                    </td>
                    <td className="py-2 px-3">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 业务线代码 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">businessLineCode 业务线代码对照</h2>
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

        {/* source 可选值 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">source 来源渠道可选值</h2>
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

        {/* leadGrade 可选值 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">leadGrade 客户等级可选值</h2>
          <div className="flex gap-4">
            {["A", "B", "C", "D"].map((grade) => (
              <div key={grade} className="p-3 bg-gray-50 rounded text-center">
                <div className="text-lg font-bold">{grade}</div>
                <div className="text-xs text-gray-500">
                  {grade === "A" ? "高质量大客户" :
                   grade === "B" ? "有潜力客户" :
                   grade === "C" ? "一般客户" :
                   "低质量客户"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* priority 可选值 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">priority 优先级可选值</h2>
          <div className="flex gap-4">
            {[
              { value: "HIGH", label: "高", color: "bg-red-100 text-red-700" },
              { value: "MEDIUM", label: "中", color: "bg-yellow-100 text-yellow-700" },
              { value: "LOW", label: "低", color: "bg-gray-100 text-gray-700" },
            ].map((item) => (
              <div key={item.value} className={`p-3 rounded text-center ${item.color}`}>
                <div className="font-bold">{item.value}</div>
                <div className="text-xs">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 不同来源字段映射 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">不同来源字段映射建议</h2>

          <div className="space-y-6">
            {/* WordPress 表单 */}
            <div>
              <h3 className="font-medium mb-2">WordPress 表单 (Contact Form 7 / WPForms)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">表单字段</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">CRM 字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { form: "your-name", crm: "name" },
                      { form: "your-email", crm: "email" },
                      { form: "your-message", crm: "inquiryContent" },
                      { form: "product", crm: "productInterest" },
                      { form: "company", crm: "companyName" },
                    ].map((row) => (
                      <tr key={row.form} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">{row.form}</td>
                        <td className="py-2 px-3 font-mono text-xs">{row.crm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Facebook 表单 */}
            <div>
              <h3 className="font-medium mb-2">Facebook Lead Ads 表单</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">表单字段</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">CRM 字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { form: "full_name", crm: "name" },
                      { form: "email", crm: "email" },
                      { form: "phone_number", crm: "whatsapp" },
                      { form: "company_name", crm: "companyName" },
                      { form: "message", crm: "inquiryContent" },
                    ].map((row) => (
                      <tr key={row.form} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">{row.form}</td>
                        <td className="py-2 px-3 font-mono text-xs">{row.crm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TikTok 私信 */}
            <div>
              <h3 className="font-medium mb-2">TikTok 私信整理</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">原始字段</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">CRM 字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { form: "username", crm: "name" },
                      { form: "profile_url", crm: "notes" },
                      { form: "message", crm: "inquiryContent" },
                      { form: "detected_product", crm: "productInterest" },
                    ].map((row) => (
                      <tr key={row.form} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">{row.form}</td>
                        <td className="py-2 px-3 font-mono text-xs">{row.crm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI 营销系统 */}
            <div>
              <h3 className="font-medium mb-2">AI 营销系统</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">AI 系统字段</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">CRM 字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { form: "lead.company", crm: "companyName" },
                      { form: "lead.contact", crm: "name" },
                      { form: "lead.channel", crm: "source" },
                      { form: "lead.product_interest", crm: "productInterest" },
                      { form: "lead.summary", crm: "inquiryContent" },
                    ].map((row) => (
                      <tr key={row.form} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">{row.form}</td>
                        <td className="py-2 px-3 font-mono text-xs">{row.crm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Google Sheet */}
            <div>
              <h3 className="font-medium mb-2">Google Sheet</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Sheet 列名</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">CRM 字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { form: "Company", crm: "companyName" },
                      { form: "Contact", crm: "name" },
                      { form: "Email", crm: "email" },
                      { form: "Country", crm: "country" },
                      { form: "Product", crm: "productInterest" },
                      { form: "Message", crm: "inquiryContent" },
                    ].map((row) => (
                      <tr key={row.form} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">{row.form}</td>
                        <td className="py-2 px-3 font-mono text-xs">{row.crm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
