import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, UserCheck, FolderKanban, Award, TrendingUp,
  FileText, Package, FileEdit, Sparkles, Webhook, ArrowRight,
  CircleDollarSign, Clock, CheckCircle2, AlertTriangle, CheckSquare,
  ShoppingCart, ArrowUpRight,
} from "lucide-react";
import { LeadSourceLabel, LeadStatusLabel, ProjectStatusLabel, QuoteStatusLabel, OrderStatusLabel } from "@/lib/enums";
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
    // Conversion stats
    convertedLeads,
    // Quote stats
    totalQuotes, sentQuotes, acceptedQuotes,
    // Order stats
    totalOrders, completedOrders, revenueResult,
    // Task stats
    todayTasks, overdueTasks, completedTasks, allUnfinishedTasks,
    // Recent activities
    recentLeads, recentQuotes, recentOrders,
    // AI insights
    highScoreLeads, highIntentCustomers,
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
    // Conversion stats
    prisma.lead.count({ where: { convertedCustomerId: { not: null } } }),
    // Quote stats
    prisma.quote.count(),
    prisma.quote.count({ where: { status: { in: ["SENT", "WAITING_FEEDBACK"] } } }),
    prisma.quote.count({ where: { status: "ACCEPTED" } }),
    // Order stats
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: "COMPLETED" } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { orderStatus: { in: ["SHIPPED", "COMPLETED"] } } }),
    // Task stats
    prisma.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: todayStart, lte: todayEnd } } }),
    prisma.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: todayStart } } }),
    prisma.task.count({ where: { status: "COMPLETED" } }),
    prisma.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    // Recent activities
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, company: true, status: true, createdAt: true } }),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, quoteNo: true, status: true, totalPrice: true, createdAt: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, orderNo: true, orderStatus: true, totalAmount: true, createdAt: true } }),
    // AI insights
    prisma.lead.findMany({
      where: { aiScore: { gte: 70 } },
      orderBy: { aiScore: "desc" },
      take: 5,
      select: { id: true, company: true, aiScore: true, aiSummary: true },
    }),
    prisma.customer.findMany({
      where: { lifecycleStage: { in: ["INTENT", "FIRST_DEAL"] } },
      take: 5,
      select: { id: true, company: true, lifecycleStage: true },
    }),
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

  // Derived conversion stats
  const leadToCustomerRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";
  const customerToQuoteRate = totalCustomers > 0 ? ((sentQuotes / totalCustomers) * 100).toFixed(1) : "0.0";
  const quoteToOrderRate = totalQuotes > 0 ? ((completedOrders / totalQuotes) * 100).toFixed(1) : "0.0";
  const totalRevenue = Number(revenueResult._sum.totalAmount || 0);
  const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

  // Format currency
  const formatCurrency = (n: number) => `¥${n.toLocaleString("zh-CN")}`;
  const formatDate = (d: Date) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

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

      {/* 转化漏斗 */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">转化漏斗</h2>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {/* Leads */}
          <div className="flex-1 min-w-[120px] text-center">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{totalLeads}</p>
              <p className="text-xs text-blue-600 mt-1">线索</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-400 shrink-0" />
          {/* Customers */}
          <div className="flex-1 min-w-[120px] text-center">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{totalCustomers}</p>
              <p className="text-xs text-green-600 mt-1">客户</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{leadToCustomerRate}% 转化率</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-400 shrink-0" />
          {/* Quotes */}
          <div className="flex-1 min-w-[120px] text-center">
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{sentQuotes}</p>
              <p className="text-xs text-yellow-600 mt-1">报价 (已发送)</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{customerToQuoteRate}% 转化率</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-400 shrink-0" />
          {/* Orders */}
          <div className="flex-1 min-w-[120px] text-center">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{completedOrders}</p>
              <p className="text-xs text-purple-600 mt-1">完成订单</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{quoteToOrderRate}% 转化率</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 营收统计 & 任务面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 营收统计 */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">营收统计</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/orders" className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200 hover:shadow-md transition-shadow">
              <CircleDollarSign size={20} className="mx-auto text-emerald-600 mb-1" />
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
              <p className="text-[11px] text-emerald-600">总营收</p>
            </Link>
            <Link href="/orders?status=COMPLETED" className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200 hover:shadow-md transition-shadow">
              <ShoppingCart size={20} className="mx-auto text-blue-600 mb-1" />
              <p className="text-lg font-bold text-blue-700">{completedOrders}</p>
              <p className="text-[11px] text-blue-600">完成订单</p>
            </Link>
            <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
              <ArrowUpRight size={20} className="mx-auto text-orange-600 mb-1" />
              <p className="text-lg font-bold text-orange-700">{formatCurrency(avgOrderValue)}</p>
              <p className="text-[11px] text-orange-600">平均订单额</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>报价总数: <span className="font-medium text-gray-700">{totalQuotes}</span></span>
            <span>已接受: <span className="font-medium text-green-600">{acceptedQuotes}</span></span>
            <span>订单总数: <span className="font-medium text-gray-700">{totalOrders}</span></span>
          </div>
        </Card>

        {/* 任务面板 */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">任务概览</h2>
          <div className="grid grid-cols-4 gap-3">
            <Link href="/tasks?filter=today" className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200 hover:shadow-md transition-shadow">
              <Clock size={20} className="mx-auto text-orange-600 mb-1" />
              <p className="text-2xl font-bold text-orange-700">{todayTasks}</p>
              <p className="text-[11px] text-orange-600">今日任务</p>
            </Link>
            <Link href="/tasks?status=PENDING" className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200 hover:shadow-md transition-shadow">
              <CheckSquare size={20} className="mx-auto text-yellow-600 mb-1" />
              <p className="text-2xl font-bold text-yellow-700">{allUnfinishedTasks}</p>
              <p className="text-[11px] text-yellow-600">全部未完成</p>
            </Link>
            <Link href="/tasks?filter=overdue" className="bg-red-50 rounded-lg p-3 text-center border border-red-200 hover:shadow-md transition-shadow">
              <AlertTriangle size={20} className="mx-auto text-red-600 mb-1" />
              <p className="text-2xl font-bold text-red-700">{overdueTasks}</p>
              <p className="text-[11px] text-red-600">已逾期</p>
            </Link>
            <Link href="/tasks?status=COMPLETED" className="bg-green-50 rounded-lg p-3 text-center border border-green-200 hover:shadow-md transition-shadow">
              <CheckCircle2 size={20} className="mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold text-green-700">{completedTasks}</p>
              <p className="text-[11px] text-green-600">已完成</p>
            </Link>
          </div>
        </Card>
      </div>

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近线索 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">最近线索</h2>
            <Link href="/leads" className="text-xs text-blue-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.company || "未命名"}</p>
                  <p className="text-[11px] text-gray-500">{formatDate(lead.createdAt)}</p>
                </div>
                <StatusBadge label={LeadStatusLabel[lead.status] || lead.status} variant="info" />
              </Link>
            ))}
            {recentLeads.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>}
          </div>
        </Card>

        {/* 最近报价 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">最近报价</h2>
            <Link href="/quotes" className="text-xs text-blue-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-2">
            {recentQuotes.map((quote) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{quote.quoteNo}</p>
                  <p className="text-[11px] text-gray-500">{formatDate(quote.createdAt)}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <StatusBadge label={QuoteStatusLabel[quote.status] || quote.status} variant="info" />
                  {quote.totalPrice != null && <p className="text-xs text-gray-600 mt-0.5">{formatCurrency(Number(quote.totalPrice))}</p>}
                </div>
              </Link>
            ))}
            {recentQuotes.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>}
          </div>
        </Card>

        {/* 最近订单 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">最近订单</h2>
            <Link href="/orders" className="text-xs text-blue-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.orderNo}</p>
                  <p className="text-[11px] text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <StatusBadge label={OrderStatusLabel[order.orderStatus] || order.orderStatus} variant="info" />
                  {order.totalAmount != null && <p className="text-xs text-gray-600 mt-0.5">{formatCurrency(Number(order.totalAmount))}</p>}
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无数据</p>}
          </div>
        </Card>
      </div>

      {/* AI 洞察 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 高分线索 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">高意向线索 (AI 评分)</h2>
            <Link href="/leads" className="text-xs text-blue-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-2">
            {highScoreLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.company}</p>
                  {lead.aiSummary && <p className="text-[11px] text-gray-500 truncate">{lead.aiSummary}</p>}
                </div>
                <div className="shrink-0 ml-2 text-right">
                  <span className="text-sm font-bold text-purple-600">{lead.aiScore}</span>
                  <p className="text-[10px] text-gray-500">分</p>
                </div>
              </Link>
            ))}
            {highScoreLeads.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无高分线索，点击 AI 分析按钮生成评分</p>}
          </div>
        </Card>

        {/* 高意向客户 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">高意向客户</h2>
            <Link href="/customers" className="text-xs text-blue-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-2">
            {highIntentCustomers.map((customer) => (
              <Link key={customer.id} href={`/customers/${customer.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{customer.company}</p>
                </div>
                <StatusBadge
                  label={customer.lifecycleStage === "INTENT" ? "有意向" : "首单"}
                  variant={customer.lifecycleStage === "INTENT" ? "warning" : "success"}
                />
              </Link>
            ))}
            {highIntentCustomers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无高意向客户</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
