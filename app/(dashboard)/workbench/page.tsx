import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, UserCheck, FolderKanban, MessageSquare, FileText, CheckSquare,
  Plus, ArrowRight, Sparkles, Webhook, AlertTriangle, Clock,
  TrendingUp, TestTube, ExternalLink,
} from "lucide-react";
import { LeadStatusLabel, LeadGradeLabel, QuoteStatusLabel, TaskPriorityLabel, WebhookStatusLabel, ProjectStatusLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney, formatEnumLabel } from "@/lib/format";
import { getTaskPriorityVariant, getWebhookStatusVariant, getLeadGradeVariant, getLeadStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import Card from "@/components/ui/Card";
import { isAIConfigured } from "@/lib/ai/types";
import ScheduleWidget from "@/components/ScheduleWidget";

export const dynamic = "force-dynamic";

export default async function WorkbenchPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    todayTasks, overdueTasks, recentLeads,
    waitingFeedbackQuotes, activeProjects, recentFollowUps,
    recentAIAnalyses, todayWebhookSuccess, recentWebhookLogs,
    noFollowUpCustomers, calendarEvents,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: todayStart, lte: todayEnd } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 8,
      include: { lead: true, customer: true, project: true },
    }),
    prisma.task.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: todayStart } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { lead: true, customer: true, project: true },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { businessLine: true },
    }),
    prisma.quote.findMany({
      where: { status: { in: ["SENT", "WAITING_FEEDBACK"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true },
    }),
    prisma.project.findMany({
      where: { status: { in: ["NEGOTIATING", "QUOTING", "WAITING_FEEDBACK"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true },
    }),
    prisma.followUp.findMany({
      orderBy: { followUpDate: "desc" },
      take: 8,
      include: { lead: true, customer: true },
    }),
    prisma.aIAnalysis.findMany({
      where: { nextAction: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.webhookLog.count({
      where: { status: "SUCCESS", createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.webhookLog.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // 7天未跟进的客户
    prisma.customer.findMany({
      where: {
        customerStatus: { in: ["ACTIVE", "POTENTIAL"] },
        followUps: {
          none: {
            followUpDate: { gte: sevenDaysAgo },
          },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 5,
      include: { businessLine: true },
    }),
    // Calendar events (next 30 days)
    prisma.calendarEvent.findMany({
      where: {
        startTime: {
          gte: todayStart,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startTime: "asc" },
      take: 20,
      select: { id: true, title: true, startTime: true, eventType: true },
    }),
  ]);

  const aiConfigured = isAIConfigured();
  const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const quickActions = [
    { label: "新增线索", href: "/leads/new", icon: Users, color: "bg-blue-50 text-blue-600 border-blue-200" },
    { label: "新增客户", href: "/customers/new", icon: UserCheck, color: "bg-green-50 text-green-600 border-green-200" },
    { label: "新增项目", href: "/projects/new", icon: FolderKanban, color: "bg-purple-50 text-purple-600 border-purple-200" },
    { label: "新增跟进", href: "/follow-ups/new", icon: MessageSquare, color: "bg-orange-50 text-orange-600 border-orange-200" },
    { label: "新增报价", href: "/quotes/new", icon: FileText, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    { label: "Webhook 测试", href: "/webhook-test", icon: TestTube, color: "bg-teal-50 text-teal-600 border-teal-200" },
    { label: "AI 测试", href: "/ai-test", icon: Sparkles, color: "bg-pink-50 text-pink-600 border-pink-200" },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">今日工作台</h1>
          <p className="text-sm text-gray-500 mt-1">集中查看今天的客户跟进、线索处理、报价反馈和 AI 建议</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{dateStr}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs ${aiConfigured ? "text-green-600" : "text-yellow-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aiConfigured ? "bg-green-500" : "bg-yellow-500"}`} />
              {aiConfigured ? "AI 已配置" : "AI 未配置"}
            </span>
            <span className="text-xs text-gray-400">Local · 3003</span>
          </div>
        </div>
      </div>

      {/* 日程 + 快捷操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 日程模块 */}
        <div className="lg:col-span-1">
          <ScheduleWidget
            events={calendarEvents.map((e) => ({
              id: e.id,
              title: e.title,
              start: e.startTime.toISOString(),
              type: e.eventType || "default",
            }))}
          />
        </div>

        {/* 快捷操作 */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:shadow-sm ${action.color}`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/projects/pipeline" className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <FolderKanban size={18} className="text-purple-500" />
          <span className="text-sm font-medium">商机漏斗</span>
        </Link>
        <Link href="/leads?grade=A" className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <TrendingUp size={18} className="text-green-500" />
          <span className="text-sm font-medium">A级线索</span>
        </Link>
        <Link href="/tasks?filter=overdue" className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <AlertTriangle size={18} className="text-red-500" />
          <span className="text-sm font-medium">逾期任务</span>
        </Link>
        <Link href="/quotes?status=WAITING_FEEDBACK" className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <FileText size={18} className="text-yellow-500" />
          <span className="text-sm font-medium">待反馈报价</span>
        </Link>
      </div>

      {/* 今日重点 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日待办任务 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckSquare size={18} className="text-orange-500" />
              今日待办任务
              {todayTasks.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  {todayTasks.length}
                </span>
              )}
            </h2>
            <Link href="/tasks?filter=today" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">今日暂无待办任务</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <StatusBadge label={formatEnumLabel(task.priority, TaskPriorityLabel)} variant={getTaskPriorityVariant(task.priority)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 逾期任务 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              逾期任务
              {overdueTasks.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  {overdueTasks.length}
                </span>
              )}
            </h2>
            <Link href="/tasks?filter=overdue" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无逾期任务</p>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex-1 min-w-0">
                    <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium text-red-900 hover:text-red-600 truncate block">
                      {task.title}
                    </Link>
                    <p className="text-xs text-red-600 mt-0.5">
                      {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                    </p>
                  </div>
                  <span className="text-xs text-red-500">{formatDate(task.dueDate)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 最近新增线索 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            最近新增线索
          </h2>
          <Link href="/leads" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            查看全部 <ArrowRight size={14} />
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">暂无线索</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">公司</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">联系人</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">业务线</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">来源</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">等级</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">创建时间</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">{lead.company}</Link>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{lead.contactName}</td>
                    <td className="py-2 px-3 text-gray-600">{lead.businessLine.name}</td>
                    <td className="py-2 px-3 text-gray-600">{LeadStatusLabel[lead.source] || lead.source}</td>
                    <td className="py-2 px-3">
                      <StatusBadge label={LeadGradeLabel[lead.grade] || lead.grade} variant={getLeadGradeVariant(lead.grade)} />
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge label={LeadStatusLabel[lead.status] || lead.status} variant={getLeadStatusVariant(lead.status)} />
                    </td>
                    <td className="py-2 px-3 text-gray-500">{formatDate(lead.createdAt)}</td>
                    <td className="py-2 px-3 text-right">
                      <Link href={`/leads/${lead.id}`} className="text-blue-600 hover:underline text-xs">查看</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 销售过程 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 报价待反馈 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              报价待反馈
            </h2>
            <Link href="/quotes?status=WAITING_FEEDBACK" className="text-sm text-blue-600 hover:underline">
              查看全部
            </Link>
          </div>
          {waitingFeedbackQuotes.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无待反馈报价</p>
          ) : (
            <div className="space-y-2">
              {waitingFeedbackQuotes.map((q) => (
                <div key={q.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Link href={`/quotes/${q.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block">
                    {q.quoteNo}
                  </Link>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{q.customer?.company || "-"}</span>
                    <span className="text-xs font-medium">{formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 重点商机项目 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FolderKanban size={18} className="text-purple-500" />
              重点商机项目
            </h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline">
              查看全部
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无进行中的项目</p>
          ) : (
            <div className="space-y-2">
              {activeProjects.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Link href={`/projects/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block">
                    {p.name}
                  </Link>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{p.customer.company}</span>
                    <StatusBadge label={ProjectStatusLabel[p.status] || p.status} variant="info" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 最近跟进 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-orange-500" />
              最近跟进
            </h2>
            <Link href="/follow-ups" className="text-sm text-blue-600 hover:underline">
              查看全部
            </Link>
          </div>
          {recentFollowUps.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无跟进记录</p>
          ) : (
            <div className="space-y-2">
              {recentFollowUps.map((fu) => (
                <div key={fu.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {fu.customer?.company || fu.lead?.company || "-"}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(fu.followUpDate)}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{fu.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 7天未跟进客户 */}
      {noFollowUpCustomers.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-yellow-500" />
              7天未跟进客户
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                {noFollowUpCustomers.length}
              </span>
            </h2>
            <Link href="/customers" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {noFollowUpCustomers.map((customer) => (
              <div key={customer.id} className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block">
                  {customer.company}
                </Link>
                <p className="text-xs text-gray-500 mt-1">
                  {customer.country || "-"} · {customer.businessLine.name}
                </p>
                <Link href={`/follow-ups/new?customerId=${customer.id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                  + 新建跟进
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 智能辅助和外部接入 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近 AI 分析 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-pink-500" />
              最近 AI 分析
            </h2>
            <Link href="/ai-analyses" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {recentAIAnalyses.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无 AI 分析记录</p>
          ) : (
            <div className="space-y-2">
              {recentAIAnalyses.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <Link href={`/ai-analyses/${a.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                      {a.title || "未命名分析"}
                    </Link>
                    <span className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                  </div>
                  {a.nextAction && <p className="text-xs text-gray-600 truncate">建议：{a.nextAction}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 今日 Webhook */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Webhook size={18} className="text-teal-500" />
              今日 Webhook 新线索
              {todayWebhookSuccess > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {todayWebhookSuccess}
                </span>
              )}
            </h2>
            <Link href="/webhook-logs" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {recentWebhookLogs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">今日暂无 Webhook 记录</p>
          ) : (
            <div className="space-y-2">
              {recentWebhookLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={WebhookStatusLabel[log.status] || log.status} variant={getWebhookStatusVariant(log.status)} />
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
  );
}

