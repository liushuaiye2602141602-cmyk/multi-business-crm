"use client";

import PageHeader from "@/components/PageHeader";
import { Copy, Check, Workflow, ExternalLink, Download } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

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

const webhookUrl = "YOUR_CRM_WEBHOOK_URL";

// n8n 可导入 Workflow JSON
const workflowManual = {
  name: "CRM Webhook - Manual Test",
  nodes: [
    {
      parameters: {},
      id: "manual-trigger",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [250, 300],
    },
    {
      parameters: {
        values: {
          string: [
            { name: "companyName", value: "Test Pet Food Brand" },
            { name: "name", value: "Mike" },
            { name: "country", value: "Germany" },
            { name: "email", value: "mike@testpetfood.com" },
            { name: "whatsapp", value: "+49 123456789" },
            { name: "sourceWebsite", value: "baolaipackaging.com" },
            { name: "productInterest", value: "10kg dog food flat bottom pouch" },
            { name: "inquiryContent", value: "We need 10kg dog food bags with zipper and handle." },
            { name: "businessLineCode", value: "flexible-packaging" },
            { name: "source", value: "WEBSITE" },
            { name: "leadGrade", value: "A" },
            { name: "priority", value: "HIGH" },
          ],
        },
        options: {},
      },
      id: "set-data",
      name: "Set Lead Data",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [450, 300],
    },
    {
      parameters: {
        method: "POST",
        url: webhookUrl,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" },
            { name: "x-crm-source-code", value: "YOUR_SOURCE_CODE" },
            { name: "x-crm-api-key", value: "YOUR_API_KEY" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "companyName", value: "={{ $json.companyName }}" },
            { name: "name", value: "={{ $json.name }}" },
            { name: "country", value: "={{ $json.country }}" },
            { name: "email", value: "={{ $json.email }}" },
            { name: "whatsapp", value: "={{ $json.whatsapp }}" },
            { name: "sourceWebsite", value: "={{ $json.sourceWebsite }}" },
            { name: "productInterest", value: "={{ $json.productInterest }}" },
            { name: "inquiryContent", value: "={{ $json.inquiryContent }}" },
            { name: "businessLineCode", value: "={{ $json.businessLineCode }}" },
            { name: "source", value: "={{ $json.source }}" },
            { name: "leadGrade", value: "={{ $json.leadGrade }}" },
            { name: "priority", value: "={{ $json.priority }}" },
          ],
        },
        options: {},
      },
      id: "http-request",
      name: "HTTP Request to CRM",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [650, 300],
    },
  ],
  connections: {
    "Manual Trigger": { main: [[{ node: "Set Lead Data", type: "main", index: 0 }]] },
    "Set Lead Data": { main: [[{ node: "HTTP Request to CRM", type: "main", index: 0 }]] },
  },
  pinData: {},
};

const workflowWebhook = {
  name: "CRM Webhook - External Lead",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "external-lead",
        options: {},
      },
      id: "webhook-trigger",
      name: "Webhook Trigger",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [250, 300],
      webhookId: "external-lead",
    },
    {
      parameters: {
        values: {
          string: [
            { name: "companyName", value: "={{ $json.companyName || $json.company || 'Unknown' }}" },
            { name: "name", value: "={{ $json.name || $json.contact || '' }}" },
            { name: "country", value: "={{ $json.country || '' }}" },
            { name: "email", value: "={{ $json.email || '' }}" },
            { name: "whatsapp", value: "={{ $json.whatsapp || $json.phone || '' }}" },
            { name: "sourceWebsite", value: "={{ $json.sourceWebsite || $json.source_url || '' }}" },
            { name: "productInterest", value: "={{ $json.productInterest || $json.product || '' }}" },
            { name: "inquiryContent", value: "={{ $json.inquiryContent || $json.message || '' }}" },
            { name: "businessLineCode", value: "={{ $json.businessLineCode || 'flexible-packaging' }}" },
            { name: "source", value: "={{ $json.source || 'OTHER' }}" },
            { name: "leadGrade", value: "={{ $json.leadGrade || 'C' }}" },
            { name: "priority", value: "={{ $json.priority || 'MEDIUM' }}" },
          ],
        },
        options: {},
      },
      id: "normalize",
      name: "Normalize Fields",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [450, 300],
    },
    {
      parameters: {
        method: "POST",
        url: webhookUrl,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" },
            { name: "x-crm-source-code", value: "YOUR_SOURCE_CODE" },
            { name: "x-crm-api-key", value: "YOUR_API_KEY" },
          ],
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "companyName", value: "={{ $json.companyName }}" },
            { name: "name", value: "={{ $json.name }}" },
            { name: "country", value: "={{ $json.country }}" },
            { name: "email", value: "={{ $json.email }}" },
            { name: "whatsapp", value: "={{ $json.whatsapp }}" },
            { name: "sourceWebsite", value: "={{ $json.sourceWebsite }}" },
            { name: "productInterest", value: "={{ $json.productInterest }}" },
            { name: "inquiryContent", value: "={{ $json.inquiryContent }}" },
            { name: "businessLineCode", value: "={{ $json.businessLineCode }}" },
            { name: "source", value: "={{ $json.source }}" },
            { name: "leadGrade", value: "={{ $json.leadGrade }}" },
            { name: "priority", value: "={{ $json.priority }}" },
          ],
        },
        options: {},
      },
      id: "http-request",
      name: "HTTP Request to CRM",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [650, 300],
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}",
        options: {},
      },
      id: "respond",
      name: "Respond to Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [850, 300],
    },
  ],
  connections: {
    "Webhook Trigger": { main: [[{ node: "Normalize Fields", type: "main", index: 0 }]] },
    "Normalize Fields": { main: [[{ node: "HTTP Request to CRM", type: "main", index: 0 }]] },
    "HTTP Request to CRM": { main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]] },
  },
  pinData: {},
};

export default function N8nTemplatesPage() {
  return (
    <div>
      <PageHeader title="n8n 工作流模板" backHref="/integration-guides" />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800">
          以下模板提供可复制的 n8n 工作流设计说明和可导入 JSON，方便快速搭建线索推送流程。
        </p>
        <p className="text-blue-700 text-sm mt-2">
          <strong>注意：</strong>导入 JSON 后需要替换 YOUR_CRM_WEBHOOK_URL、YOUR_SOURCE_CODE、YOUR_API_KEY 为实际值。
        </p>
      </div>

      {/* 可导入 n8n 的 Workflow JSON */}
      <div className="space-y-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold">n8n 可导入 Workflow JSON</h2>
          </div>

          <div className="space-y-4">
            {/* Manual Trigger Workflow */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">1. Manual Trigger → Set Data → CRM Webhook</h3>
                <CopyButton text={JSON.stringify(workflowManual, null, 2)} label="复制 JSON" />
              </div>
              <p className="text-sm text-gray-600 mb-2">用途：手动测试 CRM Webhook</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto max-h-40">
                {JSON.stringify(workflowManual, null, 2).slice(0, 500)}...
              </pre>
            </div>

            {/* Webhook Trigger Workflow */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">2. Webhook Trigger → Normalize → CRM Webhook → Respond</h3>
                <CopyButton text={JSON.stringify(workflowWebhook, null, 2)} label="复制 JSON" />
              </div>
              <p className="text-sm text-gray-600 mb-2">用途：让外部系统先打到 n8n，再由 n8n 推送到 CRM</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto max-h-40">
                {JSON.stringify(workflowWebhook, null, 2).slice(0, 500)}...
              </pre>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>导入后需要替换的占位符：</strong>
            </p>
            <ul className="text-yellow-700 text-sm mt-2 space-y-1">
              <li>• YOUR_CRM_WEBHOOK_URL → http://localhost:3003/api/webhooks/leads</li>
              <li>• YOUR_SOURCE_CODE → 在 ExternalSource 详情页查看</li>
              <li>• YOUR_API_KEY → 生成时复制的 API Key</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 详细模板说明 */}
      <div className="space-y-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Workflow className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold">{template.title}</h2>
            </div>

            <p className="text-gray-600 mb-4">{template.scenario}</p>

            {/* 节点列表 */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">节点流程</h3>
              <div className="flex flex-wrap items-center gap-2">
                {template.nodes.map((node, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                      <div className="font-medium">{node.name}</div>
                      <div className="text-xs text-blue-600">{node.desc}</div>
                    </div>
                    {idx < template.nodes.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 节点详细配置 */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">节点详细配置</h3>
              <div className="space-y-2">
                {template.nodes.map((node, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-sm">{node.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{node.config || "使用默认配置"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* HTTP Request 配置 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">HTTP Request 配置</h3>
                <CopyButton text={template.config} label="复制配置" />
              </div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
                {template.config}
              </pre>
            </div>

            {/* JSON Body */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">JSON Body 示例</h3>
                <CopyButton text={template.jsonBody} label="复制 JSON" />
              </div>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
                {template.jsonBody}
              </pre>
            </div>

            {/* 测试步骤 */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">测试步骤</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                {template.testSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            {/* 常见错误 */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">常见错误及处理</h3>
              <ul className="space-y-1">
                {template.errors.map((err, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-yellow-500">⚠</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* 相关链接 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">相关资源</h2>
        <div className="space-y-2">
          <Link href="/integration-guides/n8n" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            n8n 接入详细指南
          </Link>
          <Link href="/integration-guides/n8n-debug-checklist" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            n8n 调试检查清单
          </Link>
          <Link href="/integration-guides/lead-field-mapping" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            线索字段映射规范
          </Link>
          <Link href="/webhook-test" className="flex items-center gap-2 text-blue-600 hover:underline">
            <ExternalLink size={16} />
            Webhook 测试页
          </Link>
        </div>
      </div>
    </div>
  );
}

const templates = [
  {
    id: "website-form",
    title: "网站表单 → CRM Lead",
    scenario: "适用于独立站 Contact Form、WordPress 表单等，通过 n8n Webhook 接收表单数据并推送到 CRM。",
    nodes: [
      { name: "Webhook Trigger", desc: "接收网站表单 POST 数据", config: "HTTP Method: POST, Path: /website-form" },
      { name: "Set / Edit Fields", desc: "映射表单字段到 CRM 标准字段", config: "使用 Expression 映射字段" },
      { name: "HTTP Request", desc: "POST 到 CRM Webhook API", config: "Method: POST, URL: http://localhost:3003/api/webhooks/leads" },
      { name: "Respond to Webhook", desc: "返回成功响应给网站", config: "Response Code: 200" },
    ],
    config: `Method: POST
URL: http://localhost:3003/api/webhooks/leads
Headers:
  Content-Type: application/json
  x-crm-source-code: flexible-packaging-website
  x-crm-api-key: crm_sk_xxxxx

Body (JSON):
{{ $json }}`,
    jsonBody: `{
  "companyName": "{{ $json.company }}",
  "name": "{{ $json.your_name }}",
  "email": "{{ $json.your_email }}",
  "country": "{{ $json.country }}",
  "productInterest": "{{ $json.product }}",
  "inquiryContent": "{{ $json.your_message }}",
  "businessLineCode": "flexible-packaging",
  "source": "WEBSITE"
}`,
    testSteps: [
      "在 n8n 中创建新 Workflow",
      "添加 Webhook Trigger 节点，获取 Webhook URL",
      "添加 Set 节点，映射表单字段",
      "添加 HTTP Request 节点，配置 CRM Webhook",
      "添加 Respond to Webhook 节点",
      "激活 Workflow",
      "在网站表单中提交测试数据",
      "检查 CRM 中是否创建了 Lead",
    ],
    errors: [
      "400 companyName is required - 确保表单包含公司名字段",
      "401 Invalid API key - 检查 API Key 是否正确",
      "duplicate - 该邮箱已存在线索",
      "表单字段名不匹配 - 检查 Set 节点的字段映射",
    ],
  },
  {
    id: "google-sheet",
    title: "Google Sheet → CRM Lead",
    scenario: "适用于从 Google Sheet 批量导入线索，定时读取新行并推送到 CRM。",
    nodes: [
      { name: "Schedule Trigger", desc: "定时触发（如每小时）", config: "Trigger Interval: 1 Hour" },
      { name: "Google Sheets", desc: "读取 Sheet 数据", config: "Document ID: your-sheet-id, Sheet: Sheet1" },
      { name: "Loop Over Items", desc: "逐行处理", config: "Batch Size: 1" },
      { name: "HTTP Request", desc: "POST 到 CRM Webhook API", config: "Method: POST, URL: http://localhost:3003/api/webhooks/leads" },
    ],
    config: `Method: POST
URL: http://localhost:3003/api/webhooks/leads
Headers:
  Content-Type: application/json
  x-crm-source-code: n8n-lead-push
  x-crm-api-key: crm_sk_xxxxx

Body (JSON):
{{ $json }}`,
    jsonBody: `{
  "companyName": "{{ $json.Company }}",
  "name": "{{ $json.Contact }}",
  "email": "{{ $json.Email }}",
  "country": "{{ $json.Country }}",
  "whatsapp": "{{ $json.WhatsApp }}",
  "productInterest": "{{ $json.Product }}",
  "inquiryContent": "{{ $json.Message }}",
  "businessLineCode": "{{ $json.BusinessLine }}",
  "source": "OTHER"
}`,
    testSteps: [
      "准备 Google Sheet，确保包含 Company、Contact、Email 等列",
      "在 n8n 中创建新 Workflow",
      "添加 Schedule Trigger 节点，设置触发间隔",
      "添加 Google Sheets 节点，连接 Sheet",
      "添加 Loop Over Items 节点",
      "添加 HTTP Request 节点，配置 CRM Webhook",
      "手动触发测试",
      "检查 CRM 中是否创建了 Lead",
    ],
    errors: [
      "确保 Google Sheet 包含 Company 列",
      "businessLineCode 必须对应正确的业务线代码",
      "重复 email 会被自动跳过",
      "Google Sheets 节点需要授权",
    ],
  },
  {
    id: "ai-marketing",
    title: "AI 营销系统 → CRM Lead",
    scenario: "适用于 AI 营销系统（如 Codex 系统）产生的线索，通过 Webhook 推送到 CRM。",
    nodes: [
      { name: "Webhook Trigger", desc: "接收 AI 系统推送的数据", config: "HTTP Method: POST, Path: /ai-lead" },
      { name: "Normalize Fields", desc: "标准化字段格式", config: "使用 Expression 标准化字段" },
      { name: "HTTP Request", desc: "POST 到 CRM Webhook API", config: "Method: POST, URL: http://localhost:3003/api/webhooks/leads" },
      { name: "Return leadId", desc: "返回创建的线索 ID", config: "Response Code: 200" },
    ],
    config: `Method: POST
URL: http://localhost:3003/api/webhooks/leads
Headers:
  Content-Type: application/json
  x-crm-source-code: n8n-lead-push
  x-crm-api-key: crm_sk_xxxxx

Body (JSON):
{{ $json }}`,
    jsonBody: `{
  "companyName": "{{ $json.lead.company || 'AI Lead - ' + $json.lead.email }}",
  "name": "{{ $json.lead.contact }}",
  "country": "{{ $json.lead.country }}",
  "email": "{{ $json.lead.email }}",
  "whatsapp": "{{ $json.lead.whatsapp }}",
  "sourceWebsite": "{{ $json.lead.source_url }}",
  "productInterest": "{{ $json.lead.product_interest }}",
  "inquiryContent": "{{ $json.lead.summary }}",
  "notes": "{{ $json.lead.notes }}",
  "businessLineCode": "{{ $json.lead.business_line }}",
  "source": "{{ $json.lead.channel || 'OTHER' }}",
  "leadGrade": "{{ $json.lead.score || 'C' }}",
  "priority": "{{ $json.lead.priority || 'MEDIUM' }}"
}`,
    testSteps: [
      "在 n8n 中创建新 Workflow",
      "添加 Webhook Trigger 节点，获取 Webhook URL",
      "配置 AI 营销系统将数据 POST 到此 URL",
      "添加 Normalize Fields 节点，标准化字段",
      "添加 HTTP Request 节点，配置 CRM Webhook",
      "测试 AI 营销系统推送数据",
      "检查 CRM 中是否创建了 Lead",
    ],
    errors: [
      "如果 AI 系统没有 companyName，用邮箱或用户名生成",
      "businessLineCode 必须对应正确的业务线代码",
      "inquiryContent 建议写入 AI 判断依据",
      "检查 AI 系统的数据格式是否匹配",
    ],
  },
  {
    id: "manual-lead",
    title: "手动线索整理 → CRM Lead",
    scenario: "适用于手动整理的线索数据，通过 n8n 手动触发推送到 CRM。",
    nodes: [
      { name: "Manual Trigger", desc: "手动触发", config: "点击 Execute 按钮触发" },
      { name: "Set Lead Data", desc: "填写线索数据", config: "手动填写或使用 Code 节点" },
      { name: "HTTP Request", desc: "POST 到 CRM Webhook API", config: "Method: POST, URL: http://localhost:3003/api/webhooks/leads" },
    ],
    config: `Method: POST
URL: http://localhost:3003/api/webhooks/leads
Headers:
  Content-Type: application/json
  x-crm-source-code: n8n-lead-push
  x-crm-api-key: crm_sk_xxxxx

Body (JSON):
{{ $json }}`,
    jsonBody: `{
  "companyName": "Manual Lead Company",
  "name": "Contact Name",
  "country": "Germany",
  "email": "contact@example.com",
  "whatsapp": "+49 123456",
  "productInterest": "stand up pouch",
  "inquiryContent": "Manual lead from trade show",
  "businessLineCode": "flexible-packaging",
  "source": "MANUAL_OUTREACH",
  "leadGrade": "B",
  "priority": "MEDIUM"
}`,
    testSteps: [
      "在 n8n 中创建新 Workflow",
      "添加 Manual Trigger 节点",
      "添加 Set 节点，填写线索数据",
      "添加 HTTP Request 节点，配置 CRM Webhook",
      "点击 Execute 按钮测试",
      "检查 CRM 中是否创建了 Lead",
    ],
    errors: [
      "确保 companyName 不为空",
      "businessLineCode 必须对应正确的业务线代码",
      "检查 HTTP Request 配置是否正确",
    ],
  },
];
