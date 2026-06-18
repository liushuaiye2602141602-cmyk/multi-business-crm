import prisma from "@/lib/prisma";
import { LeadSourceLabel } from "@/lib/enums";
import {
  SalesFunnelChart,
  OrderTrendsChart,
  CustomerDistChart,
  LeadSourceChart,
  BusinessLineChart,
  FollowUpStatsChart,
} from "./charts";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 12 months ago
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalLeads,
    totalCustomers,
    totalProjects,
    wonProjects,
    orders,
    customerCountries,
    leadsBySource,
    businessLines,
    followUpsThisMonth,
    customersWithNoRecentFollowUp,
  ] = await Promise.all([
    // 1. Sales Funnel
    prisma.lead.count(),
    prisma.customer.count(),
    prisma.project.count(),
    prisma.project.count({ where: { status: "WON" } }),

    // 2. Order Trends (last 12 months)
    prisma.order.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true, totalAmount: true },
    }),

    // 3. Customer Distribution by country
    prisma.customer.groupBy({
      by: ["country"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // 4. Lead Source Analysis
    prisma.lead.groupBy({
      by: ["source"],
      _count: { id: true },
    }),

    // 5. Business Line Comparison
    prisma.businessLine.findMany({
      select: { id: true, name: true },
    }),

    // 6a. Follow-ups this month
    prisma.followUp.count({
      where: { createdAt: { gte: monthStart } },
    }),

    // 6b. Customers with no follow-up in 30 days
    prisma.customer.findMany({
      where: {
        followUps: { none: { createdAt: { gte: thirtyDaysAgo } } },
      },
      select: { id: true },
    }),
  ]);

  // Process business line stats
  const businessLineStats = await Promise.all(
    businessLines.map(async (bl) => {
      const [leads, customers, projects, won] = await Promise.all([
        prisma.lead.count({ where: { businessLineId: bl.id } }),
        prisma.customer.count({ where: { businessLineId: bl.id } }),
        prisma.project.count({ where: { businessLineId: bl.id } }),
        prisma.project.count({ where: { businessLineId: bl.id, status: "WON" } }),
      ]);
      return { name: bl.name, leads, customers, projects, wonProjects: won };
    })
  );

  // Process order trends by month
  const monthMap = new Map<string, { count: number; amount: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { count: 0, amount: 0 });
  }
  for (const order of orders) {
    const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.amount += order.totalAmount ? Number(order.totalAmount) : 0;
    }
  }
  const orderTrends = Array.from(monthMap.entries()).map(([month, data]) => ({
    month: `${month.slice(5)}月`,
    count: data.count,
    amount: Math.round(data.amount * 100) / 100,
  }));

  // Process customer distribution
  const customerDist = customerCountries
    .filter((c) => c.country)
    .slice(0, 10)
    .map((c) => ({ name: c.country || "未知", value: c._count.id }));

  // Process lead source data
  const leadSourceData = leadsBySource.map((item) => ({
    name: LeadSourceLabel[item.source] || item.source,
    value: item._count.id,
  }));

  // Sales funnel data
  const salesFunnel = [
    { name: "线索", value: totalLeads },
    { name: "客户", value: totalCustomers },
    { name: "项目", value: totalProjects },
    { name: "成交", value: wonProjects },
  ];

  const leadConversionRate = totalLeads > 0 ? ((totalCustomers / totalLeads) * 100).toFixed(1) : "0";
  const projectWinRate = totalProjects > 0 ? ((wonProjects / totalProjects) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据报表</h1>
        <p className="text-sm text-gray-500 mt-1">
          全方位业务数据分析，洞察线索转化、订单趋势和客户分布
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Sales Funnel */}
        <SalesFunnelChart
          data={salesFunnel}
          insight={`线索转化率: ${leadConversionRate}% | 项目成交率: ${projectWinRate}%`}
        />

        {/* 2. Order Trends */}
        <OrderTrendsChart
          data={orderTrends}
          insight={`近 12 个月共 ${orders.length} 笔订单，总金额 $${orders.reduce((s, o) => s + (o.totalAmount ? Number(o.totalAmount) : 0), 0).toLocaleString()}`}
        />

        {/* 3. Customer Distribution */}
        <CustomerDistChart
          data={customerDist}
          insight={`共覆盖 ${customerDist.length} 个国家/地区${customerDist.length > 0 ? `，Top 1: ${customerDist[0].name} (${customerDist[0].value} 家)` : ""}`}
        />

        {/* 4. Lead Source */}
        <LeadSourceChart
          data={leadSourceData}
          insight={`共 ${leadSourceData.length} 个来源渠道${leadSourceData.length > 0 ? `，最大来源: ${leadSourceData.reduce((a, b) => (a.value > b.value ? a : b), leadSourceData[0]).name}` : ""}`}
        />

        {/* 5. Business Line Comparison */}
        <BusinessLineChart
          data={businessLineStats}
          insight={`共 ${businessLineStats.length} 条业务线`}
        />

        {/* 6. Follow-up Stats */}
        <FollowUpStatsChart
          thisMonthCount={followUpsThisMonth}
          noFollowUpCount={customersWithNoRecentFollowUp.length}
          totalCustomers={totalCustomers}
          insight={`本月跟进 ${followUpsThisMonth} 次 | ${customersWithNoRecentFollowUp.length} 位客户近 30 天未跟进`}
        />
      </div>
    </div>
  );
}
