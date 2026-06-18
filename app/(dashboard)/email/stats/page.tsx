import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import { Send, Inbox, CheckCircle, XCircle, Users, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmailStatsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalSent, totalReceived, allEmails, topRecipients, statusCounts] = await Promise.all([
    // Total emails sent this month
    prisma.email.count({
      where: {
        direction: "OUTGOING",
        createdAt: { gte: startOfMonth },
      },
    }),
    // Total emails received this month
    prisma.email.count({
      where: {
        direction: "INCOMING",
        createdAt: { gte: startOfMonth },
      },
    }),
    // All emails in last 30 days for daily breakdown
    prisma.email.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        direction: true,
        status: true,
        toAddr: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    // Top recipients
    prisma.email.groupBy({
      by: ["toAddr"],
      where: {
        direction: "OUTGOING",
        toAddr: { not: "" },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { toAddr: true },
      orderBy: { _count: { toAddr: "desc" } },
      take: 10,
    }),
    // Status breakdown for outgoing emails this month
    prisma.email.groupBy({
      by: ["status"],
      where: {
        direction: "OUTGOING",
        createdAt: { gte: startOfMonth },
      },
      _count: { status: true },
    }),
  ]);

  // Build daily counts for last 30 days
  const dailyMap: Record<string, { sent: number; received: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = { sent: 0, received: 0 };
  }
  for (const email of allEmails) {
    const key = new Date(email.createdAt).toISOString().split("T")[0];
    if (dailyMap[key]) {
      if (email.direction === "OUTGOING") dailyMap[key].sent++;
      else dailyMap[key].received++;
    }
  }

  // Status counts
  const statusMap: Record<string, number> = {};
  for (const s of statusCounts) {
    statusMap[s.status || "UNKNOWN"] = s._count.status;
  }

  const deliveredCount = (statusMap["SENT"] || 0) + (statusMap["DELIVERED"] || 0);
  const totalOutgoing = statusCounts.reduce((acc, s) => acc + s._count.status, 0);
  const deliveredRate = totalOutgoing > 0 ? ((deliveredCount / totalOutgoing) * 100).toFixed(1) : "0";
  const failedCount = statusMap["FAILED"] || 0;

  return (
    <div>
      <PageHeader
        title="邮件统计"
        description="查看邮件发送数据，掌握沟通动态"
        backHref="/email"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Send size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">本月发送</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{totalSent}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50">
              <Inbox size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">本月接收</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{totalReceived}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">投递率</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{deliveredRate}%</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">失败数</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{failedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Daily Email Counts */}
        <div className="col-span-2">
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">近 30 天邮件趋势</h3>
              <p className="text-xs text-gray-500 mt-0.5">每日发送 / 接收数量</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-medium text-gray-600">日期</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-600">发送</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-600">接收</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-600">合计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(dailyMap).reverse().map(([date, counts]) => (
                    <tr key={date} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-4 text-gray-700 font-mono">{date}</td>
                      <td className="py-2 px-4 text-right text-blue-600 tabular-nums">{counts.sent}</td>
                      <td className="py-2 px-4 text-right text-green-600 tabular-nums">{counts.received}</td>
                      <td className="py-2 px-4 text-right text-gray-900 font-medium tabular-nums">{counts.sent + counts.received}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Top Recipients */}
        <div>
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">Top 收件人</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">近 30 天</p>
            </div>
            <div className="divide-y divide-gray-100">
              {topRecipients.length === 0 ? (
                <div className="py-8 text-center">
                  <Mail size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-400 text-xs">暂无数据</p>
                </div>
              ) : (
                topRecipients.map((r, idx) => (
                  <div key={r.toAddr ?? idx} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                      <span className="text-sm text-gray-700 truncate">{r.toAddr}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums ml-2">{(r._count as Record<string, number>).toAddr}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Status Breakdown */}
      {Object.keys(statusMap).length > 0 && (
        <Card>
          <CardHeader title="邮件状态分布" description="本月发送邮件状态统计" />
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(statusMap).map(([status, count]) => (
              <div key={status} className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-900 tabular-nums">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{status}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
