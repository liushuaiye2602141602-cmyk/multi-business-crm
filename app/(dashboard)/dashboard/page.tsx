import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, UserCheck, FolderKanban, CheckSquare, AlertTriangle,
  TrendingUp, FileText, Award, Clock, ArrowRight, Package, FileEdit,
  ClipboardList, Sparkles, Webhook, Calendar, ExternalLink,
} from "lucide-react";
import { LeadSourceLabel, ProjectStatusLabel, QuoteStatusLabel, TaskPriorityLabel, WebhookStatusLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney, formatEnumLabel } from "@/lib/format";
import { getTaskPriorityVariant, getWebhookStatusVariant, getQuoteStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import Card from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads, totalCustomers, totalProjects,
    todayTasks, overdueTasks, aGradeLeads, waitingFeedbackQuotes, wonProjects,
    totalProducts, totalTemplates, totalAIAnalyses, totalExternalSources,
    todayWebhookSuccess, todayWebhookFailed,
    leadsByBusinessLine, leadsBySource,
    recentLeads, recentQuotes, recentAIAnalyses, recentWebhookLogs,
    todayAndOverdueTasks, upcomingTasks, businessLineStats,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.customer.count(),
    prisma.project.count(),
    prisma.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: todayStart, lte: todayEnd } } }),
    prisma.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: todayStart } } }),
    prisma.lead.count({ where: { grade: "A" } }),
    prisma.quote.count({ where: { status: "WAITING_FEEDBACK" } }),
    prisma.project.count({ where: { status: "WON" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.followUpTemplate.count({ where: { isActive: true } }),
    prisma.aIAnalysis.count(),
    prisma.externalSource.count({ where: { isActive: true } }),
    prisma.webhookLog.count({ where: { status: "SUCCESS", createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.webhookLog.count({ where: { status: { in: ["FAILED", "UNAUTHORIZED"] }, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.groupBy({ by: ["businessLineId"], _count: { id: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { id: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { businessLine: true } }),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { customer: true } }),
    prisma.aIAnalysis.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.webhookLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.task.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lte: todayEnd } },
      orderBy: [{ dueDate: "asc" }],
      take: 8,
      include: { lead: true, customer: true, project: true },
    }),
    prisma.task.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: todayStart, lte: sevenDaysLater } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { lead: true, customer: true, project: true },
    }),
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
  ]);

  const targetTypeLabels: Record<string, string> = { LEAD: "线索", CUSTOMER: "客户", PROJECT: "项目", FOLLOW_UP: "跟进", TEMPLATE: "模板" };

  const coreStats = [
    { label: "总线索", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/leads" },
    { label: "总客户", value: totalCustomers, icon: UserCheck, color: "text-green-600", bg: "bg-green-50", href: "/customers" },
    { label: "总项目", value: totalProjects, icon: FolderKanban, color: "text-purple-600", bg: "bg-purple-50", href: "/projects" },
    { label: "今日待办", value: todayTasks, icon: CheckSquare, color: "text-orange-600", bg: "bg-orange-50", href: "/tasks?filter=today" },
    { label: "逾期任务", value: overdueTasks, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/tasks?filter=overdue" },
    { label: "A级线索", value: aGradeLeads, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", href: "/leads?grade=A" },
    { label: "报价待反馈", value: waitingFeedbackQuotes, icon: FileText, color: "text-yellow-600", bg: "bg-yellow-50", href: "/quotes?status=WAITING_FEEDBACK" },
    { label: "成交项目", value: wonProjects, icon: Award, color: "text-green-600", bg: "bg-green-50", href: "/projects?status=WON" },
  ];

  const systemStats = [
    { label: "产品总数", value: totalProducts, icon: Package, href: "/products" },
    { label: "模板总数", value: totalTemplates, icon: FileEdit, href: "/templates" },
    { label: "AI 分析", value: totalAIAnalyses, icon: Sparkles, href: "/ai-analyses" },
    { label: "外部来源", value: totalExternalSources, icon: Webhook, href: "/external-sources" },
    { label: "今日 Webhook", value: todayWebhookSuccess, icon: CheckSquare, href: "/webhook-logs?status=SUCCESS" },
    { label: "今日失败", value: todayWebhookFailed, icon: AlertTriangle, href: "/webhook-logs?status=FAILED" },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-sm text-gray-500 mt-1">查看线索、客户、项目、任务、AI 和 Webhook 的整体情况</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coreStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 系统能力指标 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-lg border border-gray-200 p-3 text-center hover:shadow-sm transition-shadow">
              <Icon size={18} className="mx-auto text-gray-400 mb-1" />
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* 内容区 - 左右两栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 2/3 宽度 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 今日重点任务 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-orange-500" />
                今日重点任务
              </h2>
              <Link href="/tasks?filter=today" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            {todayAndOverdueTasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无待办任务</p>
            ) : (
              <div className="space-y-2">
                {todayAndOverdueTasks.map((task) => {
                  const overdue = task.dueDate && new Date(task.dueDate) < todayStart;
                  return (
                    <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg ${overdue ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                            {task.title}
                          </Link>
                          {overdue && <StatusBadge label="已逾期" variant="danger" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <StatusBadge label={formatEnumLabel(task.priority, TaskPriorityLabel)} variant={getTaskPriorityVariant(task.priority) as any} />
                        <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 最近新增线索 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">最近新增线索</h2>
              <Link href="/leads" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无线索</p>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{lead.company}</Link>
                      <p className="text-xs text-gray-500">{lead.businessLine.name} · {lead.contactName}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(lead.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 最近报价 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">最近报价</h2>
              <Link href="/quotes" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            {recentQuotes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无报价</p>
            ) : (
              <div className="space-y-2">
                {recentQuotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div>
                      <Link href={`/quotes/${q.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{q.quoteNo}</Link>
                      <p className="text-xs text-gray-500">{q.customer?.company || "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)}</span>
                      <StatusBadge label={formatEnumLabel(q.status, QuoteStatusLabel)} variant={getQuoteStatusVariant(q.status) as any} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 右侧 - 1/3 宽度 */}
        <div className="space-y-6">
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

          {/* 最近 AI 分析 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-pink-500" />
                最近 AI 分析
              </h2>
              <Link href="/ai-analyses" className="text-sm text-blue-600 hover:underline">
                查看全部
              </Link>
            </div>
            {recentAIAnalyses.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无 AI 分析</p>
            ) : (
              <div className="space-y-2">
                {recentAIAnalyses.map((a) => (
                  <div key={a.id} className="p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge label={targetTypeLabels[a.targetType] || a.targetType} variant="info" />
                      <Link href={`/ai-analyses/${a.id}`} className="text-xs font-medium text-gray-900 hover:text-blue-600 truncate">
                        {a.title || "未命名"}
                      </Link>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 最近 Webhook 日志 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Webhook size={18} className="text-green-500" />
                最近 Webhook
              </h2>
              <Link href="/webhook-logs" className="text-sm text-blue-600 hover:underline">
                查看全部
              </Link>
            </div>
            {recentWebhookLogs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无 Webhook 日志</p>
            ) : (
              <div className="space-y-2">
                {recentWebhookLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={WebhookStatusLabel[log.status] || log.status} variant={getWebhookStatusVariant(log.status) as any} />
                      <span className="text-xs text-gray-600">{log.sourceCode || "-"}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
