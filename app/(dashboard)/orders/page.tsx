import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus } from "lucide-react";
import { deleteOrder } from "./actions";
import { OrderStatusLabel } from "@/lib/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { getOrderStatusVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const status = typeof params.status === "string" ? params.status : "";
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: "insensitive" } },
      { orderTitle: { contains: search, mode: "insensitive" } },
      { customer: { company: { contains: search, mode: "insensitive" } } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.orderStatus = status;
  if (customerId) where.customerId = parseInt(customerId);

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: true, project: true, quote: true },
    }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
  ]);

  const hasFilters = search || status || customerId;

  return (
    <div>
      <PageHeader
        title="订单管理"
        description="管理报价确认后的订单"
        actions={
          <Link href="/orders/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增订单
          </Link>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索订单号、客户、产品..."
        filters={[
          { name: "status", label: "状态", options: Object.entries(OrderStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerId", label: "客户", options: customers.map((c) => ({ value: String(c.id), label: c.company })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ status, customerId }}
      />

      <Card padding="none">
        {orders.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的订单" : "暂无订单"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增订单开始记录"}
            actionLabel={hasFilters ? undefined : "新增订单"}
            actionHref={hasFilters ? undefined : "/orders/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">订单号</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">客户</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">项目</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">金额</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/orders/${order.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {order.orderNo}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/customers/${order.customerId}`} className="text-gray-600 hover:text-blue-600">
                        {order.customer.company}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{order.project?.name || "-"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge label={OrderStatusLabel[order.orderStatus] || order.orderStatus} variant={getOrderStatusVariant(order.orderStatus)} />
                    </td>
                    <td className="py-3 px-4 font-medium">{order.totalAmount ? formatMoney(Number(order.totalAmount), order.currency) : "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/orders/${order.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/orders/${order.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteOrder(order.id); }} />
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
