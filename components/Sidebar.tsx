"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  FolderKanban,
  MessageSquare,
  FileText,
  CheckSquare,
  Package,
  FileEdit,
  ClipboardList,
  Sparkles,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/business-lines", label: "业务线", icon: Briefcase },
  { href: "/leads", label: "线索", icon: Users },
  { href: "/customers", label: "客户", icon: UserCheck },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/follow-ups", label: "跟进记录", icon: MessageSquare },
  { href: "/quotes", label: "报价", icon: FileText },
  { href: "/tasks", label: "任务", icon: CheckSquare },
  { href: "/products", label: "产品目录", icon: Package },
  { href: "/templates", label: "跟进模板", icon: FileEdit },
  { href: "/ai-analyses", label: "AI 分析记录", icon: Sparkles },
  { href: "/ai-test", label: "AI 测试", icon: Sparkles },
  { href: "/ai-settings", label: "AI 设置", icon: Settings },
  { href: "/activity-logs", label: "操作日志", icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">多业务线 CRM</h1>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
