"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderKanban,
  MessageSquare,
  FileText,
  CheckSquare,
  Briefcase,
  Package,
  FileEdit,
  Sparkles,
  TestTube,
  Settings,
  Webhook,
  ClipboardList,
  BookOpen,
  Workflow,
  Map,
  ListChecks,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "核心 CRM",
    items: [
      { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
      { href: "/leads", label: "线索池", icon: Users },
      { href: "/customers", label: "客户库", icon: UserCheck },
      { href: "/projects", label: "项目管理", icon: FolderKanban },
      { href: "/follow-ups", label: "跟进记录", icon: MessageSquare },
      { href: "/quotes", label: "报价记录", icon: FileText },
      { href: "/tasks", label: "今日任务", icon: CheckSquare },
    ],
  },
  {
    title: "业务资料",
    items: [
      { href: "/business-lines", label: "业务线管理", icon: Briefcase },
      { href: "/products", label: "产品目录", icon: Package },
      { href: "/templates", label: "跟进模板", icon: FileEdit },
    ],
  },
  {
    title: "AI 助手",
    items: [
      { href: "/ai-test", label: "AI 测试", icon: TestTube },
      { href: "/ai-analyses", label: "AI 分析记录", icon: Sparkles },
      { href: "/ai-settings", label: "AI 设置", icon: Settings },
    ],
  },
  {
    title: "外部接入",
    items: [
      { href: "/external-sources", label: "外部来源", icon: Webhook },
      { href: "/webhook-test", label: "Webhook 测试", icon: TestTube },
      { href: "/webhook-logs", label: "Webhook 日志", icon: ClipboardList },
      { href: "/integration-guides", label: "接入指南", icon: BookOpen },
      { href: "/integration-guides/n8n-templates", label: "n8n 模板", icon: Workflow },
      { href: "/integration-guides/n8n-debug-checklist", label: "n8n 调试清单", icon: ListChecks },
      { href: "/integration-guides/lead-field-mapping", label: "字段映射规范", icon: Map },
    ],
  },
  {
    title: "系统",
    items: [
      { href: "/activity-logs", label: "操作日志", icon: ClipboardList },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 min-h-screen flex flex-col fixed left-0 top-0 bottom-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Multi Business CRM</h1>
        <p className="text-xs text-gray-500 mt-1">个人多业务外贸系统</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Local / Port 3003</span>
        </div>
      </div>
    </aside>
  );
}
