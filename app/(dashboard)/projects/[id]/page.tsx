import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, Plus, CheckCircle } from "lucide-react";
import { ProjectStatusLabel, QuoteStatusLabel, TaskStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import { isAIConfigured } from "@/lib/ai/types";
import { analyzeProject, appendToProjectNotes, createTaskFromAI } from "@/lib/ai/actions";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { markProjectAsWon } from "../actions";

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
        followUps: { orderBy: { followUpDate: "desc" } },
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

  // 检查是否有已接受的报价
  const hasAcceptedQuote = project.quotes.some((q) => q.status === "ACCEPTED");

  return (
    <div>
      <PageHeader
        title={project.name}
        backHref="/projects"
        action={{ label: "编辑", href: `/projects/${project.id}/edit`, icon: <Pencil size={16} /> }}
      />

      {/* 项目状态和快捷操作 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Badge label={formatEnumLabel(project.status, ProjectStatusLabel)}
            className={project.status === "WON" ? "bg-green-100 text-green-700" : project.status === "LOST" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"} />
          {project.amount && <span className="text-lg font-bold">{formatMoney(Number(project.amount), project.currency)}</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/follow-ups/new?projectId=${project.id}`}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">
            <Plus size={14} /> 新建跟进
          </Link>
          <Link href={`/quotes/new?projectId=${project.id}`}
            className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700">
            <Plus size={14} /> 新建报价
          </Link>
          <Link href={`/tasks/new?projectId=${project.id}`}
            className="flex items-center gap-2 bg-orange-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-700">
            <Plus size={14} /> 新建任务
          </Link>
          {hasAcceptedQuote && project.status !== "WON" && (
            <form action={async () => { "use server"; await markProjectAsWon(project.id); }}>
              <button type="submit"
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700">
                <CheckCircle size={14} /> 标记为成交
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基础信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">项目名称：</span><span className="font-medium">{project.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">客户：</span><Link href={`/customers/${project.customerId}`} className="text-blue-600 hover:underline">{project.customer.company}</Link></div>
            <div className="flex justify-between"><span className="text-gray-500">业务线：</span>{project.businessLine.name}</div>
            {project.lead && <div className="flex justify-between"><span className="text-gray-500">关联线索：</span><Link href={`/leads/${project.leadId}`} className="text-blue-600 hover:underline">{project.lead.company}</Link></div>}
            <div className="flex justify-between"><span className="text-gray-500">创建时间：</span>{formatDate(project.createdAt)}</div>
            <div className="flex justify-between"><span className="text-gray-500">更新时间：</span>{formatDate(project.updatedAt)}</div>
          </div>
        </div>

        {/* 产品需求 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">产品需求</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">产品类别：</span>{project.productCategory || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">产品名称：</span>{project.productName || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">规格：</span>{project.specs || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">数量：</span>{project.quantity || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">用途：</span>{project.usage || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">目标市场：</span>{project.targetMarket || "-"}</div>
          </div>
          {project.specialRequirements && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-gray-500 text-sm mb-1">特殊要求：</p>
              <p className="text-sm">{project.specialRequirements}</p>
            </div>
          )}
        </div>
      </div>

      {/* 商业信息 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">商业信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">预计金额：</span>{project.amount ? formatMoney(project.amount ? Number(project.amount) : null, project.currency) : "-"}</div>
          <div><span className="text-gray-500">币种：</span>{project.currency}</div>
          <div><span className="text-gray-500">开始日期：</span>{formatDate(project.startDate)}</div>
          <div><span className="text-gray-500">结束日期：</span>{formatDate(project.endDate)}</div>
        </div>
        {project.description && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-gray-500 text-sm mb-1">项目描述：</p>
            <p className="text-sm">{project.description}</p>
          </div>
        )}
        {project.remark && (
          <div className="mt-3">
            <p className="text-gray-500 text-sm mb-1">备注：</p>
            <p className="text-sm">{project.remark}</p>
          </div>
        )}
      </div>

      {/* 关联报价 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联报价 ({project.quotes.length})</h2>
          <Link href={`/quotes/new?projectId=${project.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增报价
          </Link>
        </div>
        {project.quotes.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联报价</p>
        ) : (
          <div className="space-y-2">
            {project.quotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <Link href={`/quotes/${q.id}`} className="font-medium hover:text-blue-600">{q.quoteNo}</Link>
                  <span className="ml-2 text-sm text-gray-500">{q.productName || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)}</span>
                  <Badge label={formatEnumLabel(q.status, QuoteStatusLabel)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 关联跟进 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">跟进记录 ({project.followUps.length})</h2>
          <Link href={`/follow-ups/new?projectId=${project.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增跟进
          </Link>
        </div>
        {project.followUps.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无跟进记录</p>
        ) : (
          <div className="space-y-3">
            {project.followUps.slice(0, 5).map((fu) => (
              <div key={fu.id} className="border-l-2 border-blue-200 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={formatEnumLabel(fu.method, { EMAIL: "邮件", WHATSAPP: "WhatsApp", PHONE: "电话", MEETING: "面谈", VIDEO_CALL: "视频", OTHER: "其他" })} />
                  <span className="text-xs text-gray-400">{formatDate(fu.followUpDate)}</span>
                </div>
                <p className="text-sm">{fu.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 关联任务 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联任务 ({project.tasks.length})</h2>
          <Link href={`/tasks/new?projectId=${project.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增任务
          </Link>
        </div>
        {project.tasks.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联任务</p>
        ) : (
          <div className="space-y-2">
            {project.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span>{task.title}</span>
                <div className="flex items-center gap-2">
                  <Badge label={formatEnumLabel(task.status, TaskStatusLabel)} />
                  <span className="text-gray-400">{formatDate(task.dueDate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 分析 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">AI 分析</h2>
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
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">
              最近一次分析：{new Date(latestAnalysis.createdAt).toLocaleString("zh-CN")}
            </p>
            <AIAnalysisResult
              analysis={latestAnalysis}
              onAppendToNotes={
                latestAnalysis.summary
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
                latestAnalysis.nextAction
                  ? async () => {
                      "use server";
                      await createTaskFromAI("project", projectId, latestAnalysis.nextAction!);
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
