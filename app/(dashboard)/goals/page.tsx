import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import GoalsClient from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Fetch current month goals
  const currentGoals = await prisma.salesGoal.findMany({
    where: { year: currentYear, month: currentMonth },
    orderBy: { metricType: "asc" },
  });

  // Calculate actual counts for current month
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const [leadsCount, customersCount, ordersAgg, quotesCount] = await Promise.all([
    prisma.lead.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.customer.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.quote.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  const actualCounts = {
    leads_count: leadsCount,
    customers_count: customersCount,
    orders_amount: Number(ordersAgg._sum.totalAmount ?? 0),
    quotes_count: quotesCount,
  };

  // Fetch historical goals (last 12 months)
  const historicalGoals = await prisma.salesGoal.findMany({
    where: {
      OR: [
        { year: currentYear, month: { lt: currentMonth } },
        { year: currentYear - 1, month: { gte: currentMonth } },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { metricType: "asc" }],
  });

  // Ensure all 4 metric types exist for current month
  const metricTypes = ["leads_count", "customers_count", "orders_amount", "quotes_count"];
  const goalsWithDefaults = metricTypes.map((mt) => {
    const existing = currentGoals.find((g) => g.metricType === mt);
    return {
      id: existing?.id ?? null,
      metricType: mt,
      targetValue: existing ? Number(existing.targetValue) : 0,
      currentValue: existing ? Number(existing.currentValue) : actualCounts[mt as keyof typeof actualCounts],
      actualValue: actualCounts[mt as keyof typeof actualCounts],
      currency: existing?.currency ?? "USD",
    };
  });

  const serializedHistorical = historicalGoals.map((g) => ({
    ...g,
    targetValue: Number(g.targetValue),
    currentValue: Number(g.currentValue),
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="目标追踪"
        description={`管理 ${currentYear}年${currentMonth}月 的业务目标进度`}
      />
      <GoalsClient
        goals={goalsWithDefaults}
        historicalGoals={serializedHistorical}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />
    </div>
  );
}
