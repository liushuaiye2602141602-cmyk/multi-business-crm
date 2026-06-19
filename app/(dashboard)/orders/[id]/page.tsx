import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, ArrowLeft } from "lucide-react";
import { OrderStatusLabel, ProjectStatusLabel, QuoteStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import { getOrderStatusVariant, getProjectStatusVariant, getQuoteStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: true,
      project: true,
      quote: true,
      contact: true,
      items: { orderBy: { sortOrder: "asc" } },
      orderCharges: { orderBy: { sortOrder: "asc" } },
      invoices: {
        include: { payments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) return notFound();

  const currency = order.currency || "USD";

  // Calculate payment summary
  let totalInvoiced = 0;
  let totalPaid = 0;
  for (const invoice of order.invoices) {
    totalInvoiced += Number(invoice.amount || 0);
    for (const payment of invoice.payments) {
      totalPaid += Number(payment.amount || 0);
    }
  }

  // Calculate item discount and tax totals
  let itemSubtotal = 0;
  let itemDiscountTotal = 0;
  let itemTaxTotal = 0;
  for (const item of order.items) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unitPrice || 0);
    const lineSubtotal = qty * price;
    itemSubtotal += lineSubtotal;

    const discType = item.discountType;
    const discVal = Number(item.discountValue || 0);
    let discAmt = 0;
    if (discType === "PERCENTAGE") {
      discAmt = lineSubtotal * (discVal / 100);
    } else {
      discAmt = discVal;
    }
    itemDiscountTotal += discAmt;

    const taxable = lineSubtotal - discAmt;
    const taxRate = Number(item.taxRate || 0);
    itemTaxTotal += taxable * (taxRate / 100);
  }

  // Calculate charge total
  let chargeTotal = 0;
  let chargeTaxTotal = 0;
  for (const charge of order.orderCharges) {
    chargeTotal += Number(charge.amount || 0);
    if (charge.taxable) {
      chargeTaxTotal += Number(charge.taxAmount || 0);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`订单 ${order.orderNo}`}
        backHref="/orders"
        actions={
          <Link href={`/orders/${order.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil size={14} /> 编辑
          </Link>
        }
      />

      {/* Order Overview */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <StatusBadge label={OrderStatusLabel[order.orderStatus] || order.orderStatus} variant={getOrderStatusVariant(order.orderStatus)} size="md" />
          {order.totalAmount && (
            <span className="text-xl font-bold">{formatMoney(Number(order.totalAmount), currency)}</span>
          )}
          {order.grossProfitRate != null && (
            <span className={`text-sm font-medium ${Number(order.grossProfitRate) >= 0 ? "text-green-600" : "text-red-600"}`}>
              毛利率 {Number(order.grossProfitRate).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">订单号：</span><span className="font-medium">{order.orderNo}</span></div>
          <div><span className="text-gray-500">客户：</span><Link href={`/customers/${order.customerId}`} className="text-blue-600 hover:underline">{order.customer.company}</Link></div>
          {order.project && <div><span className="text-gray-500">项目：</span><Link href={`/projects/${order.projectId}`} className="text-blue-600 hover:underline">{order.project.name}</Link></div>}
          {order.quote && <div><span className="text-gray-500">报价：</span><Link href={`/quotes/${order.quoteId}`} className="text-blue-600 hover:underline">{order.quote.quoteNo}</Link></div>}
          {order.contact && <div><span className="text-gray-500">联系人：</span><Link href={`/contacts/${order.contactId}`} className="text-blue-600 hover:underline">{order.contact.name}</Link></div>}
          {order.ownerName && <div><span className="text-gray-500">负责人：</span>{order.ownerName}</div>}
          <div><span className="text-gray-500">创建时间：</span>{formatDate(order.createdAt)}</div>
        </div>
      </Card>

      {/* Financial Summary */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">财务摘要</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">小计</p>
            <p className="font-medium">{order.subtotal != null ? formatMoney(Number(order.subtotal), currency) : formatMoney(itemSubtotal, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">折扣</p>
            <p className="font-medium">{order.discountAmount != null ? formatMoney(Number(order.discountAmount), currency) : formatMoney(itemDiscountTotal, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">税额</p>
            <p className="font-medium">{order.taxAmount != null ? formatMoney(Number(order.taxAmount), currency) : formatMoney(itemTaxTotal, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">附加费用</p>
            <p className="font-medium">{order.chargeAmount != null ? formatMoney(Number(order.chargeAmount), currency) : formatMoney(chargeTotal, currency)}</p>
          </div>
          {order.costAmount != null && Number(order.costAmount) > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500">成本</p>
                <p className="font-medium">{formatMoney(Number(order.costAmount), currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">毛利润</p>
                <p className={`font-medium ${Number(order.grossProfitAmount || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(Number(order.grossProfitAmount || 0), currency)}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Info */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">订单信息</h3>
          <div className="space-y-1">
            <DetailField label="订单标题" value={order.orderTitle} />
            <DetailField label="付款条件" value={order.paymentTerm} />
            <DetailField label="付款方式" value={order.paymentMethod} />
            <DetailField label="价格条款" value={order.priceTerm} />
            <DetailField label="交货条款" value={order.deliveryTerm} />
            <DetailField label="预计交期" value={formatDate(order.expectedDeliveryDate)} />
            {order.actualDeliveryDate && <DetailField label="实际交期" value={formatDate(order.actualDeliveryDate)} />}
            <DetailField label="币种" value={order.currency} />
            {order.shippingAddress && <DetailField label="收货地址" value={order.shippingAddress} />}
          </div>
          {order.notes && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">备注</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </Card>

        {/* Related Info */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">关联信息</h3>
          <div className="space-y-3">
            {order.project && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">关联项目</p>
                <Link href={`/projects/${order.projectId}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {order.project.name}
                </Link>
                <StatusBadge label={ProjectStatusLabel[order.project.status] || order.project.status} variant={getProjectStatusVariant(order.project.status)} />
              </div>
            )}
            {order.quote && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">关联报价</p>
                <Link href={`/quotes/${order.quoteId}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {order.quote.quoteNo}
                </Link>
                <StatusBadge label={QuoteStatusLabel[order.quote.status] || order.quote.status} variant={getQuoteStatusVariant(order.quote.status)} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Payment Summary */}
      {(order.invoices.length > 0 || order.paidAmount != null) && (
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">收款概况</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-xs text-gray-500">应收金额</p>
              <p className="font-medium">{formatMoney(Number(order.totalAmount || 0), currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">已开票</p>
              <p className="font-medium">{formatMoney(totalInvoiced, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">已收款</p>
              <p className="font-medium text-green-600">{formatMoney(totalPaid, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">未收金额</p>
              <p className={`font-medium ${Number(order.outstandingAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatMoney(Number(order.outstandingAmount || Math.max(0, Number(order.totalAmount || 0) - totalPaid)), currency)}
              </p>
            </div>
          </div>

          {/* Payment progress bar */}
          {Number(order.totalAmount || 0) > 0 && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalPaid / Number(order.totalAmount || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                已收款 {((totalPaid / Number(order.totalAmount || 1)) * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {order.invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">发票号</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">金额</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">状态</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">已付</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">开具日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.invoices.map((invoice) => {
                    const invoicePaid = invoice.payments.reduce(
                      (sum, p) => sum + Number(p.amount || 0), 0
                    );
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <Link href={`/finance/invoices/${invoice.id}`} className="text-blue-600 hover:underline">
                            {invoice.invoiceNo}
                          </Link>
                        </td>
                        <td className="py-2 px-3 font-medium">{formatMoney(Number(invoice.amount), currency)}</td>
                        <td className="py-2 px-3">{invoice.status}</td>
                        <td className="py-2 px-3">{formatMoney(invoicePaid, currency)}</td>
                        <td className="py-2 px-3 text-gray-500">{formatDate(invoice.issuedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">订单明细</h3>
        {order.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">暂无订单明细</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">产品名称</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">规格</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">数量</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">单位</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">单价</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">折扣</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">税额</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">小计</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{item.itemName}</td>
                    <td className="py-2 px-3 text-gray-600">{item.specification || "-"}</td>
                    <td className="py-2 px-3 text-gray-600 text-right">{item.quantity ? Number(item.quantity) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.unit || "-"}</td>
                    <td className="py-2 px-3 text-gray-600 text-right">{item.unitPrice ? formatMoney(Number(item.unitPrice), currency) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600 text-right">
                      {item.discountAmount != null && Number(item.discountAmount) > 0
                        ? formatMoney(Number(item.discountAmount), currency)
                        : "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-600 text-right">
                      {item.taxAmount != null && Number(item.taxAmount) > 0
                        ? formatMoney(Number(item.taxAmount), currency)
                        : "-"}
                    </td>
                    <td className="py-2 px-3 font-medium text-right">{item.totalPrice ? formatMoney(Number(item.totalPrice), currency) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-medium">
                  <td colSpan={6} className="py-2 px-3 text-right text-gray-700">合计：</td>
                  <td className="py-2 px-3 text-right">{formatMoney(itemTaxTotal, currency)}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(itemSubtotal, currency)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Order Charges */}
      {order.orderCharges.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">附加费用</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">费用类型</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">名称</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">说明</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">金额</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">含税</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">税额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.orderCharges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">{charge.type}</td>
                    <td className="py-2 px-3 font-medium">{charge.name}</td>
                    <td className="py-2 px-3 text-gray-600">{charge.description || "-"}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatMoney(Number(charge.amount), currency)}</td>
                    <td className="py-2 px-3 text-center">{charge.taxable ? "是" : "否"}</td>
                    <td className="py-2 px-3 text-right">
                      {charge.taxable && charge.taxAmount != null
                        ? formatMoney(Number(charge.taxAmount), currency)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-medium">
                  <td colSpan={3} className="py-2 px-3 text-right text-gray-700">合计：</td>
                  <td className="py-2 px-3 text-right">{formatMoney(chargeTotal, currency)}</td>
                  <td></td>
                  <td className="py-2 px-3 text-right">{formatMoney(chargeTaxTotal, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
