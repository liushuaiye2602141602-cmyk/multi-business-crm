"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteButtonProps {
  action: (formData: FormData) => Promise<any>;
  confirmMessage?: string;
  buttonText?: string;
  pendingText?: string;
}

export default function ConfirmDeleteButton({
  action,
  confirmMessage = "确定要删除这条记录吗？此操作不可恢复。",
  buttonText = "删除",
  pendingText = "删除中...",
}: ConfirmDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(new FormData());
        if (result && !result.success) {
          setError(result.error || "操作失败");
        } else {
          window.location.reload();
        }
      } catch (e) {
        setError("操作失败，请稍后重试");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
        title={isPending ? pendingText : buttonText}
      >
        <Trash2 size={16} />
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
