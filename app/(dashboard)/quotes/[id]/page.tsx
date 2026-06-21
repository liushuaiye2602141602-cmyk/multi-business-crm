import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, CheckCircle, Plus, Trash2 } from "lucide-react";
import { QuoteStatusLabel, ProjectStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import StatusBadge from "@/components/ui/StatusBadge";
import { getQuoteStatusVariant } from "@/components/ui/StatusBadge";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { deleteQuoteItem } from "./items/actions";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quoteId = parseInt(id);

  const [quote, relatedOrders, relatedDocuments] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lead: true,
        customer: true,
        project: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.order.findMany({ where: { quoteId }, orderBy: { createdAt: "desc" } }),
    prisma.document.findMany({ where: { relatedType: "QUOTE", relatedId: quoteId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!quote) return notFound();

  // 计算明细合计
  const itemsTotal = quote.items.reduce((sum, item) => sum + (item.totalPrice ? Number(item.totalPrice) : 0), 0);
  const quoteTotal = quote.totalPrice ? Number(quote.totalPrice) : 0;
  const showTotalWarning = quote.items.length > 0 && Math.abs(itemsTotal - quoteTotal) > 0.01;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`报价 ${quote.quoteNo}`}
        backHref="/quotes"
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/quotes/${quote.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Pencil size={14} /> 编辑
            </Link>
            {quote.status === "ACCEPTED" && !relatedOrders.length && (
              <Link href={`/orders/new?quoteId=${quote.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
                创建订单
              </Link>
            )}
          </div>
        }
      />

      {/* 报价状态提示 */}
      {quote.status === "ACCEPTED" && quote.project && quote.project.status !== "WON" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-green-800">
              报价已接受！项目状态为"{formatEnumLabel(quote.project.status, ProjectStatusLabel)}"，
              您可以在项目详情页将其标记为成交。
            </span>
            <Link href={`/projects/${quote.projectId}`} className="text-green-600 hover:underline ml-2">
              查看项目 →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础信息 */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">基础信息</h3>
          <div className="space-y-1">
            <DetailField label="报价编号" value={quote.quoteNo} />
            <DetailField label="状态" value={<StatusBadge label={QuoteStatusLabel[quote.status] || quote.status} variant={getQuoteStatusVariant(quote.status)} />} />
            <DetailField label="客户" value={quote.customer ? <Link href={`/customers/${quote.customerId}`} className="text-blue-600 hover:underline">{quote.customer.company}</Link> : quote.lead ? <Link href={`/leads/${quote.leadId}`} className="text-blue-600 hover:underline">{quote.lead.company}</Link> : null} />
            {quote.project && <DetailField label="项目" value={<Link href={`/projects/${quote.projectId}`} className="text-blue-600 hover:underline">{quote.project.name}</Link>} />}
            <DetailField label="创建时间" value={formatDate(quote.createdAt)} />
            <DetailField label="更新时间" value={formatDate(quote.updatedAt)} />
          </div>
        </Card>

        {/* 产品信息 */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">产品信息</h3>
          <div className="space-y-1">
            <DetailField label="产品名称" value={quote.productName} />
            <DetailField label="规格" value={quote.specs} />
            <DetailField label="数量" value={quote.quantity} />
            <DetailField label="单价" value={quote.unitPrice ? formatMoney(Number(quote.unitPrice), quote.currency) : null} />
            <DetailField label="总价" value={<span className="text-lg font-bold">{formatMoney(quote.totalPrice ? Number(quote.totalPrice) : null, quote.currency)}</span>} />
            <DetailField label="币种" value={quote.currency} />
          </div>
        </Card>
      </div>

      {/* 商务条款 */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">商务条款</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">付款方式：</span>{quote.paymentTerms || "-"}</div>
          <div><span className="text-gray-500">交期：</span>{quote.deliveryTime || "-"}</div>
          <div><span className="text-gray-500">有效期：</span>{formatDate(quote.validUntil)}</div>
        </div>
        {quote.content && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-gray-500 text-sm mb-1">报价详情：</p>
            <p className="text-sm">{quote.content}</p>
          </div>
        )}
      </Card>

      {/* 报价明细 */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">报价明细 ({quote.items.length})</h3>
          <Link href={`/quotes/${quote.id}/items/new`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={14} /> 新增明细
          </Link>
        </div>
        {showTotalWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">报价明细合计 ({formatMoney(itemsTotal, quote.currency)}) 与报价总金额 ({formatMoney(quoteTotal, quote.currency)}) 不一致，请检查。</p>
          </div>
        )}
        {quote.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">暂无报价明细</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">#</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">产品名称</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">规格</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">数量</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">单位</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">单价</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">总价</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">备注</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quote.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium">{item.itemName}</td>
                    <td className="py-2 px-3 text-gray-600">{item.specification || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.quantity ? Number(item.quantity) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.unit || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{item.unitPrice ? formatMoney(Number(item.unitPrice), quote.currency) : "-"}</td>
                    <td className="py-2 px-3 font-medium">{item.totalPrice ? formatMoney(Number(item.totalPrice), quote.currency) : "-"}</td>
                    <td className="py-2 px-3 text-gray-600 max-w-[150px] truncate">{item.notes || "-"}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/quotes/${quote.id}/items/${item.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={14} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteQuoteItem(quote.id, item.id); }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td colSpan={6} className="py-2 px-3 text-right">明细合计：</td>
                  <td className="py-2 px-3">{formatMoney(itemsTotal, quote.currency)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* 相关订单 */}
      {relatedOrders.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">相关订单</h3>
          <div className="space-y-2">
            {relatedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <Link href={`/orders/${order.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {order.orderNo}
                </Link>
                <StatusBadge label={order.orderStatus} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 相关文档 */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">相关文档 ({relatedDocuments.length})</h3>
          <Link href={`/documents/new?relatedType=QUOTE&relatedId=${quote.id}`} className="text-sm text-blue-600 hover:underline">
            + 新增文档
          </Link>
        </div>
        {relatedDocuments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">暂无相关文档</p>
        ) : (
          <div className="space-y-2">
            {relatedDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <Link href={`/documents/${doc.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {doc.title}
                </Link>
                <span className="text-xs text-gray-500">{formatDate(doc.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
