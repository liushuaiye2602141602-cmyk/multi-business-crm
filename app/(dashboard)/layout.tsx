import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import RightPanel from "@/components/RightPanel";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch data for right panel
  const prisma = (await import("@/lib/prisma")).default;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [goals, taskStats, projectStatuses, emailStats] = await Promise.all([
    prisma.salesGoal.findMany({ where: { year, month } }),
    prisma.task.aggregate({
      _count: { id: true },
      where: { status: { in: ["COMPLETED"] } },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.email.aggregate({
      _count: { id: true },
      where: { createdAt: { gte: new Date(year, month - 1, 1) } },
    }),
  ]);

  const goalData = [
    { metric: "新增线索", target: Number(goals.find(g => g.metricType === "leads_count")?.targetValue || 0), current: Number(goals.find(g => g.metricType === "leads_count")?.currentValue || 0) },
    { metric: "新增客户", target: Number(goals.find(g => g.metricType === "customers_count")?.targetValue || 0), current: Number(goals.find(g => g.metricType === "customers_count")?.currentValue || 0) },
    { metric: "订单金额", target: Number(goals.find(g => g.metricType === "orders_amount")?.targetValue || 0), current: Number(goals.find(g => g.metricType === "orders_amount")?.currentValue || 0), currency: "¥" },
    { metric: "报价数量", target: Number(goals.find(g => g.metricType === "quotes_count")?.targetValue || 0), current: Number(goals.find(g => g.metricType === "quotes_count")?.currentValue || 0) },
  ];

  const opportunityData = projectStatuses.map(ps => ({
    name: ps.status,
    value: ps._count.id,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-[260px]">
        <Header />
        <div className="flex">
          <main className="flex-1 p-6 fade-in">{children}</main>
          <RightPanel
            goals={goalData}
            taskStats={{
              completed: taskStats._count.id,
              overdue: 0,
              pending: 0,
            }}
            opportunityData={opportunityData}
            emailStats={{
              sent: emailStats._count.id,
              received: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}
