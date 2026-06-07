"use client";

import { useState } from "react";
import { Key, RefreshCw, Copy, Check, AlertTriangle } from "lucide-react";
import { generateApiKeyForSource } from "@/app/(dashboard)/external-sources/actions";

interface GenerateApiKeyButtonProps {
  sourceId: number;
  hasExistingKey: boolean;
}

export default function GenerateApiKeyButton({ sourceId, hasExistingKey }: GenerateApiKeyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateApiKeyForSource(sourceId);
      if (result.apiKey) {
        setApiKey(result.apiKey);
      } else {
        setError("生成失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  }

  async function handleCopy() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = apiKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (apiKey) {
    return (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium mb-2">API Key 已生成（仅显示一次）</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white p-2 rounded text-sm break-all">{apiKey}</code>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-500 hover:text-blue-600"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-green-700 text-xs mt-2">
            请立即复制保存，关闭页面后将无法再次查看。
          </p>
        </div>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
          <div>
            <p className="text-yellow-800 font-medium">确认重新生成？</p>
            <p className="text-yellow-700 text-sm">旧 API Key 将立即失效。</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            {isLoading ? "生成中..." : "确认生成"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => {
          if (hasExistingKey) {
            setShowConfirm(true);
          } else {
            handleGenerate();
          }
        }}
        disabled={isLoading}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {hasExistingKey ? <RefreshCw size={16} /> : <Key size={16} />}
        {hasExistingKey ? "重新生成 API Key" : "生成 API Key"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
