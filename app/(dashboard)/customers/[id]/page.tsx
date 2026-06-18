import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, Plus, ArrowLeft, Mail, Phone, Globe, MapPin, Building, Calendar, TrendingUp, FileText, MessageSquare, CheckSquare, Sparkles, Clock } from "lucide-react";
import { CustomerStatusLabel, CustomerTypeLabel, LeadSourceLabel, LeadGradeLabel, ProjectStatusLabel, QuoteStatusLabel, TaskStatusLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney, formatEnumLabel } from "@/lib/format";
import { getCustomerStatusVariant, getLeadGradeVariant, getProjectStatusVariant, getQuoteStatusVariant, getTaskStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import { DetailSection } from "@/components/ui/DetailField";
import { reviewCustomer, appendToCustomerNotes, createTaskFromAI } from "@/lib/ai/actions";
import { isAIConfigured } from "@/lib/ai/types";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { addCustomerActivity } from "../actions";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = parseInt(id);

  const [customer, latestAnalysis, recentActivityLogs, activities] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        businessLine: true,
        projects: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { quotes: true, followUps: true, tasks: true } } } },
        followUps: { orderBy: { followUpDate: "desc" }, take: 10 },
        quotes: { orderBy: { createdAt: "desc" }, take: 10 },
        tasks: { orderBy: { dueDate: "asc" }, where: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
        convertedFrom: true,
      },
    }),
    prisma.aIAnalysis.findFirst({
      where: { targetType: "CUSTOMER", targetId: customerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activityLog.findMany({
      where: {
        OR: [
          { entityId: String(customerId), entityType: "客户" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.customerActivity.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!customer) return notFound();

  const aiConfigured = isAIConfigured();

  // 计算客户健康度
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const lastFollowUp = customer.followUps[0];
  const hasRecentFollowUp = lastFollowUp && new Date(lastFollowUp.followUpDate) > sevenDaysAgo;
  const hasActiveProject = customer.projects.some(p => ["REQUIREMENT_CONFIRMING", "QUOTING", "SAMPLE_TESTING", "WAITING_FEEDBACK", "NEGOTIATING"].includes(p.status));
  const hasWaitingQuote = customer.quotes.some(q => ["SENT", "WAITING_FEEDBACK"].includes(q.status));
  const hasOverdueTask = customer.tasks.some(t => t.dueDate && new Date(t.dueDate) < now);
  const noFollowUp30Days = !lastFollowUp || new Date(lastFollowUp.followUpDate) < thirtyDaysAgo;

  let healthScore = 50;
  if (["A", "B"].includes(customer.leadGrade)) healthScore += 20;
  if (hasRecentFollowUp) healthScore += 15;
  if (hasActiveProject) healthScore += 15;
  if (hasWaitingQuote) healthScore += 10;
  if (hasOverdueTask) healthScore -= 20;
  if (noFollowUp30Days) healthScore -= 25;

  let healthStatus = "";
  let healthColor = "";
  let healthBg = "";
  if (healthScore >= 80) { healthStatus = "高价值活跃客户"; healthColor = "text-green-700"; healthBg = "bg-green-50 border-green-200"; }
  else if (healthScore >= 60) { healthStatus = "有潜力客户"; healthColor = "text-blue-700"; healthBg = "bg-blue-50 border-blue-200"; }
  else if (healthScore >= 40) { healthStatus = "需要跟进客户"; healthColor = "text-yellow-700"; healthBg = "bg-yellow-50 border-yellow-200"; }
  else if (healthScore >= 20) { healthStatus = "冷淡客户"; healthColor = "text-orange-700"; healthBg = "bg-orange-50 border-orange-200"; }
  else { healthStatus = "风险客户"; healthColor = "text-red-700"; healthBg = "bg-red-50 border-red-200"; }

  // 商机统计
  const projectStats = {
    total: customer.projects.length,
    active: customer.projects.filter(p => ["REQUIREMENT_CONFIRMING", "QUOTING", "SAMPLE_TESTING", "WAITING_FEEDBACK", "NEGOTIATING"].includes(p.status)).length,
    won: customer.projects.filter(p => p.status === "WON").length,
    lost: customer.projects.filter(p => p.status === "LOST").length,
    totalAmount: customer.projects.reduce((sum, p) => sum + (p.amount ? Number(p.amount) : 0), 0),
  };

  // 报价统计
  const quoteStats = {
    total: customer.quotes.length,
    sent: customer.quotes.filter(q => q.status === "SENT").length,
    waiting: customer.quotes.filter(q => q.status === "WAITING_FEEDBACK").length,
    accepted: customer.quotes.filter(q => q.status === "ACCEPTED").length,
    rejected: customer.quotes.filter(q => q.status === "REJECTED").length,
    totalAmount: customer.quotes.reduce((sum, q) => sum + (q.totalPrice ? Number(q.totalPrice) : 0), 0),
  };

  // 下次跟进
  const nextTask = customer.tasks.find(t => t.dueDate && new Date(t.dueDate) > now);
  const nextFollowUp = customer.followUps.find(f => f.nextFollowUpDate && new Date(f.nextFollowUpDate) > now);

  // 构建时间线
  const timeline: Array<{
    date: Date;
    type: string;
    title: string;
    content: string;
    href?: string;
  }> = [];

  customer.followUps.forEach(fu => {
    timeline.push({
      date: new Date(fu.followUpDate),
      type: "跟进",
      title: `${fu.method} 跟进`,
      content: fu.content.slice(0, 100),
      href: `/follow-ups/${fu.id}`,
    });
  });

  customer.quotes.forEach(q => {
    timeline.push({
      date: new Date(q.createdAt),
      type: "报价",
      title: `报价 ${q.quoteNo}`,
      content: `${formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)} - ${QuoteStatusLabel[q.status] || q.status}`,
      href: `/quotes/${q.id}`,
    });
  });

  customer.projects.forEach(p => {
    timeline.push({
      date: new Date(p.updatedAt),
      type: "项目",
      title: p.name,
      content: `${ProjectStatusLabel[p.status] || p.status}${p.amount ? ` - ${formatMoney(Number(p.amount), p.currency)}` : ""}`,
      href: `/projects/${p.id}`,
    });
  });

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const typeColors: Record<string, string> = {
    "跟进": "bg-green-100 text-green-700",
    "报价": "bg-blue-100 text-blue-700",
    "项目": "bg-purple-100 text-purple-700",
    "任务": "bg-orange-100 text-orange-700",
    "AI": "bg-pink-100 text-pink-700",
    "线索": "bg-gray-100 text-gray-700",
    "活动": "bg-teal-100 text-teal-700",
  };

  const activityTypeLabels: Record<string, string> = {
    call: "电话",
    email: "邮件",
    whatsapp: "WhatsApp",
    note: "备注",
  };
  const activityTypeBadgeColors: Record<string, string> = {
    call: "bg-green-100 text-green-700",
    email: "bg-blue-100 text-blue-700",
    whatsapp: "bg-emerald-100 text-emerald-700",
    note: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* 顶部客户概览 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.company}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge label={CustomerStatusLabel[customer.customerStatus] || customer.customerStatus} variant={getCustomerStatusVariant(customer.customerStatus)} />
                <StatusBadge label={LeadGradeLabel[customer.leadGrade] || customer.leadGrade} variant={getLeadGradeVariant(customer.leadGrade)} />
                <span className="text-sm text-gray-500">{customer.businessLine.name}</span>
                {customer.source && <span className="text-sm text-gray-500">来源: {LeadSourceLabel[customer.source] || customer.source}</span>}
                {customer.convertedFrom.length > 0 && (
                  <span className="text-sm text-blue-600">
                    转化自线索: {customer.convertedFrom.map(l => l.company).join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/follow-ups/new?customerId=${customer.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
              <Plus size={14} /> 新建跟进
            </Link>
            <Link href={`/projects/new?customerId=${customer.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors">
              <Plus size={14} /> 新建项目
            </Link>
            <Link href={`/quotes/new?customerId=${customer.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={14} /> 新建报价
            </Link>
            <Link href={`/tasks/new?customerId=${customer.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              <Plus size={14} /> 新建任务
            </Link>
            <Link href={`/customers/${customer.id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Pencil size={14} /> 编辑
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">国家</p>
            <p className="font-medium">{customer.country || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">客户类型</p>
            <p className="font-medium">{CustomerTypeLabel[customer.customerType] || customer.customerType}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">主联系人</p>
            <p className="font-medium">{customer.contactName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">邮箱</p>
            <p className="font-medium">{customer.email || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">WhatsApp</p>
            <p className="font-medium">{customer.whatsapp || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">来源网站</p>
            <p className="font-medium truncate">{customer.sourceWebsite || "-"}</p>
          </div>
        </div>
      </div>

      {/* 客户健康度 */}
      <div className={`rounded-lg border p-4 ${healthBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className={healthColor} />
            <div>
              <p className={`font-semibold ${healthColor}`}>{healthStatus}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {hasRecentFollowUp ? "最近7天有跟进" : "超过7天未跟进"}
                {hasActiveProject && " · 有进行中项目"}
                {hasWaitingQuote && " · 有待反馈报价"}
                {hasOverdueTask && " · 有逾期任务"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>最近跟进: {lastFollowUp ? formatDate(lastFollowUp.followUpDate) : "无"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>下次跟进: {nextFollowUp?.nextFollowUpDate ? formatDate(nextFollowUp.nextFollowUpDate) : nextTask?.dueDate ? formatDate(nextTask.dueDate) : "无"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 客户信息和时间线 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 客户信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">基础信息</h3>
              <div className="space-y-1">
                <DetailField label="公司" value={customer.company} />
                <DetailField label="联系人" value={customer.contactName} />
                <DetailField label="国家" value={customer.country} />
                <DetailField label="行业" value={customer.industry} />
                <DetailField label="地址" value={customer.address} />
              </div>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">联系方式</h3>
              <div className="space-y-1">
                <DetailField label="邮箱" value={customer.email} />
                <DetailField label="WhatsApp" value={customer.whatsapp} />
                <DetailField label="电话" value={customer.phone} />
                <DetailField label="网站" value={customer.website ? <a href={customer.website} target="_blank" className="text-blue-600 hover:underline">{customer.website}</a> : null} />
              </div>
            </Card>
          </div>

          {/* 客户时间线 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">客户时间线</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无时间线记录</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {timeline.slice(0, 20).map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-2 ${typeColors[item.type]?.split(" ")[0] || "bg-gray-300"}`} />
                      {idx < timeline.length - 1 && <div className="w-px h-full bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge label={item.type} variant="info" size="sm" />
                        <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                      </div>
                      {item.href ? (
                        <Link href={item.href} className="text-sm font-medium text-gray-900 hover:text-blue-600 block">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 跟进活动记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">跟进活动 ({activities.length})</h3>
            </div>
            {/* 添加活动表单 */}
            <form action={async (formData) => {
              "use server";
              await addCustomerActivity(customerId, formData);
            }} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="flex gap-2">
                <select name="type" className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                  <option value="note">备注</option>
                  <option value="call">电话</option>
                  <option value="email">邮件</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
                <input name="content" placeholder="输入跟进内容..." required className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-1.5" />
              </div>
              <button type="submit" className="px-3 py-1.5 text-sm font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors">
                添加活动
              </button>
            </form>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无活动记录</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-2 bg-teal-400" />
                      <div className="w-px h-full bg-gray-200 mt-1" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${activityTypeBadgeColors[activity.type] || "bg-gray-100 text-gray-700"}`}>
                          {activityTypeLabels[activity.type] || activity.type}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(activity.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{activity.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 商机项目 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">商机项目 ({customer.projects.length})</h3>
              <Link href={`/projects/new?customerId=${customer.id}`} className="text-sm text-blue-600 hover:underline">+ 新增项目</Link>
            </div>
            {customer.projects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无商机项目</p>
            ) : (
              <div className="space-y-3">
                {customer.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link href={`/projects/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {p.name}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {p.productName && <span>{p.productName}</span>}
                        <span>报价: {p._count.quotes}</span>
                        <span>跟进: {p._count.followUps}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {p.amount && <span className="text-sm font-medium">{formatMoney(Number(p.amount), p.currency)}</span>}
                      <StatusBadge label={ProjectStatusLabel[p.status] || p.status} variant={getProjectStatusVariant(p.status)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 跟进记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">最近跟进 ({customer.followUps.length})</h3>
              <Link href={`/follow-ups/new?customerId=${customer.id}`} className="text-sm text-blue-600 hover:underline">+ 新增跟进</Link>
            </div>
            {customer.followUps.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无跟进记录</p>
            ) : (
              <div className="space-y-3">
                {customer.followUps.slice(0, 5).map((fu) => (
                  <div key={fu.id} className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <StatusBadge label={formatEnumLabel(fu.method, { EMAIL: "邮件", WHATSAPP: "WhatsApp", PHONE: "电话", MEETING: "面谈", VIDEO_CALL: "视频", OTHER: "其他" })} variant="info" />
                      <span className="text-xs text-gray-400">{formatDate(fu.followUpDate)}</span>
                    </div>
                    <p className="text-sm text-gray-900">{fu.content}</p>
                    {fu.nextAction && <p className="text-xs text-blue-600 mt-1">下一步: {fu.nextAction}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 报价记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">报价记录 ({customer.quotes.length})</h3>
              <Link href={`/quotes/new?customerId=${customer.id}`} className="text-sm text-blue-600 hover:underline">+ 新增报价</Link>
            </div>
            {customer.quotes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无报价记录</p>
            ) : (
              <div className="space-y-3">
                {customer.quotes.slice(0, 5).map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <Link href={`/quotes/${q.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{q.quoteNo}</Link>
                      <p className="text-xs text-gray-500 mt-0.5">{q.productName || "-"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)}</span>
                      <StatusBadge label={QuoteStatusLabel[q.status] || q.status} variant={getQuoteStatusVariant(q.status)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 右侧 - 统计和AI */}
        <div className="space-y-6">
          {/* 商机总览 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">商机总览</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">项目总数</span><span className="font-medium">{projectStats.total}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">进行中</span><span className="font-medium text-blue-600">{projectStats.active}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">已成交</span><span className="font-medium text-green-600">{projectStats.won}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">已丢单</span><span className="font-medium text-red-600">{projectStats.lost}</span></div>
              <div className="pt-2 border-t border-gray-100 flex justify-between text-sm"><span className="text-gray-500">预计总金额</span><span className="font-medium">{projectStats.totalAmount > 0 ? formatMoney(projectStats.totalAmount) : "-"}</span></div>
            </div>
          </Card>

          {/* 报价总览 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">报价总览</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">报价总数</span><span className="font-medium">{quoteStats.total}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">已发送</span><span className="font-medium">{quoteStats.sent}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">待反馈</span><span className="font-medium text-yellow-600">{quoteStats.waiting}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">已接受</span><span className="font-medium text-green-600">{quoteStats.accepted}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">已拒绝</span><span className="font-medium text-red-600">{quoteStats.rejected}</span></div>
              <div className="pt-2 border-t border-gray-100 flex justify-between text-sm"><span className="text-gray-500">报价总金额</span><span className="font-medium">{quoteStats.totalAmount > 0 ? formatMoney(quoteStats.totalAmount) : "-"}</span></div>
            </div>
          </Card>

          {/* 跟进总览 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">跟进总览</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">最近跟进</span><span className="font-medium">{lastFollowUp ? formatDate(lastFollowUp.followUpDate) : "无"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">下次跟进</span><span className="font-medium">{nextFollowUp?.nextFollowUpDate ? formatDate(nextFollowUp.nextFollowUpDate) : nextTask?.dueDate ? formatDate(nextTask.dueDate) : "无"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">跟进次数</span><span className="font-medium">{customer.followUps.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">待办任务</span><span className="font-medium">{customer.tasks.length}</span></div>
            </div>
          </Card>

          {/* AI 复盘 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">AI 客户复盘</h3>
            <AIAnalysisButton
              action={async () => {
                "use server";
                const { reviewCustomer } = await import("@/lib/ai/actions");
                return reviewCustomer(customerId);
              }}
              label="AI 复盘客户"
              isAIConfigured={aiConfigured}
              onAppendToNotes={
                latestAnalysis?.summary
                  ? async () => {
                      "use server";
                      const content = [
                        latestAnalysis.summary,
                        latestAnalysis.nextAction ? `\n下一步: ${latestAnalysis.nextAction}` : "",
                      ].filter(Boolean).join("\n");
                      await appendToCustomerNotes(customerId, content);
                    }
                  : undefined
              }
              onCreateTask={
                latestAnalysis?.nextAction
                  ? async () => {
                      "use server";
                      await createTaskFromAI("customer", customerId, latestAnalysis.nextAction!);
                    }
                  : undefined
              }
            />
            {latestAnalysis && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">
                  最近一次复盘：{formatDateTime(latestAnalysis.createdAt)}
                </p>
                <AIAnalysisResult analysis={latestAnalysis} />
              </div>
            )}
          </Card>

          {/* 客户备注 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">客户备注</h3>
            {customer.remark ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.remark}</p>
            ) : (
              <p className="text-sm text-gray-400">暂无备注</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
