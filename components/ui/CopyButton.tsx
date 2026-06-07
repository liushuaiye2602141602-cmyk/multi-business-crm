"use client";

import { useState, ReactNode } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  icon?: ReactNode;
  size?: "sm" | "md";
}

export default function CopyButton({ text, label, icon, size = "sm" }: CopyButtonProps) {
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
      className={`inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      {copied ? (
        <>
          <Check size={size === "sm" ? 14 : 16} />
          {label && <span>已复制</span>}
        </>
      ) : (
        <>
          {icon || <Copy size={size === "sm" ? 14 : 16} />}
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
