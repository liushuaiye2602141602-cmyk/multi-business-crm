"use client";

import { useState } from "react";
import { Target, TrendingUp, Pencil, Save, X, BarChart3 } from "lucide-react";
import { upsertSalesGoal, updateGoalValue } from "./actions";

interface GoalData {
  id: number | null;
  metricType: string;
  targetValue: number;
  currentValue: number;
  actualValue: number;
  currency: string;
}

interface HistoricalGoal {
  id: number;
  year: number;
  month: number;
  metricType: string;
  targetValue: number;
  currentValue: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  leads_count: "新增线索",
  customers_count: "新增客户",
  orders_amount: "订单金额",
  quotes_count: "报价数量",
};

const METRIC_ICONS: Record<string, string> = {
  leads_count: "bg-blue-100 text-blue-600",
  customers_count: "bg-green-100 text-green-600",
  orders_amount: "bg-purple-100 text-purple-600",
  quotes_count: "bg-orange-100 text-orange-600",
};

const MONTH_NAMES = [
  "", "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-blue-500";
  if (pct >= 50) return "bg-yellow-500";
  if (pct >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export default function GoalsClient({
  goals,
  historicalGoals,
  currentYear,
  currentMonth,
}: {
  goals: GoalData[];
  historicalGoals: HistoricalGoal[];
  currentYear: number;
  currentMonth: number;
}) {
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(goal: GoalData) {
    setEditingGoal(goal.metricType);
    setEditTarget(goal.targetValue > 0 ? String(goal.targetValue) : "");
    setEditCurrent(String(goal.actualValue));
  }

  function cancelEdit() {
    setEditingGoal(null);
    setEditTarget("");
    setEditCurrent("");
  }

  async function saveGoal(goal: GoalData) {
    setIsSaving(true);
    try {
      await upsertSalesGoal({
        year: currentYear,
        month: currentMonth,
        metricType: goal.metricType,
        targetValue: parseFloat(editTarget) || 0,
        currentValue: parseFloat(editCurrent) || 0,
        currency: goal.currency,
      });
      setEditingGoal(null);
      // Force page refresh to get updated data
      window.location.reload();
    } catch (err) {
      console.error("Failed to save goal:", err);
    } finally {
      setIsSaving(false);
    }
  }

  // Group historical goals by year+month
  const groupedHistorical: Record<string, HistoricalGoal[]> = {};
  for (const g of historicalGoals) {
    const key = `${g.year}-${String(g.month).padStart(2, "0")}`;
    if (!groupedHistorical[key]) groupedHistorical[key] = [];
    groupedHistorical[key].push(g);
  }

  return (
    <div>
      {/* Current Month Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {goals.map((goal) => {
          const pct = goal.targetValue > 0
            ? Math.min(100, Math.round((goal.actualValue / goal.targetValue) * 100))
            : 0;
          const isEditing = editingGoal === goal.metricType;
          const iconClass = METRIC_ICONS[goal.metricType] || "bg-gray-100 text-gray-600";

          return (
            <div
              key={goal.metricType}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {METRIC_LABELS[goal.metricType]}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {currentYear}年{currentMonth}月
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(goal)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="编辑目标"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">目标值</label>
                      <input
                        type="number"
                        value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0"
                        min="0"
                        step={goal.metricType === "orders_amount" ? "100" : "1"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">当前值</label>
                      <input
                        type="number"
                        value={editCurrent}
                        onChange={(e) => setEditCurrent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0"
                        min="0"
                        step={goal.metricType === "orders_amount" ? "100" : "1"}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={14} className="inline mr-1" />
                      取消
                    </button>
                    <button
                      onClick={() => saveGoal(goal)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Save size={14} className="inline mr-1" />
                      {isSaving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        {goal.actualValue.toLocaleString()}
                      </span>
                      {goal.targetValue > 0 && (
                        <span className="text-sm text-gray-400 ml-1">
                          / {goal.targetValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${
                      pct >= 100 ? "text-green-600" : pct >= 50 ? "text-blue-600" : "text-orange-600"
                    }`}>
                      {goal.targetValue > 0 ? `${pct}%` : "未设置目标"}
                    </span>
                  </div>
                  {goal.targetValue > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(pct)}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  )}
                  {goal.metricType === "orders_amount" && goal.currency && (
                    <p className="text-xs text-gray-400 mt-2">币种: {goal.currency}</p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Historical Goals */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-gray-500" />
          历史目标记录
        </h3>
        {Object.keys(groupedHistorical).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">暂无历史目标记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedHistorical).map(([key, monthGoals]) => {
              const [y, m] = key.split("-");
              return (
                <div
                  key={key}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-medium text-gray-700 text-sm">
                      {y}年{MONTH_NAMES[parseInt(m)]}
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {monthGoals.map((g) => {
                      const pct = g.targetValue > 0
                        ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                        : 0;
                      return (
                        <div key={g.id} className="px-5 py-3 flex items-center gap-4">
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${METRIC_ICONS[g.metricType]}`}>
                            {METRIC_LABELS[g.metricType]?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                {METRIC_LABELS[g.metricType]}
                              </span>
                              <span className="text-xs text-gray-500">
                                {g.currentValue.toLocaleString()} / {g.targetValue.toLocaleString()}
                              </span>
                            </div>
                            {g.targetValue > 0 && (
                              <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${getProgressColor(pct)}`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-semibold min-w-[40px] text-right ${
                            pct >= 100 ? "text-green-600" : "text-gray-500"
                          }`}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
