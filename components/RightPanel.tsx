"use client";

import Link from "next/link";
import { ChevronRight, Target, TrendingUp, Mail, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface GoalData {
  metric: string;
  target: number;
  current: number;
  currency?: string;
}

interface RightPanelProps {
  goals: GoalData[];
  taskStats: { completed: number; overdue: number; pending: number };
  opportunityData: { name: string; value: number }[];
  emailStats: { sent: number; received: number };
}

const GOAL_COLORS = {
  leads: { icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
  customers: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  orders: { icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
  quotes: { icon: Mail, color: "text-orange-600", bg: "bg-orange-50" },
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function RightPanel({ goals, taskStats, opportunityData, emailStats }: RightPanelProps) {
  return (
    <div className="w-[320px] border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-4 hidden xl:block">
      {/* Goal Completion */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">目标完成情况</h3>
          <Link href="/goals" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            本月 <ChevronRight size={12} />
          </Link>
        </div>
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            return (
              <div key={g.metric}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{g.metric}</span>
                  <span className="text-xs font-medium text-gray-900">
                    {g.currency ? `${g.currency} ` : ""}{g.current.toLocaleString()}
                    {g.target > 0 ? ` / ${g.target.toLocaleString()}` : ""}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-yellow-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {g.target === 0 && (
                  <Link href="/goals" className="text-[10px] text-blue-500 hover:underline">未设定目标值 立即设置</Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Completion */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">任务完成情况</h3>
          <span className="text-xs text-gray-400">今天</span>
        </div>
        <div className="flex items-center justify-around py-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[10px] text-gray-500">已完成</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">{taskStats.overdue}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-[10px] text-gray-500">超时完成</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">{taskStats.pending}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              <span className="text-[10px] text-gray-500">未完成</span>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity Distribution */}
      {opportunityData.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">商机分布</h3>
            <Link href="/reports" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              <ChevronRight size={12} />
            </Link>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={opportunityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {opportunityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${Number(value)} 个`, String(name)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {opportunityData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] text-gray-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Stats */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">邮件</h3>
          <Link href="/email/stats" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            <ChevronRight size={12} />
          </Link>
        </div>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{emailStats.sent}</p>
            <p className="text-[10px] text-gray-500">已发送</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{emailStats.received}</p>
            <p className="text-[10px] text-gray-500">已接收</p>
          </div>
        </div>
      </div>
    </div>
  );
}
