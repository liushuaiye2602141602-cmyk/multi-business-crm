"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

interface CsvImportButtonProps {
  importUrl: string;
  label: string;
  businessLineId?: string;
}

export default function CsvImportButton({ importUrl, label, businessLineId }: CsvImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number; failed: number; errors?: string[] } | null>(null);

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsImporting(true);
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
        if (data.success > 0) {
          window.location.reload();
        }
      } else {
        setResult({ success: 0, skipped: 0, failed: 0, errors: [data.error || "导入失败"] });
      }
    } catch {
      setResult({ success: 0, skipped: 0, failed: 0, errors: ["导入失败，请检查网络连接"] });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        <Upload size={16} />
        {label}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{label}</h2>

            <form onSubmit={handleImport}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择 CSV 文件
                </label>
                <input
                  name="file"
                  type="file"
                  accept=".csv"
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!businessLineId && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    默认业务线（CSV 中未指定时使用）
                  </label>
                  <input
                    name="businessLineId"
                    type="text"
                    placeholder="输入业务线 ID"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {businessLineId && (
                <input name="businessLineId" type="hidden" value={businessLineId} />
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isImporting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isImporting ? "导入中..." : "开始导入"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setResult(null); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>

            {result && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">导入结果：</p>
                <p className="text-green-600">成功：{result.success} 条</p>
                <p className="text-yellow-600">跳过重复：{result.skipped} 条</p>
                <p className="text-red-600">失败：{result.failed} 条</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-600">错误详情：</p>
                    <ul className="text-sm text-red-500 list-disc list-inside">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
