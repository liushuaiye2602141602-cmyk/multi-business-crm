import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus, Download } from "lucide-react";
import { deleteQuote } from "./actions";
import { QuoteStatusLabel, CurrencyLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import { getQuoteStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const status = typeof params.status === "string" ? params.status : "";
  const currency = typeof params.currency === "string" ? params.currency : "";
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { quoteNo: { contains: search, mode: "insensitive" } },
      { productName: { contains: search, mode: "insensitive" } },
      { specs: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (currency) where.currency = currency;
  if (customerId) where.customerId = parseInt(customerId);

  const [quotes, customers] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { lead: true, customer: true, project: true },
    }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
  ]);

  const hasFilters = search || status || currency || customerId;

  return (
    <div>
      <PageHeader
        title="报价记录"
        description="管理报价信息、金额、状态和反馈进度"
        actions={
          <>
            <a href="/api/export/quotes" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} />
              导出 CSV
            </a>
            <Link href="/quotes/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              新增报价
            </Link>
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索报价编号、产品名称、规格..."
        filters={[
          { name: "status", label: "状态", options: Object.entries(QuoteStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "currency", label: "币种", options: Object.entries(CurrencyLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerId", label: "客户", options: customers.map((c) => ({ value: String(c.id), label: c.company })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ status, currency, customerId }}
      />

      <Card padding="none">
        {quotes.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的报价" : "暂无报价"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增报价开始记录"}
            actionLabel={hasFilters ? undefined : "新增报价"}
            actionHref={hasFilters ? undefined : "/quotes/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">报价编号</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">客户</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">产品</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">总价</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/quotes/${quote.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {quote.quoteNo}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {quote.customer?.company || quote.lead?.company || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{quote.productName || "-"}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatMoney(quote.totalPrice ? Number(quote.totalPrice) : null, quote.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={QuoteStatusLabel[quote.status] || quote.status} variant={getQuoteStatusVariant(quote.status)} />
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(quote.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/quotes/${quote.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/quotes/${quote.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteQuote(quote.id); }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
