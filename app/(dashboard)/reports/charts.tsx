"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function ChartCard({ title, insight, children }: { title: string; insight: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      <div className="h-[300px] mt-4">{children}</div>
      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">{insight}</p>
    </div>
  );
}

// ==================== 1. Sales Funnel ====================

interface SalesFunnelProps {
  data: { name: string; value: number }[];
  insight: string;
}

export function SalesFunnelChart({ data, insight }: SalesFunnelProps) {
  const isEmpty = data.every((d) => d.value === 0);
  return (
    <ChartCard title="销售漏斗" insight={insight}>
      {isEmpty ? (
        <p className="text-sm text-gray-400 flex items-center justify-center h-full">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={50} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="数量" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ==================== 2. Order Trends ====================

interface OrderTrendsProps {
  data: { month: string; count: number; amount: number }[];
  insight: string;
}

export function OrderTrendsChart({ data, insight }: OrderTrendsProps) {
  const isEmpty = data.every((d) => d.count === 0);
  return (
    <ChartCard title="订单趋势 (近12个月)" insight={insight}>
      {isEmpty ? (
        <p className="text-sm text-gray-400 flex items-center justify-center h-full">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="订单数" dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} name="金额 ($)" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ==================== 3. Customer Distribution ====================

interface CustomerDistProps {
  data: { name: string; value: number }[];
  insight: string;
}

export function CustomerDistChart({ data, insight }: CustomerDistProps) {
  const isEmpty = data.length === 0;
  return (
    <ChartCard title="客户国家/地区分布" insight={insight}>
      {isEmpty ? (
        <p className="text-sm text-gray-400 flex items-center justify-center h-full">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              dataKey="value"
            >
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ==================== 4. Lead Source Analysis ====================

interface LeadSourceProps {
  data: { name: string; value: number }[];
  insight: string;
}

export function LeadSourceChart({ data, insight }: LeadSourceProps) {
  const isEmpty = data.length === 0;
  return (
    <ChartCard title="线索来源分析" insight={insight}>
      {isEmpty ? (
        <p className="text-sm text-gray-400 flex items-center justify-center h-full">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" name="线索数" radius={[4, 4, 0, 0]}>
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ==================== 5. Business Line Comparison ====================

interface BusinessLineProps {
  data: { name: string; leads: number; customers: number; projects: number; wonProjects: number }[];
  insight: string;
}

export function BusinessLineChart({ data, insight }: BusinessLineProps) {
  const isEmpty = data.length === 0;
  return (
    <ChartCard title="业务线对比" insight={insight}>
      {isEmpty ? (
        <p className="text-sm text-gray-400 flex items-center justify-center h-full">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="leads" fill="#3b82f6" name="线索" radius={[4, 4, 0, 0]} />
            <Bar dataKey="customers" fill="#10b981" name="客户" radius={[4, 4, 0, 0]} />
            <Bar dataKey="projects" fill="#f59e0b" name="项目" radius={[4, 4, 0, 0]} />
            <Bar dataKey="wonProjects" fill="#8b5cf6" name="成交" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ==================== 6. Follow-up Stats ====================

interface FollowUpStatsProps {
  thisMonthCount: number;
  noFollowUpCount: number;
  totalCustomers: number;
  insight: string;
}

export function FollowUpStatsChart({ thisMonthCount, noFollowUpCount, totalCustomers, insight }: FollowUpStatsProps) {
  const followUpRate = totalCustomers > 0 ? (((totalCustomers - noFollowUpCount) / totalCustomers) * 100).toFixed(1) : "0";
  const chartData = [
    { name: "本月跟进", value: thisMonthCount },
    { name: "已跟进客户", value: totalCustomers - noFollowUpCount },
    { name: "未跟进客户", value: noFollowUpCount },
  ];
  const isEmpty = thisMonthCount === 0 && totalCustomers === 0;

  return (
    <ChartCard title="跟进统计" insight={insight}>
      {isEmpty ? (
        <p className="text-sm text-gray-400 flex items-center justify-center h-full">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" name="数量" radius={[4, 4, 0, 0]}>
              <Cell fill="#3b82f6" />
              <Cell fill="#10b981" />
              <Cell fill="#ef4444" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
