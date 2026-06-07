import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, UserCheck, FolderKanban, Award, TrendingUp,
  FileText, Package, FileEdit, Sparkles, Webhook, ArrowRight,
} from "lucide-react";
import { LeadSourceLabel, ProjectStatusLabel } from "@/lib/enums";
import { formatEnumLabel } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";
import Card from "@/components/ui/Card";
import StatCard from "@/components/StatCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [
    totalLeads, totalCustomers, totalProjects,
    aGradeLeads, waitingFeedbackQuotes, wonProjects,
    totalProducts, totalTemplates, totalAIAnalyses, totalExternalSources,
    todayWebhookSuccess,
    leadsBySource, businessLineStats, projectStatusDistribution,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.customer.count(),
    prisma.project.count(),
    prisma.lead.count({ where: { grade: "A" } }),
    prisma.quote.count({ where: { status: "WAITING_FEEDBACK" } }),
    prisma.project.count({ where: { status: "WON" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.followUpTemplate.count({ where: { isActive: true } }),
    prisma.aIAnalysis.count(),
    prisma.externalSource.count({ where: { isActive: true } }),
    prisma.webhookLog.count({ where: { status: "SUCCESS", createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.groupBy({ by: ["source"], _count: { id: true } }),
    Promise.all(
      (await prisma.businessLine.findMany()).map(async (bl) => {
        const [leads, customers, projects, wonProjects] = await Promise.all([
          prisma.lead.count({ where: { businessLineId: bl.id } }),
          prisma.customer.count({ where: { businessLineId: bl.id } }),
          prisma.project.count({ where: { businessLineId: bl.id } }),
          prisma.project.count({ where: { businessLineId: bl.id, status: "WON" } }),
        ]);
        return { ...bl, leads, customers, projects, wonProjects };
      })
    ),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const coreStats = [
    { label: "总线索", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/leads" },
    { label: "总客户", value: totalCustomers, icon: UserCheck, color: "text-green-600", bg: "bg-green-50", href: "/customers" },
    { label: "总项目", value: totalProjects, icon: FolderKanban, color: "text-purple-600", bg: "bg-purple-50", href: "/projects" },
    { label: "成交项目", value: wonProjects, icon: Award, color: "text-green-600", bg: "bg-green-50", href: "/projects?status=WON" },
    { label: "报价待反馈", value: waitingFeedbackQuotes, icon: FileText, color: "text-yellow-600", bg: "bg-yellow-50", href: "/quotes?status=WAITING_FEEDBACK" },
    { label: "A级线索", value: aGradeLeads, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", href: "/leads?grade=A" },
    { label: "AI 分析", value: totalAIAnalyses, icon: Sparkles, color: "text-pink-600", bg: "bg-pink-50", href: "/ai-analyses" },
    { label: "今日 Webhook", value: todayWebhookSuccess, icon: Webhook, color: "text-teal-600", bg: "bg-teal-50", href: "/webhook-logs?status=SUCCESS" },
  ];

  const systemStats = [
    { label: "产品总数", value: totalProducts, icon: Package, href: "/products" },
    { label: "模板总数", value: totalTemplates, icon: FileEdit, href: "/templates" },
    { label: "外部来源", value: totalExternalSources, icon: Webhook, href: "/external-sources" },
  ];

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-sm text-gray-500 mt-1">查看线索、客户、项目、AI 和外部接入的整体数据表现</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coreStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* 系统指标 */}
      <div className="grid grid-cols-3 gap-3">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 text-center hover:shadow-md transition-shadow">
              <Icon size={18} className="mx-auto text-gray-400 mb-1" />
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* 统计区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 按业务线统计 */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">按业务线统计</h2>
          <div className="space-y-4">
            {businessLineStats.map((bl) => (
              <div key={bl.id} className="pb-3 border-b border-gray-100 last:border-0">
                <p className="font-medium text-sm text-gray-900 mb-2">{bl.name}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">线索</span><span className="font-medium">{bl.leads}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">客户</span><span className="font-medium">{bl.customers}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">项目</span><span className="font-medium">{bl.projects}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">成交</span><span className="font-medium text-green-600">{bl.wonProjects}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 按来源渠道统计 */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">按来源渠道统计</h2>
          <div className="space-y-3">
            {leadsBySource.map((item) => (
              <div key={item.source} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{LeadSourceLabel[item.source] || item.source}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (item._count.id / Math.max(...leadsBySource.map(s => s._count.id), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium w-6 text-right">{item._count.id}</span>
                </div>
              </div>
            ))}
            {leadsBySource.length === 0 && <p className="text-sm text-gray-400">暂无数据</p>}
          </div>
        </Card>

        {/* 项目状态分布 */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">项目状态分布</h2>
          <div className="space-y-3">
            {projectStatusDistribution.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <StatusBadge label={ProjectStatusLabel[item.status] || item.status} variant="info" />
                <span className="text-sm font-medium">{item._count.id}</span>
              </div>
            ))}
            {projectStatusDistribution.length === 0 && <p className="text-sm text-gray-400">暂无数据</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
