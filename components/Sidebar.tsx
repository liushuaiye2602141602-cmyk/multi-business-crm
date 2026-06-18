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
  Anchor,
  ClipboardList,
  BookOpen,
  Home,
  Search,
  Upload,
  Download,
  Activity,
  BookMarked,
  UserCog,
  ShoppingCart,
  FolderOpen,
  BarChart3,
  Bot,
  DollarSign,
  Mail,
  Calendar,
  Target,
  Moon,
  Coins,
  BarChart2,
  Inbox,
  Shield,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "工作台",
    items: [
      { href: "/workbench", label: "今日工作台", icon: Home },
      { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
      { href: "/calendar", label: "日程管理", icon: Calendar },
      { href: "/goals", label: "目标追踪", icon: Target },
      { href: "/reports", label: "数据报表", icon: BarChart3 },
      { href: "/search", label: "全局搜索", icon: Search },
    ],
  },
  {
    title: "客户增长",
    items: [
      { href: "/leads", label: "线索池", icon: Users },
      { href: "/customers", label: "客户库", icon: UserCheck },
      { href: "/customers/pool", label: "客户公海", icon: Anchor },
      { href: "/contacts", label: "联系人", icon: UserCog },
      { href: "/projects", label: "商机项目", icon: FolderKanban },
      { href: "/follow-ups", label: "跟进记录", icon: MessageSquare },
      { href: "/customers/dormant", label: "沉睡客户", icon: Moon },
      { href: "/tasks", label: "今日任务", icon: CheckSquare },
    ],
  },
  {
    title: "业务管理",
    items: [
      { href: "/quotes", label: "报价记录", icon: FileText },
      { href: "/orders", label: "订单管理", icon: ShoppingCart },
      { href: "/finance", label: "财务管理", icon: DollarSign },
      { href: "/products", label: "产品目录", icon: Package },
      { href: "/documents", label: "文档资料", icon: FolderOpen },
      { href: "/templates", label: "跟进模板", icon: FileEdit },
      { href: "/business-lines", label: "业务线管理", icon: Briefcase },
      { href: "/currency", label: "汇率计算器", icon: Coins },
    ],
  },
  {
    title: "AI 助手",
    items: [
      { href: "/ai-test", label: "AI 测试", icon: TestTube },
      { href: "/ai-analyses", label: "AI 分析记录", icon: Sparkles },
      { href: "/ai-settings", label: "AI 设置", icon: Settings },
      { href: "/ai-control-panel", label: "AI 控制面板", icon: Shield },
    ],
  },
  {
    title: "外部接入",
    items: [
      { href: "/im-settings", label: "IM 设置", icon: Bot },
      { href: "/im-messages", label: "IM 消息记录", icon: MessageSquare },
      { href: "/email", label: "邮件中心", icon: Mail },
      { href: "/email/accounts", label: "邮箱账号", icon: Mail },
      { href: "/email/inbox", label: "收件箱", icon: Inbox },
      { href: "/email/settings", label: "邮件设置", icon: Settings },
      { href: "/email/stats", label: "邮件统计", icon: BarChart2 },
      { href: "/external-sources", label: "外部来源", icon: Webhook },
      { href: "/webhook-test", label: "Webhook 测试", icon: TestTube },
      { href: "/webhook-logs", label: "Webhook 日志", icon: ClipboardList },
      { href: "/integration-guides", label: "接入指南", icon: BookOpen },
    ],
  },
  {
    title: "系统工具",
    items: [
      { href: "/imports", label: "数据导入", icon: Upload },
      { href: "/exports", label: "数据导出", icon: Download },
      { href: "/settings", label: "系统设置", icon: Settings },
      { href: "/system-health", label: "系统健康检查", icon: Activity },
      { href: "/maintenance-guide", label: "维护指南", icon: BookMarked },
      { href: "/activity-logs", label: "操作日志", icon: ClipboardList },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-slate-900 min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-30">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white tracking-tight">Multi Business CRM</h1>
        <p className="text-xs text-slate-400 mt-0.5">个人多业务外贸 CRM 工作台</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-blue-500/10 text-blue-400 font-medium border-l-2 border-blue-500"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-blue-400" : "text-slate-500"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
          <span>Local / Port 3003</span>
        </div>
      </div>
    </aside>
  );
}
