import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, Plus, ArrowRight } from "lucide-react";
import { LeadStatusLabel, LeadTemperatureLabel, LeadSourceLabel, LeadGradeLabel, ProjectStatusLabel, QuoteStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import { isAIConfigured } from "@/lib/ai/types";
import { analyzeLead, applyLeadQualification, createTaskFromAI } from "@/lib/ai/actions";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { convertLeadToCustomer } from "../actions";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = parseInt(id);

  const [lead, latestAnalysis] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        businessLine: true,
        followUps: { orderBy: { followUpDate: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { dueDate: "asc" } },
        projects: { orderBy: { createdAt: "desc" } },
        convertedCustomer: true,
      },
    }),
    prisma.aIAnalysis.findFirst({
      where: { targetType: "LEAD", targetId: leadId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const aiConfigured = isAIConfigured();

  if (!lead) return notFound();

  return (
    <div>
      <PageHeader
        title={lead.company}
        backHref="/leads"
        action={{ label: "编辑", href: `/leads/${lead.id}/edit`, icon: <Pencil size={16} /> }}
      />

      {/* 快捷操作 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={`/follow-ups/new?leadId=${lead.id}`}
          className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">
          <Plus size={14} /> 新建跟进
        </Link>
        <Link href={`/projects/new?leadId=${lead.id}`}
          className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700">
          <Plus size={14} /> 新建项目
        </Link>
        <Link href={`/tasks/new?leadId=${lead.id}`}
          className="flex items-center gap-2 bg-orange-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-700">
          <Plus size={14} /> 新建任务
        </Link>
        {lead.convertedCustomerId ? (
          <Link href={`/customers/${lead.convertedCustomerId}`}
            className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700">
            <ArrowRight size={14} /> 查看客户
          </Link>
        ) : (
          <form action={async () => { "use server"; await convertLeadToCustomer(lead.id); }}>
            <button type="submit"
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
              <ArrowRight size={14} /> 转为客户
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基础信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">公司：</span><span className="font-medium">{lead.company}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">联系人：</span>{lead.contactName}</div>
            <div className="flex justify-between"><span className="text-gray-500">国家：</span>{lead.country || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">电话：</span>{lead.phone || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">邮箱：</span>{lead.email || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">WhatsApp：</span>{lead.whatsapp || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">业务线：</span>{lead.businessLine.name}</div>
            <div className="flex justify-between"><span className="text-gray-500">来源：</span>{formatEnumLabel(lead.source, LeadSourceLabel)}</div>
            {lead.sourceWebsite && <div className="flex justify-between"><span className="text-gray-500">来源网站：</span><a href={lead.sourceWebsite} target="_blank" className="text-blue-600 hover:underline truncate max-w-[200px]">{lead.sourceWebsite}</a></div>}
          </div>
        </div>

        {/* 需求信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">需求信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">状态：</span><Badge label={formatEnumLabel(lead.status, LeadStatusLabel)} className="bg-blue-100 text-blue-700" /></div>
            <div className="flex justify-between"><span className="text-gray-500">意向度：</span><Badge label={formatEnumLabel(lead.temperature, LeadTemperatureLabel)} className={lead.temperature === "HOT" ? "bg-red-100 text-red-700" : lead.temperature === "WARM" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"} /></div>
            <div className="flex justify-between"><span className="text-gray-500">等级：</span><Badge label={formatEnumLabel(lead.grade, LeadGradeLabel)} className={lead.grade === "A" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"} /></div>
            <div className="flex justify-between"><span className="text-gray-500">预算：</span>{lead.budget ? formatMoney(lead.budget ? Number(lead.budget) : null, lead.currency) : "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">预计成交：</span>{formatDate(lead.expectedClosing)}</div>
            <div className="flex justify-between"><span className="text-gray-500">下次跟进：</span>{formatDate(lead.nextFollowUp)}</div>
            <div className="flex justify-between"><span className="text-gray-500">创建时间：</span>{formatDate(lead.createdAt)}</div>
          </div>
          {lead.interestProducts && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-gray-500 text-sm mb-1">感兴趣产品：</p>
              <p className="text-sm">{lead.interestProducts}</p>
            </div>
          )}
          {lead.inquiryContent && (
            <div className="mt-3">
              <p className="text-gray-500 text-sm mb-1">询盘内容：</p>
              <p className="text-sm">{lead.inquiryContent}</p>
            </div>
          )}
          {lead.remark && (
            <div className="mt-3">
              <p className="text-gray-500 text-sm mb-1">备注：</p>
              <p className="text-sm">{lead.remark}</p>
            </div>
          )}
        </div>
      </div>

      {/* 关联跟进记录 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">跟进记录 ({lead.followUps.length})</h2>
          <Link href={`/follow-ups/new?leadId=${lead.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增跟进
          </Link>
        </div>
        {lead.followUps.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无跟进记录</p>
        ) : (
          <div className="space-y-3">
            {lead.followUps.map((fu) => (
              <div key={fu.id} className="border-l-2 border-blue-200 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={formatEnumLabel(fu.method, { EMAIL: "邮件", WHATSAPP: "WhatsApp", PHONE: "电话", MEETING: "面谈", VIDEO_CALL: "视频", OTHER: "其他" })} />
                  <span className="text-xs text-gray-400">{formatDate(fu.followUpDate)}</span>
                </div>
                <p className="text-sm">{fu.content}</p>
                {fu.customerFeedback && <p className="text-sm text-gray-600 mt-1">反馈：{fu.customerFeedback}</p>}
                {fu.nextAction && <p className="text-sm text-blue-600 mt-1">下一步：{fu.nextAction}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 关联项目 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联项目 ({lead.projects.length})</h2>
          <Link href={`/projects/new?leadId=${lead.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增项目
          </Link>
        </div>
        {lead.projects.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联项目</p>
        ) : (
          <div className="space-y-2">
            {lead.projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2">
                <Link href={`/projects/${p.id}`} className="font-medium hover:text-blue-600">{p.name}</Link>
                <Badge label={formatEnumLabel(p.status, ProjectStatusLabel)} className="bg-blue-100 text-blue-700" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 关联报价 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联报价 ({lead.quotes.length})</h2>
          <Link href={`/quotes/new?leadId=${lead.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增报价
          </Link>
        </div>
        {lead.quotes.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联报价</p>
        ) : (
          <div className="space-y-2">
            {lead.quotes.map((q) => (
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

      {/* 关联任务 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联任务 ({lead.tasks.length})</h2>
          <Link href={`/tasks/new?leadId=${lead.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增任务
          </Link>
        </div>
        {lead.tasks.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联任务</p>
        ) : (
          <div className="space-y-2">
            {lead.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span>{task.title}</span>
                <div className="flex items-center gap-2">
                  <Badge label={formatEnumLabel(task.priority, { LOW: "低", MEDIUM: "中", HIGH: "高", URGENT: "紧急" })} />
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
            return analyzeLead(leadId);
          }}
          label="AI 分析线索"
          isAIConfigured={aiConfigured}
          onApplyGrade={
            latestAnalysis?.qualificationLevel
              ? async () => {
                  "use server";
                  await applyLeadQualification(leadId, latestAnalysis.qualificationLevel!);
                }
              : undefined
          }
          onCreateTask={
            latestAnalysis?.nextAction
              ? async () => {
                  "use server";
                  await createTaskFromAI("lead", leadId, latestAnalysis.nextAction!);
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
              onApplyGrade={
                latestAnalysis.qualificationLevel
                  ? async () => {
                      "use server";
                      await applyLeadQualification(leadId, latestAnalysis.qualificationLevel!);
                    }
                  : undefined
              }
              onCreateTask={
                latestAnalysis.nextAction
                  ? async () => {
                      "use server";
                      await createTaskFromAI("lead", leadId, latestAnalysis.nextAction!);
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
