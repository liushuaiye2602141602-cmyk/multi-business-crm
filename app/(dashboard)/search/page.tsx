import prisma from "@/lib/prisma";
import Link from "next/link";
import { Search, Users, UserCheck, FolderKanban, FileText, CheckSquare, MessageSquare, Package, Sparkles, Webhook, ExternalLink } from "lucide-react";
import { LeadStatusLabel, LeadGradeLabel, ProjectStatusLabel, QuoteStatusLabel, TaskStatusLabel, TaskPriorityLabel, WebhookStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import { getLeadStatusVariant, getLeadGradeVariant, getProjectStatusVariant, getQuoteStatusVariant, getTaskStatusVariant, getTaskPriorityVariant, getWebhookStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SearchInput from "@/components/SearchInput";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  if (!query) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">全局搜索</h1>
        <p className="text-sm text-gray-500 mb-6">快速查找客户、线索、商机项目、报价、任务、跟进记录、AI 分析和外部线索日志</p>
        <SearchInput placeholder="搜索公司名、客户名、邮箱、WhatsApp、产品、项目、报价编号、任务..." />
        <div className="mt-8 text-center text-gray-400">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p>输入关键词开始搜索</p>
        </div>
      </div>
    );
  }

  const searchQuery = { contains: query, mode: "insensitive" as const };

  const [leads, customers, projects, quotes, followUps, tasks, products, analyses, webhookLogs, externalSources] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { company: searchQuery },
          { contactName: searchQuery },
          { email: searchQuery },
          { whatsapp: searchQuery },
          { country: searchQuery },
          { interestProducts: searchQuery },
          { inquiryContent: searchQuery },
        ],
      },
      take: 10,
      include: { businessLine: true },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { company: searchQuery },
          { contactName: searchQuery },
          { email: searchQuery },
          { whatsapp: searchQuery },
          { country: searchQuery },
        ],
      },
      take: 10,
      include: { businessLine: true },
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { name: searchQuery },
          { productName: searchQuery },
          { description: searchQuery },
          { specialRequirements: searchQuery },
        ],
      },
      take: 10,
      include: { customer: true, businessLine: true },
    }),
    prisma.quote.findMany({
      where: {
        OR: [
          { quoteNo: searchQuery },
          { productName: searchQuery },
          { specs: searchQuery },
          { content: searchQuery },
        ],
      },
      take: 10,
      include: { customer: true },
    }),
    prisma.followUp.findMany({
      where: {
        OR: [
          { content: searchQuery },
          { customerFeedback: searchQuery },
          { nextAction: searchQuery },
          { remark: searchQuery },
        ],
      },
      take: 10,
      include: { lead: true, customer: true, project: true },
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { title: searchQuery },
          { description: searchQuery },
        ],
      },
      take: 10,
      include: { lead: true, customer: true, project: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: searchQuery },
          { category: searchQuery },
          { englishKeywords: searchQuery },
          { application: searchQuery },
        ],
      },
      take: 10,
      include: { businessLine: true },
    }),
    prisma.aIAnalysis.findMany({
      where: {
        OR: [
          { title: searchQuery },
          { summary: searchQuery },
          { nextAction: searchQuery },
        ],
      },
      take: 10,
    }),
    prisma.webhookLog.findMany({
      where: {
        OR: [
          { sourceCode: searchQuery },
          { errorMessage: searchQuery },
        ],
      },
      take: 10,
    }),
    prisma.externalSource.findMany({
      where: {
        OR: [
          { name: searchQuery },
          { code: searchQuery },
        ],
      },
      take: 10,
    }),
  ]);

  const totalResults = leads.length + customers.length + projects.length + quotes.length + followUps.length + tasks.length + products.length + analyses.length + webhookLogs.length + externalSources.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">全局搜索</h1>
      <p className="text-sm text-gray-500 mb-4">搜索 &quot;{query}&quot; 的结果 ({totalResults})</p>
      <SearchInput placeholder="搜索公司名、客户名、邮箱、WhatsApp、产品、项目..." defaultValue={query} />

      {totalResults === 0 ? (
        <div className="mt-8">
          <EmptyState message="没有找到匹配的结果" description="请尝试不同的关键词" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Leads */}
          {leads.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-blue-500" />
                <h2 className="text-base font-semibold">线索 ({leads.length})</h2>
              </div>
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {lead.company}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lead.contactName} · {lead.country || "-"} · {lead.businessLine.name}
                        {lead.interestProducts && ` · ${lead.interestProducts}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <StatusBadge label={LeadGradeLabel[lead.grade] || lead.grade} variant={getLeadGradeVariant(lead.grade)} />
                      <StatusBadge label={LeadStatusLabel[lead.status] || lead.status} variant={getLeadStatusVariant(lead.status)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <UserCheck size={18} className="text-green-500" />
                <h2 className="text-base font-semibold">客户 ({customers.length})</h2>
              </div>
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {customer.company}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {customer.contactName} · {customer.country || "-"} · {customer.businessLine.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <StatusBadge label={LeadGradeLabel[customer.leadGrade] || customer.leadGrade} variant={getLeadGradeVariant(customer.leadGrade)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <FolderKanban size={18} className="text-purple-500" />
                <h2 className="text-base font-semibold">商机项目 ({projects.length})</h2>
              </div>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <Link href={`/projects/${project.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {project.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {project.customer.company} · {project.productName || "-"} · {project.businessLine.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {project.amount && <span className="text-sm font-medium">{formatMoney(Number(project.amount), project.currency)}</span>}
                      <StatusBadge label={ProjectStatusLabel[project.status] || project.status} variant={getProjectStatusVariant(project.status)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quotes */}
          {quotes.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-indigo-500" />
                <h2 className="text-base font-semibold">报价 ({quotes.length})</h2>
              </div>
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <Link href={`/quotes/${quote.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {quote.quoteNo}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {quote.productName || "-"} · {quote.customer?.company || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-medium">{formatMoney(quote.totalPrice ? Number(quote.totalPrice) : null, quote.currency)}</span>
                      <StatusBadge label={QuoteStatusLabel[quote.status] || quote.status} variant={getQuoteStatusVariant(quote.status)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare size={18} className="text-orange-500" />
                <h2 className="text-base font-semibold">任务 ({tasks.length})</h2>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {task.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <StatusBadge label={TaskStatusLabel[task.status] || task.status} variant={getTaskStatusVariant(task.status)} />
                      <StatusBadge label={TaskPriorityLabel[task.priority] || task.priority} variant={getTaskPriorityVariant(task.priority)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* FollowUps */}
          {followUps.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={18} className="text-green-500" />
                <h2 className="text-base font-semibold">跟进记录 ({followUps.length})</h2>
              </div>
              <div className="space-y-2">
                {followUps.map((fu) => (
                  <div key={fu.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {fu.customer?.company || fu.lead?.company || fu.project?.name || "-"}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(fu.followUpDate)}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{fu.content}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Products */}
          {products.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Package size={18} className="text-indigo-500" />
                <h2 className="text-base font-semibold">产品 ({products.length})</h2>
              </div>
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${product.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate">
                        {product.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {product.businessLine.name} · {product.category || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* AI Analyses */}
          {analyses.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-pink-500" />
                <h2 className="text-base font-semibold">AI 分析 ({analyses.length})</h2>
              </div>
              <div className="space-y-2">
                {analyses.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <Link href={`/ai-analyses/${a.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block">
                      {a.title || "未命名分析"}
                    </Link>
                    <p className="text-xs text-gray-600 mt-1 truncate">{a.summary || "-"}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Webhook Logs */}
          {webhookLogs.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Webhook size={18} className="text-teal-500" />
                <h2 className="text-base font-semibold">Webhook 日志 ({webhookLogs.length})</h2>
              </div>
              <div className="space-y-2">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={WebhookStatusLabel[log.status] || log.status} variant={getWebhookStatusVariant(log.status)} />
                      <span className="text-xs text-gray-600">{log.sourceCode || "-"}</span>
                    </div>
                    <Link href={`/webhook-logs/${log.id}`} className="text-xs text-blue-600 hover:underline">
                      查看
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* External Sources */}
          {externalSources.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink size={18} className="text-gray-500" />
                <h2 className="text-base font-semibold">外部来源 ({externalSources.length})</h2>
              </div>
              <div className="space-y-2">
                {externalSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <Link href={`/external-sources/${source.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                      {source.name}
                    </Link>
                    <StatusBadge label={source.isActive ? "启用" : "停用"} variant={source.isActive ? "success" : "default"} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
