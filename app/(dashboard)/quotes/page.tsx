import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Download } from "lucide-react";
import { deleteQuote } from "./actions";
import { QuoteStatusLabel, CurrencyLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">报价管理</h1>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/quotes"
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download size={16} />
            导出 CSV
          </a>
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            新增报价
          </Link>
        </div>
      </div>

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

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">报价编号</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">客户</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">产品</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">总价</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">创建时间</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">
                  <Link href={`/quotes/${quote.id}`} className="hover:text-blue-600">{quote.quoteNo}</Link>
                </td>
                <td className="py-3 px-4">
                  {quote.customer ? (
                    <Link href={`/customers/${quote.customerId}`} className="hover:text-blue-600">{quote.customer.company}</Link>
                  ) : quote.lead ? (
                    <Link href={`/leads/${quote.leadId}`} className="hover:text-blue-600">{quote.lead.company}</Link>
                  ) : "-"}
                </td>
                <td className="py-3 px-4">{quote.productName || "-"}</td>
                <td className="py-3 px-4 font-medium">{formatMoney(quote.totalPrice ? Number(quote.totalPrice) : null, quote.currency)}</td>
                <td className="py-3 px-4">
                  <Badge label={formatEnumLabel(quote.status, QuoteStatusLabel)}
                    className={quote.status === "ACCEPTED" ? "bg-green-100 text-green-700" : quote.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"} />
                </td>
                <td className="py-3 px-4 text-gray-500">{formatDate(quote.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/quotes/${quote.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Eye size={16} />
                    </Link>
                    <Link href={`/quotes/${quote.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteQuote(quote.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的报价" : "暂无报价，请点击右上角新增报价开始记录"}
                    actionLabel={hasFilters ? undefined : "新增报价"}
                    actionHref={hasFilters ? undefined : "/quotes/new"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
