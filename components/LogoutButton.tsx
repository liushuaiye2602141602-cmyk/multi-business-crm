"use client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  // Single-user mode: no logout functionality needed
  // Redirect to dashboard instead
  function handleClick() {
    window.location.href = "/dashboard";
  }

  return (
    <button onClick={handleClick} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="返回主页">
      <LogOut size={16} />
    </button>
  );
}
