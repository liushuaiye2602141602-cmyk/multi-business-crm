import Link from "next/link";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, Plus } from "lucide-react";
import { CustomerStatusLabel, CustomerTypeLabel, LeadSourceLabel, LeadGradeLabel, ProjectStatusLabel, QuoteStatusLabel, TaskStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import { isAIConfigured } from "@/lib/ai/types";
import { reviewCustomer, appendToCustomerNotes, createTaskFromAI } from "@/lib/ai/actions";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = parseInt(id);

  const [customer, latestAnalysis] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        businessLine: true,
        projects: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { followUpDate: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { dueDate: "asc" }, where: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
      },
    }),
    prisma.aIAnalysis.findFirst({
      where: { targetType: "CUSTOMER", targetId: customerId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!customer) return notFound();

  const aiConfigured = isAIConfigured();

  // 计算最近跟进和下次跟进
  const lastFollowUp = customer.followUps[0] || null;
  const nextFollowUp = customer.followUps.find((fu) => fu.nextFollowUpDate && new Date(fu.nextFollowUpDate) > new Date());
  const nextTask = customer.tasks.find((t) => t.dueDate && new Date(t.dueDate) > new Date());

  return (
    <div>
      <PageHeader
        title={customer.company}
        backHref="/customers"
        action={{ label: "编辑", href: `/customers/${customer.id}/edit`, icon: <Pencil size={16} /> }}
      />

      {/* 客户状态概览 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Badge label={formatEnumLabel(customer.customerStatus, CustomerStatusLabel)}
            className={CustomerStatusLabel[customer.customerStatus] === "活跃" ? "bg-green-100 text-green-700" : CustomerStatusLabel[customer.customerStatus] === "潜在" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"} />
          <Badge label={formatEnumLabel(customer.leadGrade, LeadGradeLabel)}
            className={customer.leadGrade === "A" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"} />
          <span className="text-sm text-gray-500">{customer.businessLine.name}</span>
          {customer.source && <span className="text-sm text-gray-500">来源: {formatEnumLabel(customer.source, LeadSourceLabel)}</span>}
        </div>

        {/* 快捷操作 */}
        <div className="flex flex-wrap gap-2">
          <Link href={`/follow-ups/new?customerId=${customer.id}`}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">
            <Plus size={14} /> 新建跟进
          </Link>
          <Link href={`/projects/new?customerId=${customer.id}`}
            className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700">
            <Plus size={14} /> 新建项目
          </Link>
          <Link href={`/quotes/new?customerId=${customer.id}`}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> 新建报价
          </Link>
          <Link href={`/tasks/new?customerId=${customer.id}`}
            className="flex items-center gap-2 bg-orange-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-700">
            <Plus size={14} /> 新建任务
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基础信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">公司：</span><span className="font-medium">{customer.company}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">联系人：</span>{customer.contactName}</div>
            <div className="flex justify-between"><span className="text-gray-500">国家：</span>{customer.country || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">电话：</span>{customer.phone || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">邮箱：</span>{customer.email || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">WhatsApp：</span>{customer.whatsapp || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">网站：</span>{customer.website ? <a href={customer.website} target="_blank" className="text-blue-600 hover:underline">{customer.website}</a> : "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">行业：</span>{customer.industry || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">客户类型：</span>{formatEnumLabel(customer.customerType, CustomerTypeLabel)}</div>
            <div className="flex justify-between"><span className="text-gray-500">地址：</span>{customer.address || "-"}</div>
          </div>
          {customer.remark && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-gray-500 text-sm mb-1">备注：</p>
              <p className="text-sm">{customer.remark}</p>
            </div>
          )}
        </div>

        {/* 跟进概览 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">跟进概览</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">最近跟进：</span>
              <span>{lastFollowUp ? formatDate(lastFollowUp.followUpDate) : "暂无"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">下次跟进：</span>
              <span className={nextFollowUp?.nextFollowUpDate ? "text-blue-600 font-medium" : ""}>
                {nextFollowUp?.nextFollowUpDate ? formatDate(nextFollowUp.nextFollowUpDate) : nextTask?.dueDate ? formatDate(nextTask.dueDate) : "暂无"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">跟进记录数：</span>
              <span>{customer.followUps.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">待办任务数：</span>
              <span>{customer.tasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 关联项目 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联项目 ({customer.projects.length})</h2>
          <Link href={`/projects/new?customerId=${customer.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增项目
          </Link>
        </div>
        {customer.projects.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联项目</p>
        ) : (
          <div className="space-y-2">
            {customer.projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <Link href={`/projects/${p.id}`} className="font-medium hover:text-blue-600">{p.name}</Link>
                  {p.productName && <span className="ml-2 text-sm text-gray-500">{p.productName}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {p.amount && <span className="text-sm font-medium">{formatMoney(p.amount ? Number(p.amount) : null, p.currency)}</span>}
                  <Badge label={formatEnumLabel(p.status, ProjectStatusLabel)} className="bg-blue-100 text-blue-700" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 关联报价 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">关联报价 ({customer.quotes.length})</h2>
          <Link href={`/quotes/new?customerId=${customer.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增报价
          </Link>
        </div>
        {customer.quotes.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无关联报价</p>
        ) : (
          <div className="space-y-2">
            {customer.quotes.map((q) => (
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

      {/* 最近跟进记录 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近跟进记录 ({customer.followUps.length})</h2>
          <Link href={`/follow-ups/new?customerId=${customer.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增跟进
          </Link>
        </div>
        {customer.followUps.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无跟进记录</p>
        ) : (
          <div className="space-y-3">
            {customer.followUps.slice(0, 5).map((fu) => (
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

      {/* 待办任务 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">待办任务 ({customer.tasks.length})</h2>
          <Link href={`/tasks/new?customerId=${customer.id}`} className="text-blue-600 hover:underline text-sm">
            + 新增任务
          </Link>
        </div>
        {customer.tasks.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无待办任务</p>
        ) : (
          <div className="space-y-2">
            {customer.tasks.map((task) => (
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

      {/* AI 复盘 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">AI 复盘</h2>
        <AIAnalysisButton
          action={async () => {
            "use server";
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
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">
              最近一次复盘：{new Date(latestAnalysis.createdAt).toLocaleString("zh-CN")}
            </p>
            <AIAnalysisResult
              analysis={latestAnalysis}
              onAppendToNotes={
                latestAnalysis.summary
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
                latestAnalysis.nextAction
                  ? async () => {
                      "use server";
                      await createTaskFromAI("customer", customerId, latestAnalysis.nextAction!);
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
