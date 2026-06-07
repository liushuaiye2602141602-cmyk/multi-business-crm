"use client";

import { useState } from "react";
import { Upload, Download, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Card from "./ui/Card";

interface ImportSectionProps {
  title: string;
  description: string;
  importUrl: string;
  templateUrl?: string;
  templateFields: string;
}

export default function ImportSection({
  title,
  description,
  importUrl,
  templateUrl,
  templateFields,
}: ImportSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    skipped: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(importUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "导入失败");
      }
    } catch {
      setError("导入失败，请检查网络连接");
    } finally {
      setIsLoading(false);
    }
  }

  function downloadTemplate() {
    const headers = templateFields.split(",");
    const csv = [headers.join(","), headers.map(() => "").join(",")].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}_模板.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download size={16} />
          下载模板
        </button>
        <span className="text-xs text-gray-400">字段: {templateFields}</span>
      </div>

      <form onSubmit={handleImport} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">选择 CSV 文件</label>
          <input
            name="file"
            type="file"
            accept=".csv"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 h-10"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              导入中...
            </>
          ) : (
            <>
              <Upload size={16} />
              开始导入
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-sm mb-2">导入结果：</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600 flex items-center gap-2">
              <CheckCircle size={14} />
              成功：{result.success} 条
            </p>
            <p className="text-yellow-600 flex items-center gap-2">
              <AlertTriangle size={14} />
              跳过重复：{result.skipped} 条
            </p>
            <p className="text-red-600 flex items-center gap-2">
              <XCircle size={14} />
              失败：{result.failed} 条
            </p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">错误详情：</p>
              <ul className="text-xs text-red-500 space-y-0.5">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {result.success > 0 && (
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              刷新页面查看导入的数据
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
