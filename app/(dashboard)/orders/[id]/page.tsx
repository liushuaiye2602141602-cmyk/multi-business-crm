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
    },
  });

  if (!order) return notFound();

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

      {/* 订单概览 */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <StatusBadge label={OrderStatusLabel[order.orderStatus] || order.orderStatus} variant={getOrderStatusVariant(order.orderStatus)} size="md" />
          {order.totalAmount && (
            <span className="text-xl font-bold">{formatMoney(Number(order.totalAmount), order.currency)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">订单号：</span><span className="font-medium">{order.orderNo}</span></div>
          <div><span className="text-gray-500">客户：</span><Link href={`/customers/${order.customerId}`} className="text-blue-600 hover:underline">{order.customer.company}</Link></div>
          {order.project && <div><span className="text-gray-500">项目：</span><Link href={`/projects/${order.projectId}`} className="text-blue-600 hover:underline">{order.project.name}</Link></div>}
          {order.quote && <div><span className="text-gray-500">报价：</span><Link href={`/quotes/${order.quoteId}`} className="text-blue-600 hover:underline">{order.quote.quoteNo}</Link></div>}
          {order.contact && <div><span className="text-gray-500">联系人：</span><Link href={`/contacts/${order.contactId}`} className="text-blue-600 hover:underline">{order.contact.name}</Link></div>}
          <div><span className="text-gray-500">创建时间：</span>{formatDate(order.createdAt)}</div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 订单信息 */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">订单信息</h3>
          <div className="space-y-1">
            <DetailField label="订单标题" value={order.orderTitle} />
            <DetailField label="付款方式" value={order.paymentTerm} />
            <DetailField label="交货条款" value={order.deliveryTerm} />
            <DetailField label="预计交期" value={formatDate(order.expectedDeliveryDate)} />
            <DetailField label="币种" value={order.currency} />
          </div>
          {order.notes && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">备注</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </Card>

        {/* 关联信息 */}
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

      {/* 订单明细 */}
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
                  <th className="text-left py-2 px-3 font-medium text-gray-600">数量</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">单位</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">单价</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">总价</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{item.itemName}</td>
                    <td className="py-2 px-3 text-gray-600">{item.specification || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.quantity ? Number(item.quantity) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.unit || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.unitPrice ? formatMoney(Number(item.unitPrice), order.currency) : "-"}</td>
                    <td className="py-3 px-3 font-medium">{item.totalPrice ? formatMoney(Number(item.totalPrice), order.currency) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.notes || "-"}</td>
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
