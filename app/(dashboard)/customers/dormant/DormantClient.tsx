"use client";

import Link from "next/link";
import { Brain, Moon, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { LeadGradeLabel } from "@/lib/enums";
import { getLeadGradeVariant } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import Card from "@/components/ui/Card";

interface DormantCustomer {
  id: number;
  company: string;
  contactName: string;
  country: string | null;
  leadGrade: string;
  ownerName: string | null;
  lastFollowUp: string | null;
  daysSince: number;
}

function getDaysBadgeVariant(days: number): "default" | "warning" | "danger" | "purple" {
  if (days < 90) return "warning";
  if (days < 180) return "purple";
  return "danger";
}

function getSuggestedAction(days: number): string {
  if (days < 90) return "发送问候邮件";
  if (days < 180) return "电话跟进";
  return "发送激活优惠";
}

export default function DormantClient({ initialData }: { initialData: DormantCustomer[] }) {
  const customers = initialData;

  // Stats
  const total = customers.length;
  const range60_90 = customers.filter((c) => c.daysSince >= 60 && c.daysSince < 90).length;
  const range90_180 = customers.filter((c) => c.daysSince >= 90 && c.daysSince < 180).length;
  const range180 = customers.filter((c) => c.daysSince >= 180).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50">
              <Moon size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">沉睡客户总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{total}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-50">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">60-90 天</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{range60_90}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50">
              <AlertTriangle size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">90-180 天</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{range90_180}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">180+ 天</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{range180}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        {customers.length === 0 ? (
          <div className="py-16 text-center">
            <Moon size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">暂无沉睡客户</p>
            <p className="text-gray-400 text-xs mt-1">所有客户跟进记录正常</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">公司</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">联系人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">国家</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">等级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">负责人</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">最后跟进</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">沉睡天数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">建议操作</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">AI 建议</th>
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
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={LeadGradeLabel[customer.leadGrade] || customer.leadGrade}
                        variant={getLeadGradeVariant(customer.leadGrade)}
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer.ownerName || "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(customer.lastFollowUp)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={`${customer.daysSince} 天`}
                        variant={getDaysBadgeVariant(customer.daysSince)}
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{getSuggestedAction(customer.daysSince)}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors">
                        <Brain size={14} />
                        AI 激活建议
                      </button>
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
