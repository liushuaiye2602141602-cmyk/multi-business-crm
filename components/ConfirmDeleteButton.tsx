"use client";

import { Trash2 } from "lucide-react";

interface ConfirmDeleteButtonProps {
  action: () => void;
  message?: string;
}

export default function ConfirmDeleteButton({
  action,
  message = "确定要删除这条记录吗？此操作不可恢复。",
}: ConfirmDeleteButtonProps) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        onClick={(e) => {
          if (!confirm(message)) {
            e.preventDefault();
          }
        }}
        title="删除"
      >
        <Trash2 size={16} />
      </button>
    </form>
  );
}
