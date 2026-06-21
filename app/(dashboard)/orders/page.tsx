import Link from "next/link";
import prisma from "@/lib/prisma";
import { Plus } from "lucide-react";
import { deleteOrder } from "./actions";
import { OrderStatusLabel } from "@/lib/enums";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SearchFilterBar from "@/components/SearchFilterBar";
import OrderListClient from "@/components/OrderListClient";
import { getDefaultColumnConfig } from "@/lib/order-list/field-registry";
import { toOrderListItemDto } from "@/lib/dto/order-dto";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";
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
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (customerId) where.customerId = parseInt(customerId);

  const [orders, customers, businessLines] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, company: true } },
        project: { select: { id: true, name: true } },
        quote: { select: { id: true, quoteNo: true } },
        contact: { select: { id: true, name: true } },
        businessLine: { select: { id: true, name: true } },
      },
    }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || status || businessLineId || customerId;

  const defaultColumnConfig = getDefaultColumnConfig();
  const orderDtos = orders.map(toOrderListItemDto);

  const handleDelete = async (id: number) => {
    "use server";
    await deleteOrder(id);
  };

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
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "status", label: "状态", options: Object.entries(OrderStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerId", label: "客户", options: customers.map((c) => ({ value: String(c.id), label: c.company })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, status, customerId }}
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
          <OrderListClient
            orders={orderDtos}
            initialColumnConfig={defaultColumnConfig}
            customFieldDefs={[]}
            onDelete={handleDelete}
          />
        )}
      </Card>
    </div>
  );
}
