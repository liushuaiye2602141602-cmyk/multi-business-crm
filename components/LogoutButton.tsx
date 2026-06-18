"use client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="退出登录">
      <LogOut size={16} />
    </button>
  );
}
