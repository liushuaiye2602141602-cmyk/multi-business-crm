"use client";

import PageHeader from "@/components/PageHeader";
import { Copy, Check, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

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

const checklist = [
  {
    category: "基础环境",
    items: [
      {
        check: "CRM 是否正在运行",
        command: "访问 http://localhost:3003",
        solution: "如果无法访问，运行 npm run dev",
      },
      {
        check: "Docker PostgreSQL 是否运行",
        command: "docker ps",
        solution: "如果未运行，docker start multi-business-crm-postgres",
      },
      {
        check: "ExternalSource 是否已创建并启用",
        command: "访问 /external-sources 查看列表",
        solution: "如果未创建，在 /external-sources/new 新增",
      },
      {
        check: "API Key 是否已生成",
        command: "在 ExternalSource 详情页查看",
        solution: "如果未配置，点击生成 API Key",
      },
    ],
  },
  {
    category: "n8n HTTP Request 配置",
    items: [
      {
        check: "URL 是否正确",
        command: "http://localhost:3003/api/webhooks/leads",
        solution: "检查端口和路径",
      },
      {
        check: "Header Content-Type",
        command: "Content-Type: application/json",
        solution: "必须设置",
      },
      {
        check: "Header x-crm-source-code",
        command: "x-crm-source-code: your-source-code",
        solution: "使用 ExternalSource 中的 code",
      },
      {
        check: "Header x-crm-api-key",
        command: "x-crm-api-key: crm_sk_xxxxx",
        solution: "使用生成时复制的 API Key",
      },
    ],
  },
  {
    category: "JSON Body 验证",
    items: [
      {
        check: "companyName 是否存在",
        command: '{"companyName": "Company Name", ...}',
        solution: "companyName 是必填字段",
      },
      {
        check: "businessLineCode 是否正确",
        command: "flexible-packaging / packaging-machinery / wooden-crafts",
        solution: "必须对应正确的业务线代码",
      },
      {
        check: "email 格式是否正确",
        command: '{"email": "user@example.com"}',
        solution: "用于重复检测",
      },
    ],
  },
  {
    category: "常见错误排查",
    items: [
      {
        check: "返回 401",
        command: '{"error": "Invalid API key"}',
        solution: "检查 x-crm-source-code 和 x-crm-api-key",
      },
      {
        check: "返回 400",
        command: '{"error": "companyName is required"}',
        solution: "检查 companyName 和 businessLineCode",
      },
      {
        check: "返回 duplicate",
        command: '{"status": "duplicate", "leadId": 123}',
        solution: "重复检测正常，该邮箱已存在线索",
      },
      {
        check: "CRM 没收到线索",
        command: "查看 /webhook-logs",
        solution: "检查 Webhook 日志排查问题",
      },
    ],
  },
];

export default function N8nDebugChecklistPage() {
  const curlExample = `curl -X POST http://localhost:3003/api/webhooks/leads \\
  -H "Content-Type: application/json" \\
  -H "x-crm-source-code: your-source-code" \\
  -H "x-crm-api-key: crm_sk_xxxxx" \\
  -d '{"companyName": "Test Company", "name": "Test User", "businessLineCode": "flexible-packaging"}'`;

  return (
    <div>
      <PageHeader title="n8n 接入 CRM 调试检查清单" backHref="/integration-guides" />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800">
          如果 n8n 工作流无法正常推送到 CRM，请按以下清单逐项检查。
        </p>
      </div>

      <div className="space-y-6">
        {checklist.map((section) => (
          <div key={section.category} className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">{section.category}</h2>
            <div className="space-y-4">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.check}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{item.command}</p>
                    <p className="text-xs text-blue-600 mt-1">{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 快速测试命令 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">快速测试命令</h2>
          <p className="text-sm text-gray-600 mb-3">
            使用以下 cURL 命令快速测试 CRM Webhook 是否正常：
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">cURL 测试命令</span>
            <CopyButton text={curlExample} label="复制 cURL" />
          </div>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
            {curlExample}
          </pre>
        </div>

        {/* 常见错误详解 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">常见错误详解</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <p className="font-medium text-green-700">200/201 - 成功</p>
              <p className="text-sm text-gray-600">线索已成功创建，可以去 Lead 查看。</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="font-medium text-yellow-700">200 - duplicate</p>
              <p className="text-sm text-gray-600">系统检测到重复线索，请检查已有 Lead。</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <p className="font-medium text-red-700">401 - Unauthorized</p>
              <p className="text-sm text-gray-600">检查 x-crm-source-code 和 x-crm-api-key 是否正确。</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <p className="font-medium text-red-700">400 - Bad Request</p>
              <p className="text-sm text-gray-600">检查 companyName、businessLineCode 等必填字段。</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <p className="font-medium text-red-700">500 - Server Error</p>
              <p className="text-sm text-gray-600">检查 CRM 服务状态和服务器日志。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
