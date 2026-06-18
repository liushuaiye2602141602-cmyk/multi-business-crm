import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Anchor } from "lucide-react";
import { CustomerStatusLabel, CustomerTypeLabel, LeadGradeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { getCustomerStatusVariant, getLeadGradeVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SearchFilterBar from "@/components/SearchFilterBar";
import { claimCustomer } from "../actions";
import ClaimButton from "./ClaimButton";

export const dynamic = "force-dynamic";

export default async function CustomerPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const country = typeof params.country === "string" ? params.country : "";
  const industry = typeof params.industry === "string" ? params.industry : "";
  const leadGrade = typeof params.leadGrade === "string" ? params.leadGrade : "";

  const where: Record<string, unknown> = { ownerId: null };
  if (search) {
    where.AND = [
      { ownerId: null },
      {
        OR: [
          { company: { contains: search, mode: "insensitive" } },
          { contactName: { contains: search, mode: "insensitive" } },
          { country: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
    delete where.ownerId;
  }
  if (country) where.country = country;
  if (industry) where.industry = industry;
  if (leadGrade) where.leadGrade = leadGrade;

  const [customers, countryOptions, industryOptions] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true },
    }),
    prisma.customer.groupBy({
      by: ["country"],
      where: { ownerId: null, country: { not: null } },
      _count: true,
      orderBy: { _count: { country: "desc" } },
    }),
    prisma.customer.groupBy({
      by: ["industry"],
      where: { ownerId: null, industry: { not: null } },
      _count: true,
      orderBy: { _count: { industry: "desc" } },
    }),
  ]);

  // Stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalInPool, addedThisWeek, autoReturnedCount] = await Promise.all([
    prisma.customer.count({ where: { ownerId: null } }),
    prisma.customer.count({ where: { ownerId: null, poolEnteredAt: { gte: weekAgo } } }),
    prisma.customer.count({ where: { ownerId: null, poolReason: "auto_inactive" } }),
  ]);

  const hasFilters = search || country || industry || leadGrade;

  async function handleClaim(customerId: number, ownerName: string) {
    "use server";
    await claimCustomer(customerId, ownerName);
  }

  return (
    <div>
      <PageHeader
        title="客户公海"
        description="未分配的客户资源池，认领后即可跟进"
        backHref="/customers"
        actions={
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            返回客户库
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Anchor size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">公海客户总数</p>
              <p className="text-2xl font-bold text-gray-900">{totalInPool}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg font-bold">+</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">本周新增</p>
              <p className="text-2xl font-bold text-gray-900">{addedThisWeek}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <span className="text-orange-600 text-lg font-bold">↩</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">自动退回</p>
              <p className="text-2xl font-bold text-gray-900">{autoReturnedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <SearchFilterBar
        searchPlaceholder="搜索公司、联系人、国家、邮箱..."
        filters={[
          { name: "country", label: "国家", options: countryOptions.map((c) => ({ value: c.country || "", label: `${c.country} (${c._count})` })) },
          { name: "industry", label: "行业", options: industryOptions.map((i) => ({ value: i.industry || "", label: `${i.industry} (${i._count})` })) },
          { name: "leadGrade", label: "等级", options: Object.entries(LeadGradeLabel).map(([value, label]) => ({ value, label })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ country, industry, leadGrade }}
      />

      <Card padding="none">
        {customers.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的公海客户" : "公海暂无客户"}
            description={hasFilters ? "请调整筛选条件" : "当客户被退回公海后，将显示在这里"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">公司</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">联系人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">国家</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">行业</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">等级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">退回原因</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">进入公海时间</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/customers/${customer.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {customer.company}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer.contactName}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.country || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.industry || "-"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge label={LeadGradeLabel[customer.leadGrade] || customer.leadGrade} variant={getLeadGradeVariant(customer.leadGrade)} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={CustomerStatusLabel[customer.customerStatus] || customer.customerStatus} variant={getCustomerStatusVariant(customer.customerStatus)} />
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {customer.poolReason === "manual" ? "手动退回" : customer.poolReason === "auto_inactive" ? "自动退回(无跟进)" : customer.poolReason === "auto_no_followup" ? "自动退回(未跟进)" : customer.poolReason || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(customer.poolEnteredAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/customers/${customer.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <ClaimButton customerId={customer.id} company={customer.company} onClaim={handleClaim} />
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
