import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, UserCheck, FolderKanban, CheckSquare, AlertTriangle,
  TrendingUp, FileText, Award, Clock, ArrowRight, Package, FileEdit, ClipboardList, Sparkles,
} from "lucide-react";
import { LeadSourceLabel, ProjectStatusLabel, QuoteStatusLabel, TaskPriorityLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney, formatEnumLabel } from "@/lib/format";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalLeads,
    totalCustomers,
    totalProjects,
    todayTasks,
    overdueTasks,
    aGradeLeads,
    waitingFeedbackQuotes,
    wonProjects,
    totalProducts,
    totalTemplates,
    totalAIAnalyses,
    leadsByBusinessLine,
    leadsBySource,
    recentLeads,
    recentQuotes,
    projectStatusDistribution,
    todayAndOverdueTasks,
    upcomingTasks,
    businessLineStats,
    recentActivityLogs,
    recentAIAnalyses,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.customer.count(),
    prisma.project.count(),
    prisma.task.count({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.task.count({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: todayStart } },
    }),
    prisma.lead.count({ where: { grade: "A" } }),
    prisma.quote.count({ where: { status: "WAITING_FEEDBACK" } }),
    prisma.project.count({ where: { status: "WON" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.followUpTemplate.count({ where: { isActive: true } }),
    prisma.aIAnalysis.count(),
    prisma.lead.groupBy({ by: ["businessLineId"], _count: { id: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { id: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { businessLine: true } }),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { customer: true, lead: true } }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.task.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lte: todayEnd },
      },
      orderBy: [{ dueDate: "asc" }],
      take: 10,
      include: { lead: true, customer: true, project: true },
    }),
    prisma.task.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: todayStart, lte: sevenDaysLater },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
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
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.aIAnalysis.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const businessLines = await prisma.businessLine.findMany();
  const blMap = new Map(businessLines.map((bl) => [bl.id, bl.name]));

  const targetTypeLabels: Record<string, string> = {
    LEAD: "线索",
    CUSTOMER: "客户",
    PROJECT: "项目",
    FOLLOW_UP: "跟进",
    TEMPLATE: "模板",
  };

  const stats = [
    { label: "总线索数", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/leads" },
    { label: "总客户数", value: totalCustomers, icon: UserCheck, color: "text-green-600", bg: "bg-green-50", href: "/customers" },
    { label: "总项目数", value: totalProjects, icon: FolderKanban, color: "text-purple-600", bg: "bg-purple-50", href: "/projects" },
    { label: "今日待办", value: todayTasks, icon: CheckSquare, color: "text-orange-600", bg: "bg-orange-50", href: "/tasks?filter=today" },
    { label: "逾期任务", value: overdueTasks, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/tasks?filter=overdue" },
    { label: "A级线索", value: aGradeLeads, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", href: "/leads?grade=A" },
    { label: "报价待反馈", value: waitingFeedbackQuotes, icon: FileText, color: "text-yellow-600", bg: "bg-yellow-50", href: "/quotes?status=WAITING_FEEDBACK" },
    { label: "成交项目", value: wonProjects, icon: Award, color: "text-green-600", bg: "bg-green-50", href: "/projects?status=WON" },
    { label: "产品总数", value: totalProducts, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50", href: "/products" },
    { label: "模板总数", value: totalTemplates, icon: FileEdit, color: "text-teal-600", bg: "bg-teal-50", href: "/templates" },
    { label: "AI 分析", value: totalAIAnalyses, icon: Sparkles, color: "text-pink-600", bg: "bg-pink-50", href: "/ai-analyses" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* 今日重点任务和近7天待跟进 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 今日重点任务 */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={20} className="text-orange-500" />
              今日重点任务
            </h2>
            <Link href="/tasks?filter=today" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {todayAndOverdueTasks.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无待办任务</p>
          ) : (
            <div className="space-y-2">
              {todayAndOverdueTasks.map((task) => {
                const overdue = task.dueDate && new Date(task.dueDate) < todayStart;
                return (
                  <div key={task.id} className={`flex items-center justify-between p-2 rounded ${overdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium hover:text-blue-600">
                          {task.title}
                        </Link>
                        {overdue && <Badge label="已逾期" className="bg-red-100 text-red-700" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={formatEnumLabel(task.priority, TaskPriorityLabel)}
                        className={task.priority === "URGENT" ? "bg-red-100 text-red-700" : task.priority === "HIGH" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"} />
                      <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 近7天待跟进 */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={20} className="text-blue-500" />
              近7天待跟进
            </h2>
            <Link href="/tasks?filter=week" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无待跟进任务</p>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div className="flex-1">
                    <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium hover:text-blue-600">
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">
                      {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 按业务线统计和按来源渠道统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 按业务线统计 */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">按业务线统计</h2>
          <div className="space-y-3">
            {businessLineStats.map((bl) => (
              <div key={bl.id} className="border-b pb-3">
                <div className="font-medium mb-2">{bl.name}</div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div><span className="text-gray-500">线索：</span>{bl.leads}</div>
                  <div><span className="text-gray-500">客户：</span>{bl.customers}</div>
                  <div><span className="text-gray-500">项目：</span>{bl.projects}</div>
                  <div><span className="text-gray-500">成交：</span><span className="text-green-600 font-medium">{bl.wonProjects}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 按来源渠道统计 */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">按来源渠道统计线索</h2>
          <div className="space-y-3">
            {leadsBySource.map((item) => (
              <div key={item.source} className="flex items-center justify-between">
                <span className="text-gray-700">{LeadSourceLabel[item.source] || item.source}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, (item._count.id / Math.max(...leadsBySource.map(s => s._count.id), 1)) * 100)}%` }} />
                  </div>
                  <span className="font-medium w-8 text-right">{item._count.id}</span>
                </div>
              </div>
            ))}
            {leadsBySource.length === 0 && (
              <p className="text-gray-400 text-sm">暂无数据</p>
            )}
          </div>
        </div>
      </div>

      {/* 最近新增线索和最近报价 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 最近新增线索 */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近新增线索</h2>
            <Link href="/leads" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无线索</p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div>
                    <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:text-blue-600">{lead.company}</Link>
                    <p className="text-xs text-gray-500">{lead.businessLine.name} · {lead.contactName}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(lead.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近报价 */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近报价</h2>
            <Link href="/quotes" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {recentQuotes.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无报价</p>
          ) : (
            <div className="space-y-2">
              {recentQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div>
                    <Link href={`/quotes/${q.id}`} className="text-sm font-medium hover:text-blue-600">{q.quoteNo}</Link>
                    <p className="text-xs text-gray-500">{q.customer?.company || q.lead?.company || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)}</span>
                    <Badge label={formatEnumLabel(q.status, QuoteStatusLabel)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 项目状态分布 */}
      <div className="bg-white rounded-lg border p-4 mb-8">
        <h2 className="text-lg font-semibold mb-4">项目状态分布</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {projectStatusDistribution.map((item) => (
            <div key={item.status} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{item._count.id}</p>
              <p className="text-sm text-gray-500">{formatEnumLabel(item.status, ProjectStatusLabel)}</p>
            </div>
          ))}
          {projectStatusDistribution.length === 0 && (
            <p className="text-gray-400 text-sm col-span-4 text-center py-4">暂无数据</p>
          )}
        </div>
      </div>

      {/* 最近操作日志 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList size={20} className="text-gray-500" />
            最近操作日志
          </h2>
          <Link href="/activity-logs" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            查看全部 <ArrowRight size={14} />
          </Link>
        </div>
        {recentActivityLogs.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">暂无操作日志</p>
        ) : (
          <div className="space-y-2">
            {recentActivityLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    log.action === "创建" ? "bg-green-100 text-green-700" :
                    log.action === "更新" ? "bg-blue-100 text-blue-700" :
                    log.action === "删除" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-sm">{log.entityType}</span>
                  {log.entityName && <span className="text-sm font-medium">{log.entityName}</span>}
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近 AI 分析 */}
      <div className="bg-white rounded-lg border p-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles size={20} className="text-pink-500" />
            最近 AI 分析
          </h2>
          <Link href="/ai-analyses" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            查看全部 <ArrowRight size={14} />
          </Link>
        </div>
        {recentAIAnalyses.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">暂无 AI 分析记录</p>
        ) : (
          <div className="space-y-2">
            {recentAIAnalyses.map((analysis) => (
              <div key={analysis.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Badge label={targetTypeLabels[analysis.targetType] || analysis.targetType} />
                  <Link href={`/ai-analyses/${analysis.id}`} className="text-sm font-medium hover:text-blue-600">
                    {analysis.title || "未命名分析"}
                  </Link>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(analysis.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Calendar icon component
function Calendar({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
