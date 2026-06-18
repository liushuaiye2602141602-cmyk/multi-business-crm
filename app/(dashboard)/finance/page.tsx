import Link from "next/link";
import prisma from "@/lib/prisma";
import { Plus } from "lucide-react";
import { InvoiceStatusLabel, CurrencyLabel } from "@/lib/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { getInvoiceStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = parseInt(customerId);

  const now = new Date();

  const [invoices, customers, totalInvoiced, totalPaid, totalOutstanding, overdueCount] =
    await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, company: true } },
          order: { select: { id: true, orderNo: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.customer.findMany({ orderBy: { company: "asc" } }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: { not: "CANCELLED" } },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: { in: ["SENT", "DRAFT", "OVERDUE"] } },
      }),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
    ]);

  const hasFilters = status || customerId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="财务管理"
        description="管理发票和收款记录"
        actions={
          <Link
            href="/finance/invoices/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            新增发票
          </Link>
        }
      />

      {/* 概览统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">开票总额</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatMoney(Number(totalInvoiced._sum.amount || 0), "USD")}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">已收款</p>
          <p className="text-2xl font-bold text-green-600">
            {formatMoney(Number(totalPaid._sum.amount || 0), "USD")}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">待收款</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatMoney(Number(totalOutstanding._sum.amount || 0), "USD")}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">逾期发票</p>
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
        </Card>
      </div>

      <SearchFilterBar
        searchPlaceholder="搜索发票号..."
        filters={[
          {
            name: "status",
            label: "状态",
            options: Object.entries(InvoiceStatusLabel).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            name: "customerId",
            label: "客户",
            options: customers.map((c) => ({ value: String(c.id), label: c.company })),
          },
        ]}
        defaultFilters={{ status, customerId }}
      />

      {/* 发票列表 */}
      <Card padding="none">
        {invoices.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的发票" : "暂无发票"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增发票开始记录"}
            actionLabel={hasFilters ? undefined : "新增发票"}
            actionHref={hasFilters ? undefined : "/finance/invoices/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    发票号
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    客户
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    金额
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    已收
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    到期日
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    关联订单
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const paidAmount = invoice.payments.reduce(
                    (sum, p) => sum + Number(p.amount),
                    0
                  );
                  const totalAmount = Number(invoice.amount);
                  const progress =
                    totalAmount > 0
                      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
                      : 0;

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/finance/invoices/${invoice.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {invoice.invoiceNo}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/customers/${invoice.customerId}`}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          {invoice.customer.company}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          label={InvoiceStatusLabel[invoice.status] || invoice.status}
                          variant={getInvoiceStatusVariant(invoice.status)}
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatMoney(Number(invoice.amount), invoice.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-600">
                            {formatMoney(paidAmount, invoice.currency)}
                          </span>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progress >= 100
                                  ? "bg-green-500"
                                  : progress > 0
                                  ? "bg-blue-500"
                                  : "bg-gray-300"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {invoice.order ? (
                          <Link
                            href={`/orders/${invoice.orderId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {invoice.order.orderNo}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/finance/invoices/${invoice.id}`}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            详情
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
