import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, CheckCircle } from "lucide-react";
import { QuoteStatusLabel, ProjectStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney, formatEnumLabel } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id: parseInt(id) },
    include: {
      lead: true,
      customer: true,
      project: true,
    },
  });

  if (!quote) return notFound();

  return (
    <div>
      <PageHeader
        title={`报价 ${quote.quoteNo}`}
        backHref="/quotes"
        action={{ label: "编辑", href: `/quotes/${quote.id}/edit`, icon: <Pencil size={16} /> }}
      />

      {/* 报价状态提示 */}
      {quote.status === "ACCEPTED" && quote.project && quote.project.status !== "WON" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
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
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基础信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">报价编号：</span><span className="font-medium">{quote.quoteNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">状态：</span><Badge label={formatEnumLabel(quote.status, QuoteStatusLabel)} className={quote.status === "ACCEPTED" ? "bg-green-100 text-green-700" : quote.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"} /></div>
            <div className="flex justify-between"><span className="text-gray-500">客户：</span>{quote.customer ? <Link href={`/customers/${quote.customerId}`} className="text-blue-600 hover:underline">{quote.customer.company}</Link> : quote.lead ? <Link href={`/leads/${quote.leadId}`} className="text-blue-600 hover:underline">{quote.lead.company}</Link> : "-"}</div>
            {quote.project && <div className="flex justify-between"><span className="text-gray-500">项目：</span><Link href={`/projects/${quote.projectId}`} className="text-blue-600 hover:underline">{quote.project.name}</Link></div>}
            <div className="flex justify-between"><span className="text-gray-500">创建时间：</span>{formatDate(quote.createdAt)}</div>
            <div className="flex justify-between"><span className="text-gray-500">更新时间：</span>{formatDate(quote.updatedAt)}</div>
          </div>
        </div>

        {/* 产品信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">产品信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">产品名称：</span>{quote.productName || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">规格：</span>{quote.specs || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">数量：</span>{quote.quantity || "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">单价：</span>{quote.unitPrice ? formatMoney(quote.unitPrice ? Number(quote.unitPrice) : null, quote.currency) : "-"}</div>
            <div className="flex justify-between"><span className="text-gray-500">总价：</span><span className="font-bold text-lg">{formatMoney(quote.totalPrice ? Number(quote.totalPrice) : null, quote.currency)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">币种：</span>{quote.currency}</div>
          </div>
        </div>
      </div>

      {/* 商务条款 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">商务条款</h2>
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
      </div>
    </div>
  );
}
