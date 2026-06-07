import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, Plus, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { ProjectStatusLabel, QuoteStatusLabel, TaskStatusLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney, formatEnumLabel } from "@/lib/format";
import { getProjectStatusVariant, getQuoteStatusVariant, getTaskStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import { markProjectAsWon } from "../actions";
import { analyzeProject, appendToProjectNotes, createTaskFromAI } from "@/lib/ai/actions";
import { isAIConfigured } from "@/lib/ai/types";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";

export const dynamic = "force-dynamic";

const STAGE_ORDER = [
  "REQUIREMENT_CONFIRMING",
  "QUOTING",
  "SAMPLE_TESTING",
  "WAITING_FEEDBACK",
  "NEGOTIATING",
  "WON",
  "LOST",
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = parseInt(id);

  const [project, latestAnalysis] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        businessLine: true,
        customer: true,
        lead: true,
        followUps: { orderBy: { followUpDate: "desc" }, take: 10 },
        quotes: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { dueDate: "asc" } },
      },
    }),
    prisma.aIAnalysis.findFirst({
      where: { targetType: "PROJECT", targetId: projectId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!project) return notFound();

  const aiConfigured = isAIConfigured();

  // 项目阶段进度
  const currentStageIndex = STAGE_ORDER.indexOf(project.status);
  const hasAcceptedQuote = project.quotes.some(q => q.status === "ACCEPTED");

  // 项目风险提醒
  const now = new Date();
  const warnings: string[] = [];
  if (!project.customer) warnings.push("没有关联客户");
  if (project.followUps.length === 0) warnings.push("没有跟进记录");
  if (project.status === "QUOTING" && project.quotes.length === 0) warnings.push("状态为报价中但没有报价");
  if (project.status === "WAITING_FEEDBACK") {
    const lastFollowUp = project.followUps[0];
    if (lastFollowUp && (now.getTime() - new Date(lastFollowUp.followUpDate).getTime()) > 7 * 24 * 60 * 60 * 1000) {
      warnings.push("等待反馈超过7天未跟进");
    }
  }
  const overdueTasks = project.tasks.filter(t => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < now);
  if (overdueTasks.length > 0) warnings.push(`有 ${overdueTasks.length} 个逾期任务`);
  if (!project.amount) warnings.push("预计金额为空");

  // 构建时间线
  const timeline: Array<{
    date: Date;
    type: string;
    title: string;
    content: string;
    href?: string;
  }> = [];

  project.followUps.forEach(fu => {
    timeline.push({
      date: new Date(fu.followUpDate),
      type: "跟进",
      title: `${fu.method} 跟进`,
      content: fu.content.slice(0, 100),
      href: `/follow-ups/${fu.id}`,
    });
  });

  project.quotes.forEach(q => {
    timeline.push({
      date: new Date(q.createdAt),
      type: "报价",
      title: `报价 ${q.quoteNo}`,
      content: `${formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)} - ${QuoteStatusLabel[q.status] || q.status}`,
      href: `/quotes/${q.id}`,
    });
  });

  project.tasks.forEach(t => {
    timeline.push({
      date: new Date(t.createdAt),
      type: "任务",
      title: t.title,
      content: `${TaskStatusLabel[t.status] || t.status} - ${formatDate(t.dueDate)}`,
      href: `/tasks/${t.id}/edit`,
    });
  });

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const typeColors: Record<string, string> = {
    "跟进": "bg-green-100 text-green-700",
    "报价": "bg-blue-100 text-blue-700",
    "任务": "bg-orange-100 text-orange-700",
    "项目": "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      {/* 顶部项目概览 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/projects/pipeline" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge label={ProjectStatusLabel[project.status] || project.status} variant={getProjectStatusVariant(project.status)} />
                <span className="text-sm text-gray-500">{project.businessLine.name}</span>
                <Link href={`/customers/${project.customerId}`} className="text-sm text-blue-600 hover:underline">{project.customer.company}</Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/follow-ups/new?projectId=${project.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
              <Plus size={14} /> 新建跟进
            </Link>
            <Link href={`/quotes/new?projectId=${project.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors">
              <Plus size={14} /> 新建报价
            </Link>
            <Link href={`/tasks/new?projectId=${project.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              <Plus size={14} /> 新建任务
            </Link>
            <Link href={`/projects/${project.id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Pencil size={14} /> 编辑
            </Link>
            {hasAcceptedQuote && project.status !== "WON" && (
              <form action={async () => { "use server"; await markProjectAsWon(project.id); }}>
                <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
                  <CheckCircle size={14} /> 标记成交
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">预计金额</p>
            <p className="font-medium">{project.amount ? formatMoney(Number(project.amount), project.currency) : "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">产品名称</p>
            <p className="font-medium">{project.productName || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">规格</p>
            <p className="font-medium">{project.specs || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">数量</p>
            <p className="font-medium">{project.quantity || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">目标市场</p>
            <p className="font-medium">{project.targetMarket || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">最近更新</p>
            <p className="font-medium">{formatDate(project.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* 项目阶段进度条 */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4">项目阶段</h3>
        <div className="flex items-center gap-1">
          {STAGE_ORDER.slice(0, -2).map((stage, idx) => {
            const isActive = stage === project.status;
            const isPast = currentStageIndex > idx;
            return (
              <div key={stage} className="flex-1">
                <div className={`h-2 rounded-full ${isPast ? "bg-green-500" : isActive ? "bg-blue-500" : "bg-gray-200"}`} />
                <p className={`text-xs mt-1 ${isActive ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                  {ProjectStatusLabel[stage] || stage}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 项目风险提醒 */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">项目风险提醒</h3>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, idx) => (
              <li key={idx} className="text-sm text-yellow-700">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 项目信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">项目信息</h3>
              <div className="space-y-1">
                <DetailField label="项目名称" value={project.name} />
                <DetailField label="业务线" value={project.businessLine.name} />
                <DetailField label="客户" value={<Link href={`/customers/${project.customerId}`} className="text-blue-600 hover:underline">{project.customer.company}</Link>} />
                {project.lead && <DetailField label="关联线索" value={<Link href={`/leads/${project.leadId}`} className="text-blue-600 hover:underline">{project.lead.company}</Link>} />}
                <DetailField label="状态" value={<StatusBadge label={ProjectStatusLabel[project.status] || project.status} variant={getProjectStatusVariant(project.status)} />} />
              </div>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">产品需求</h3>
              <div className="space-y-1">
                <DetailField label="产品类别" value={project.productCategory} />
                <DetailField label="产品名称" value={project.productName} />
                <DetailField label="规格" value={project.specs} />
                <DetailField label="数量" value={project.quantity} />
                <DetailField label="用途" value={project.usage} />
                <DetailField label="目标市场" value={project.targetMarket} />
              </div>
            </Card>
          </div>

          {/* 项目时间线 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">项目时间线</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无时间线记录</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {timeline.slice(0, 15).map((item, idx) => (
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

          {/* 报价记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">报价记录 ({project.quotes.length})</h3>
              <Link href={`/quotes/new?projectId=${project.id}`} className="text-sm text-blue-600 hover:underline">+ 新增报价</Link>
            </div>
            {project.quotes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">当前项目还没有报价，点击"新建报价"开始报价</p>
            ) : (
              <div className="space-y-3">
                {project.quotes.map((q) => (
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

          {/* 跟进记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">跟进记录 ({project.followUps.length})</h3>
              <Link href={`/follow-ups/new?projectId=${project.id}`} className="text-sm text-blue-600 hover:underline">+ 新增跟进</Link>
            </div>
            {project.followUps.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无跟进记录</p>
            ) : (
              <div className="space-y-3">
                {project.followUps.slice(0, 5).map((fu) => (
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
        </div>

        {/* 右侧 */}
        <div className="space-y-6">
          {/* 商业信息 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">商业信息</h3>
            <div className="space-y-1">
              <DetailField label="预计金额" value={project.amount ? formatMoney(Number(project.amount), project.currency) : null} />
              <DetailField label="币种" value={project.currency} />
              <DetailField label="开始日期" value={formatDate(project.startDate)} />
              <DetailField label="结束日期" value={formatDate(project.endDate)} />
            </div>
            {project.specialRequirements && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">特殊要求</p>
                <p className="text-sm">{project.specialRequirements}</p>
              </div>
            )}
          </Card>

          {/* 任务 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">任务 ({project.tasks.length})</h3>
              <Link href={`/tasks/new?projectId=${project.id}`} className="text-sm text-blue-600 hover:underline">+ 新增任务</Link>
            </div>
            {project.tasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无任务</p>
            ) : (
              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50">
                    <span className="truncate">{task.title}</span>
                    <StatusBadge label={TaskStatusLabel[task.status] || task.status} variant={getTaskStatusVariant(task.status)} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* AI 分析 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">AI 分析</h3>
            <AIAnalysisButton
              action={async () => {
                "use server";
                return analyzeProject(projectId);
              }}
              label="AI 分析项目"
              isAIConfigured={aiConfigured}
              onAppendToNotes={
                latestAnalysis?.summary
                  ? async () => {
                      "use server";
                      const content = [
                        latestAnalysis.requirementSummary || latestAnalysis.summary,
                        latestAnalysis.missingInfo ? `\n缺失信息: ${latestAnalysis.missingInfo}` : "",
                        latestAnalysis.nextAction ? `\n下一步: ${latestAnalysis.nextAction}` : "",
                      ].filter(Boolean).join("\n");
                      await appendToProjectNotes(projectId, content);
                    }
                  : undefined
              }
              onCreateTask={
                latestAnalysis?.nextAction
                  ? async () => {
                      "use server";
                      await createTaskFromAI("project", projectId, latestAnalysis.nextAction!);
                    }
                  : undefined
              }
            />
            {latestAnalysis && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">
                  最近一次分析：{formatDateTime(latestAnalysis.createdAt)}
                </p>
                <AIAnalysisResult analysis={latestAnalysis} />
              </div>
            )}
          </Card>

          {/* 项目描述 */}
          {(project.description || project.remark) && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">备注</h3>
              {project.description && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">项目描述</p>
                  <p className="text-sm">{project.description}</p>
                </div>
              )}
              {project.remark && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">备注</p>
                  <p className="text-sm">{project.remark}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
