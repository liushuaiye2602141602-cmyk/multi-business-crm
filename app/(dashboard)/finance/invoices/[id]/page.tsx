import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { InvoiceStatusLabel, PaymentMethodLabel } from "@/lib/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { getInvoiceStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import RecordPaymentForm from "./RecordPaymentForm";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: true,
      order: { include: { items: true } },
      payments: { orderBy: { receivedAt: "desc" } },
    },
  });

  if (!invoice) return notFound();

  const paidAmount = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalAmount = Number(invoice.amount);
  const progress =
    totalAmount > 0
      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
      : 0;
  const isPaid = invoice.status === "PAID";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`发票 ${invoice.invoiceNo}`}
        backHref="/finance"
      />

      {/* 发票概览 */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <StatusBadge
            label={InvoiceStatusLabel[invoice.status] || invoice.status}
            variant={getInvoiceStatusVariant(invoice.status)}
            size="md"
          />
          <span className="text-xl font-bold">
            {formatMoney(Number(invoice.amount), invoice.currency)}
          </span>
          {paidAmount > 0 && !isPaid && (
            <span className="text-sm text-gray-500">
              (已收: {formatMoney(paidAmount, invoice.currency)})
            </span>
          )}
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>收款进度</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">发票号：</span>
            <span className="font-medium">{invoice.invoiceNo}</span>
          </div>
          <div>
            <span className="text-gray-500">客户：</span>
            <Link
              href={`/customers/${invoice.customerId}`}
              className="text-blue-600 hover:underline"
            >
              {invoice.customer.company}
            </Link>
          </div>
          {invoice.order && (
            <div>
              <span className="text-gray-500">关联订单：</span>
              <Link
                href={`/orders/${invoice.orderId}`}
                className="text-blue-600 hover:underline"
              >
                {invoice.order.orderNo}
              </Link>
            </div>
          )}
          <div>
            <span className="text-gray-500">创建时间：</span>
            {formatDate(invoice.createdAt)}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 发票信息 */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
            发票信息
          </h3>
          <div className="space-y-1">
            <DetailField label="发票号" value={invoice.invoiceNo} />
            <DetailField
              label="金额"
              value={formatMoney(Number(invoice.amount), invoice.currency)}
            />
            <DetailField label="币种" value={invoice.currency} />
            <DetailField
              label="开票日期"
              value={formatDate(invoice.issuedAt)}
            />
            <DetailField label="到期日" value={formatDate(invoice.dueDate)} />
            <DetailField
              label="付款日期"
              value={formatDate(invoice.paidAt)}
            />
          </div>
          {invoice.notes && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">备注</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </Card>

        {/* 收款表单 (仅未完成状态显示) */}
        {!isPaid && invoice.status !== "CANCELLED" && (
          <RecordPaymentForm invoiceId={invoice.id} currency={invoice.currency} />
        )}
      </div>

      {/* 收款记录 */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
          收款记录
        </h3>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">暂无收款记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    收款日期
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    金额
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    收款方式
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    备注
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3">{formatDate(payment.receivedAt)}</td>
                    <td className="py-2 px-3 font-medium">
                      {formatMoney(Number(payment.amount), invoice.currency)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {PaymentMethodLabel[payment.method] || payment.method}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 关联订单明细 */}
      {invoice.order && invoice.order.items.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
            关联订单明细
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    产品
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    数量
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    单价
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    总价
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{item.itemName}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {item.quantity ? Number(item.quantity) : "-"} {item.unit || ""}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {item.unitPrice
                        ? formatMoney(Number(item.unitPrice), invoice.currency)
                        : "-"}
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {item.totalPrice
                        ? formatMoney(Number(item.totalPrice), invoice.currency)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
