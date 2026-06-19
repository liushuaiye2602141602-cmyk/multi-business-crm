import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, Plus, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle, Mail, Phone, Globe, MessageSquare } from "lucide-react";
import { LeadStatusLabel, LeadTemperatureLabel, LeadSourceLabel, LeadGradeLabel, ProjectStatusLabel, QuoteStatusLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney, formatEnumLabel } from "@/lib/format";
import { isAIConfigured } from "@/lib/ai/types";
import { analyzeLead, applyLeadQualification, createTaskFromAI } from "@/lib/ai/actions";
import { getLeadStatusVariant, getLeadGradeVariant, getProjectStatusVariant, getQuoteStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import AIAnalyzeButton from "@/components/AIAnalyzeButton";
import { convertLeadToCustomer, addLeadActivity, updateLeadStatus, updateLeadOwner } from "../actions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = parseInt(id);

  const [lead, latestAnalysis, activities] = await Promise.all([
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
    prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!lead) return notFound();

  const aiConfigured = isAIConfigured();

  // 线索处理建议
  const suggestions: string[] = [];
  if (!lead.inquiryContent && !lead.requirement) suggestions.push("补充询盘内容或需求描述");
  if (!lead.email && !lead.whatsapp) suggestions.push("补充联系方式（邮箱或 WhatsApp）");
  if (!latestAnalysis) suggestions.push("建议先做 AI 分析，了解客户需求");
  if (["A", "B"].includes(lead.grade) && !lead.nextFollowUp) suggestions.push("A/B 级线索建议设置跟进日期");

  // 线索转化路径
  const conversionSteps = [
    { label: "线索", completed: true, href: `/leads/${lead.id}` },
    { label: "客户", completed: !!lead.convertedCustomerId, href: lead.convertedCustomerId ? `/customers/${lead.convertedCustomerId}` : undefined },
    { label: "项目", completed: lead.projects.length > 0, href: lead.projects.length > 0 ? `/projects/${lead.projects[0].id}` : undefined },
    { label: "报价", completed: lead.quotes.length > 0, href: lead.quotes.length > 0 ? `/quotes/${lead.quotes[0].id}` : undefined },
    { label: "成交", completed: lead.status === "WON" },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部线索概览 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/leads" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{lead.company}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge label={LeadStatusLabel[lead.status] || lead.status} variant={getLeadStatusVariant(lead.status)} />
                <StatusBadge label={LeadGradeLabel[lead.grade] || lead.grade} variant={getLeadGradeVariant(lead.grade)} />
                <StatusBadge label={LeadTemperatureLabel[lead.temperature] || lead.temperature} variant={lead.temperature === "HOT" ? "danger" : lead.temperature === "WARM" ? "warning" : "default"} />
                <span className="text-sm text-gray-500">{lead.businessLine.name}</span>
                <span className="text-sm text-gray-500">来源: {LeadSourceLabel[lead.source] || lead.source}</span>
                {lead.ownerName && <span className="text-sm text-gray-500">负责人: {lead.ownerName}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/follow-ups/new?leadId=${lead.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
              <Plus size={14} /> 新建跟进
            </Link>
            <Link href={`/projects/new?leadId=${lead.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors">
              <Plus size={14} /> 新建项目
            </Link>
            <Link href={`/tasks/new?leadId=${lead.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              <Plus size={14} /> 新建任务
            </Link>
            <Link href={`/leads/${lead.id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Pencil size={14} /> 编辑
            </Link>
            {lead.status === "CONVERTED" || lead.convertedCustomerId ? (
              <Link href={`/customers/${lead.convertedCustomerId}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors">
                <ArrowRight size={14} /> 查看客户
              </Link>
            ) : (
              <form action={async () => { "use server"; const result = await convertLeadToCustomer(lead.id); if (!result.success) throw new Error(result.error); }}>
                <button type="submit" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <ArrowRight size={14} /> 转为客户
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">联系人</p>
            <p className="font-medium">{lead.contactName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">国家</p>
            <p className="font-medium">{lead.country || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">邮箱</p>
            <p className="font-medium">{lead.email || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">WhatsApp</p>
            <p className="font-medium">{lead.whatsapp || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">来源网站</p>
            <p className="font-medium truncate">{lead.sourceWebsite || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">创建时间</p>
            <p className="font-medium">{formatDate(lead.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* 线索转化路径 */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4">线索转化路径</h3>
        <div className="flex items-center gap-2">
          {conversionSteps.map((step, idx) => (
            <div key={step.label} className="flex items-center gap-2">
              {step.completed ? (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  <CheckCircle size={14} />
                  {step.label}
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm">
                  {step.label}
                </div>
              )}
              {idx < conversionSteps.length - 1 && <ArrowRight size={16} className="text-gray-300" />}
            </div>
          ))}
        </div>
      </Card>

      {/* 转化信息 */}
      {lead.status === "CONVERTED" && lead.convertedCustomer && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <h3 className="font-semibold text-green-800">已转化为客户</h3>
          </div>
          <div className="text-sm text-green-700">
            <p>客户：{lead.convertedCustomer.company}</p>
            <p>联系人：{lead.convertedCustomer.contactName}</p>
          </div>
          <Link href={`/customers/${lead.convertedCustomerId}`} className="inline-flex items-center gap-1 mt-2 text-sm text-green-600 hover:underline">
            查看客户详情 <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* 线索处理建议 */}
      {suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-blue-600" />
            <h3 className="font-semibold text-blue-800">线索处理建议</h3>
          </div>
          <ul className="space-y-1">
            {suggestions.map((s, idx) => (
              <li key={idx} className="text-sm text-blue-700">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 线索信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">基础信息</h3>
              <div className="space-y-1">
                <DetailField label="公司" value={lead.company} />
                <DetailField label="联系人" value={lead.contactName} />
                <DetailField label="国家" value={lead.country} />
                <DetailField label="邮箱" value={lead.email} />
                <DetailField label="WhatsApp" value={lead.whatsapp} />
                <DetailField label="电话" value={lead.phone} />
              </div>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">需求信息</h3>
              <div className="space-y-1">
                <DetailField label="业务线" value={lead.businessLine.name} />
                <DetailField label="来源" value={LeadSourceLabel[lead.source] || lead.source} />
                <DetailField label="状态" value={<StatusBadge label={LeadStatusLabel[lead.status] || lead.status} variant={getLeadStatusVariant(lead.status)} />} />
                <DetailField label="等级" value={<StatusBadge label={LeadGradeLabel[lead.grade] || lead.grade} variant={getLeadGradeVariant(lead.grade)} />} />
                <DetailField label="意向度" value={<StatusBadge label={LeadTemperatureLabel[lead.temperature] || lead.temperature} variant={lead.temperature === "HOT" ? "danger" : lead.temperature === "WARM" ? "warning" : "default"} />} />
                <DetailField label="预算" value={lead.budget ? formatMoney(Number(lead.budget), lead.currency) : null} />
              </div>
            </Card>
          </div>

          {/* 需求描述 */}
          {(lead.interestProducts || lead.inquiryContent || lead.requirement) && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">需求描述</h3>
              {lead.interestProducts && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">感兴趣产品</p>
                  <p className="text-sm">{lead.interestProducts}</p>
                </div>
              )}
              {lead.inquiryContent && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">询盘内容</p>
                  <p className="text-sm">{lead.inquiryContent}</p>
                </div>
              )}
              {lead.requirement && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">需求描述</p>
                  <p className="text-sm">{lead.requirement}</p>
                </div>
              )}
            </Card>
          )}

          {/* 跟进记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">跟进记录 ({lead.followUps.length})</h3>
              <Link href={`/follow-ups/new?leadId=${lead.id}`} className="text-sm text-blue-600 hover:underline">+ 新增跟进</Link>
            </div>
            {lead.followUps.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无跟进记录</p>
            ) : (
              <div className="space-y-3">
                {lead.followUps.slice(0, 5).map((fu) => (
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

          {/* 关联项目 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">关联项目 ({lead.projects.length})</h3>
              <Link href={`/projects/new?leadId=${lead.id}`} className="text-sm text-blue-600 hover:underline">+ 新增项目</Link>
            </div>
            {lead.projects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无关联项目</p>
            ) : (
              <div className="space-y-2">
                {lead.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <Link href={`/projects/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{p.name}</Link>
                    <StatusBadge label={ProjectStatusLabel[p.status] || p.status} variant={getProjectStatusVariant(p.status)} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 右侧 */}
        <div className="space-y-6">
          {/* AI 分析 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">AI 分析</h3>
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
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">
                  最近一次分析：{formatDateTime(latestAnalysis.createdAt)}
                </p>
                <AIAnalysisResult analysis={latestAnalysis} />
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <AIAnalyzeButton leadId={lead.id} />
            </div>
          </Card>

          {/* 关联报价 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">报价 ({lead.quotes.length})</h3>
              <Link href={`/quotes/new?leadId=${lead.id}`} className="text-sm text-blue-600 hover:underline">+ 新增报价</Link>
            </div>
            {lead.quotes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无报价</p>
            ) : (
              <div className="space-y-2">
                {lead.quotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-2 rounded bg-gray-50">
                    <Link href={`/quotes/${q.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">{q.quoteNo}</Link>
                    <span className="text-sm font-medium">{formatMoney(q.totalPrice ? Number(q.totalPrice) : null, q.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 备注 */}
          {lead.remark && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">备注</h3>
              <p className="text-sm text-gray-700">{lead.remark}</p>
            </Card>
          )}

          {/* 状态切换 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">快速切换状态</h3>
            <div className="flex flex-wrap gap-2">
              {["NEW", "CONTACTED", "QUALIFIED", "LOST"].map((s) => (
                <form key={s} action={async () => { "use server"; await updateLeadStatus(lead.id, s); }}>
                  <button
                    type="submit"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      lead.status === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s === "NEW" ? "新线索" : s === "CONTACTED" ? "已联系" : s === "QUALIFIED" ? "已确认" : "已流失"}
                  </button>
                </form>
              ))}
            </div>
          </Card>

          {/* 负责人 */}
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">负责人</h3>
            <form action={async (formData: FormData) => { "use server"; await updateLeadOwner(lead.id, formData.get("ownerName") as string); }} className="flex gap-2">
              <input
                type="text"
                name="ownerName"
                defaultValue={lead.ownerName || ""}
                placeholder="输入负责人姓名"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                保存
              </button>
            </form>
          </Card>

          {/* 跟进活动记录 */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">跟进活动 ({activities.length})</h3>
            </div>

            {/* 添加活动表单 */}
            <form action={async (formData: FormData) => { "use server"; await addLeadActivity(lead.id, formData); }} className="mb-4 space-y-2">
              <select name="type" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                <option value="note">备注</option>
                <option value="call">电话</option>
                <option value="email">邮件</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <textarea
                name="content"
                rows={2}
                placeholder="输入跟进内容..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                required
              />
              <button type="submit" className="w-full px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                添加活动
              </button>
            </form>

            {/* 活动列表 */}
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无活动记录</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        a.type === "call" ? "bg-blue-100 text-blue-700" :
                        a.type === "email" ? "bg-purple-100 text-purple-700" :
                        a.type === "whatsapp" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {a.type === "call" ? "电话" : a.type === "email" ? "邮件" : a.type === "whatsapp" ? "WhatsApp" : "备注"}
                      </span>
                      <span className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-900">{a.content}</p>
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
