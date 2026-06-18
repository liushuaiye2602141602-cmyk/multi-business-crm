"use client";

import { useState, useTransition } from "react";

interface ClaimButtonProps {
  customerId: number;
  company: string;
  onClaim: (customerId: number, ownerName: string) => Promise<void>;
}

export default function ClaimButton({ customerId, company, onClaim }: ClaimButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClaim() {
    if (!ownerName.trim()) {
      setError("请输入认领人姓名");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await onClaim(customerId, ownerName.trim());
        setShowDialog(false);
        setOwnerName("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "认领失败");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
      >
        认领
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">认领客户</h3>
            <p className="text-sm text-gray-500 mb-4">
              确定认领 <span className="font-medium text-gray-700">{company}</span> 吗？
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">认领人姓名</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="请输入您的姓名"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDialog(false); setOwnerName(""); setError(""); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClaim}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "认领中..." : "确认认领"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
